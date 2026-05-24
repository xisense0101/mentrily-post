import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '@mentrily/data-platform';
import type { InboxRecord } from '@mentrily/service-core';
import crypto from 'node:crypto';
import type { InboxEventHandler } from './noop-inbox-handler.js';

const PLACEHOLDER_PATTERN = /{{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*}}/g;

function renderSimpleTemplate(
  template: string,
  variables: Record<string, string | number | boolean | null>,
): string {
  return template.replace(PLACEHOLDER_PATTERN, (whole, variableName: string) => {
    if (variableName in variables) {
      const val = variables[variableName];
      return val === null ? '' : String(val);
    }
    return whole;
  });
}

type PayloadSchema = Record<
  string,
  'string' | 'number' | 'boolean' | 'string?' | 'number?' | 'boolean?'
>;
type InferPayload<S extends PayloadSchema> = {
  [K in keyof S]: S[K] extends 'string'
    ? string
    : S[K] extends 'number'
      ? number
      : S[K] extends 'boolean'
        ? boolean
        : S[K] extends 'string?'
          ? string | undefined
          : S[K] extends 'number?'
            ? number | undefined
            : S[K] extends 'boolean?'
              ? boolean | undefined
              : never;
};

function validatePayload<S extends PayloadSchema>(payload: unknown, schema: S): InferPayload<S> {
  if (payload === null || typeof payload !== 'object') {
    throw new Error('Invalid payload: must be an object');
  }
  const typedPayload = payload as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const [key, type] of Object.entries(schema)) {
    const value = typedPayload[key];
    const isOptional = type.endsWith('?');
    const expectedType = isOptional ? type.slice(0, -1) : type;

    if (value === undefined || value === null) {
      if (!isOptional) {
        throw new Error(`Invalid payload: missing required field "${key}"`);
      }
      result[key] = undefined;
    } else {
      if (typeof value !== expectedType) {
        throw new Error(`Invalid payload: field "${key}" must be of type ${expectedType}`);
      }
      result[key] = value;
    }
  }

  return result as InferPayload<S>;
}

function sanitizeResultMessage(status: string, rawMessage?: string): string {
  if (!rawMessage) {
    return status === 'QUARANTINED' ? 'Suspicious content detected' : 'Scan failed';
  }
  const msg = rawMessage.toLowerCase();
  if (status === 'QUARANTINED') {
    if (
      msg.includes('virus') ||
      msg.includes('malware') ||
      msg.includes('signature') ||
      msg.includes('infected')
    ) {
      return 'Suspicious content detected';
    }
    return 'Unsafe file structure or content detected';
  }
  return 'Unable to verify file safety due to a system error';
}

@Injectable()
export class NotificationHelper {
  private readonly logger = new Logger(NotificationHelper.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async checkPreferenceAndCreateIntents(input: {
    workspaceId: string;
    tenantId: string;
    userId: string;
    category:
      | 'SYSTEM'
      | 'COURSE'
      | 'ASSESSMENT'
      | 'MEDIA'
      | 'BILLING'
      | 'SECURITY'
      | 'ANNOUNCEMENT';
    templateKey: string;
    fallbackSubject: string;
    fallbackBody: string;
    variables: Record<string, string | number | boolean | null>;
    externalEventId: string;
  }): Promise<void> {
    const {
      workspaceId,
      tenantId,
      userId,
      category,
      templateKey,
      fallbackSubject,
      fallbackBody,
      variables,
      externalEventId,
    } = input;

    // Fetch user principal details
    const user = await this.prisma.principal.findUnique({
      where: { id: userId },
    });
    if (!user) {
      this.logger.warn(`Recipient principal ${userId} not found, skipping notifications`);
      return;
    }

    // Fetch phone number from external identity metadata if available
    let phoneNumber: string | undefined = undefined;
    const externalIdentity = await this.prisma.externalIdentity.findFirst({
      where: { principalId: user.id },
    });
    if (
      externalIdentity &&
      externalIdentity.metadata &&
      typeof externalIdentity.metadata === 'object' &&
      !Array.isArray(externalIdentity.metadata)
    ) {
      const meta = externalIdentity.metadata as Record<string, unknown>;
      if (typeof meta['phoneNumber'] === 'string') {
        phoneNumber = meta['phoneNumber'];
      } else if (typeof meta['phone_number'] === 'string') {
        phoneNumber = meta['phone_number'];
      }
    }

    const recipient = {
      principalId: user.id,
      email: user.email || undefined,
      displayName: user.displayName ?? undefined,
      phoneNumber: phoneNumber || undefined,
    };

    const channels: Array<'IN_APP' | 'EMAIL' | 'SMS'> = ['IN_APP', 'EMAIL', 'SMS'];

    for (const channel of channels) {
      // Skip if required verified contact info is missing
      if (channel === 'EMAIL' && !recipient.email) {
        this.logger.debug(
          `Notification suppressed: user ${userId} has no verified email address for EMAIL channel`,
        );
        continue;
      }

      if (channel === 'SMS' && !recipient.phoneNumber) {
        this.logger.debug(
          `Notification suppressed: user ${userId} has no verified phone number for SMS channel`,
        );
        continue;
      }

      // Check preference
      const pref = await this.prisma.notificationPreference.findUnique({
        where: {
          workspaceId_userId_channel_category: {
            workspaceId,
            userId,
            channel,
            category,
          },
        },
      });

      let enabled = false;
      if (channel === 'IN_APP') {
        enabled = pref ? pref.enabled : true; // IN_APP is enabled by default
      } else if (channel === 'EMAIL') {
        const featureFlag = process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true';
        enabled = featureFlag && (pref ? pref.enabled : false); // Disabled by default, requires opt-in & flag
      } else if (channel === 'SMS') {
        const featureFlag = process.env.ENABLE_SMS_NOTIFICATIONS === 'true';
        enabled = featureFlag && (pref ? pref.enabled : false); // Disabled by default, requires opt-in & flag
      }

      if (!enabled) {
        this.logger.debug(
          `Notification suppressed: preference or flag disabled for user ${userId}, channel ${channel}, category ${category}`,
        );
        continue;
      }

      // Compute deterministic idempotency key: sha256(eventId:userId:channel:templateKey)
      // This prevents duplicate intents under concurrent event processing.
      const rawKey = `${externalEventId}:${userId}:${channel}:${templateKey}`;
      const idempotencyKey = crypto.createHash('sha256').update(rawKey).digest('hex');

      // Upsert: if a row with this idempotency key already exists, skip creation.
      const existing = await this.prisma.notificationIntent.findFirst({
        where: { idempotencyKey },
        select: { id: true },
      });
      if (existing) {
        this.logger.debug(
          `Notification intent already exists for idempotency key (event ${externalEventId}, user ${userId}, channel ${channel})`,
        );
        continue;
      }

      // Resolve template from DB
      let template = await this.prisma.notificationTemplate.findFirst({
        where: {
          workspaceId,
          key: `${templateKey}:${channel}`,
        },
      });

      if (!template) {
        template = await this.prisma.notificationTemplate.findFirst({
          where: {
            workspaceId,
            key: templateKey,
          },
        });
      }

      let subject = fallbackSubject;
      let body = fallbackBody;
      let templateId: string | null = null;

      if (template && template.status === 'ACTIVE') {
        templateId = template.id;
        try {
          body = renderSimpleTemplate(template.bodyTemplate, variables);
          if (template.subjectTemplate) {
            subject = renderSimpleTemplate(template.subjectTemplate, variables);
          }
        } catch (err) {
          this.logger.error(
            `Failed to render template ${template.id}, falling back to defaults`,
            err,
          );
          body = renderSimpleTemplate(fallbackBody, variables);
          subject = renderSimpleTemplate(fallbackSubject, variables);
        }
      } else {
        body = renderSimpleTemplate(fallbackBody, variables);
        subject = renderSimpleTemplate(fallbackSubject, variables);
      }

      const intentId = crypto.randomUUID();
      const isTest = process.env.NODE_ENV === 'test';
      const provider = isTest ? 'FIXTURE' : 'NOOP';

      // Use createOrSkip via a try/catch on unique violation for the idempotency key.
      // The findFirst above handles the common path; this is the race-condition safety net.
      try {
        await this.prisma.notificationIntent.create({
          data: {
            id: intentId,
            tenantId,
            workspaceId,
            templateId,
            channel,
            recipient,
            subject,
            body,
            priority: 'NORMAL',
            status: 'QUEUED',
            provider,
            idempotencyKey,
            createdByPrincipalId: user.id,
            metadata: {
              eventId: externalEventId,
            },
          },
        });
      } catch (err: unknown) {
        // P2002 = unique constraint violation — another concurrent worker already created this intent
        if (
          err &&
          typeof err === 'object' &&
          'code' in err &&
          (err as Record<string, unknown>)['code'] === 'P2002'
        ) {
          this.logger.debug(
            `Concurrent intent creation skipped for event ${externalEventId}, user ${userId}, channel ${channel}`,
          );
          continue;
        }
        throw err;
      }

      this.logger.log(
        `Created queued notification intent ${intentId} for user ${userId} via ${channel}`,
      );
    }
  }

  async getWorkspaceAdmins(workspaceId: string): Promise<string[]> {
    const admins = await this.prisma.workspaceMember.findMany({
      where: {
        workspaceId,
        status: 'ACTIVE',
        roles: {
          some: {
            role: {
              name: {
                in: ['ADMIN', 'Admin', 'admin', 'OWNER', 'Owner', 'owner'],
              },
            },
          },
        },
      },
      select: { principalId: true },
    });

    // Safe: if no admin role exists, return empty — do NOT fall back to all active members.
    return admins.map((a) => a.principalId);
  }
}

// 1. ASSESSMENT_PUBLISHED
@Injectable()
export class AssessmentPublishedInboxHandler implements InboxEventHandler {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(NotificationHelper) private readonly helper: NotificationHelper,
  ) {}

  async handle(record: InboxRecord): Promise<void> {
    const outbox = await this.prisma.outboxMessage.findUnique({
      where: { eventId: record.externalEventId },
    });
    if (!outbox || !outbox.workspaceId || !outbox.tenantId) return;

    const workspaceId = outbox.workspaceId;
    const tenantId = outbox.tenantId;

    const payload = validatePayload(outbox.payload, {
      assessmentId: 'string?',
    });

    const assessmentId = payload.assessmentId || record.externalEventId;
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
    });

    const title = assessment?.title ?? 'New Assessment';
    const purpose = assessment?.purpose ?? 'No purpose specified';

    // Notify assessment owner and workspace admins (creator/admin confirmation)
    const recipients = new Set<string>();
    if (assessment?.ownerPrincipalId) {
      recipients.add(assessment.ownerPrincipalId);
    }
    const admins = await this.helper.getWorkspaceAdmins(workspaceId);
    for (const adminId of admins) {
      recipients.add(adminId);
    }

    for (const recipientId of recipients) {
      await this.helper.checkPreferenceAndCreateIntents({
        workspaceId,
        tenantId,
        userId: recipientId,
        category: 'ASSESSMENT',
        templateKey: 'assessment.published',
        fallbackSubject: 'New Assessment Published: {{ title }}',
        fallbackBody:
          "An assessment titled '{{ title }}' has been published. Purpose: {{ purpose }}.",
        variables: { title, purpose },
        externalEventId: record.externalEventId,
      });
    }
  }
}

// 2. ASSESSMENT_SUBMITTED
@Injectable()
export class AssessmentAttemptSubmittedInboxHandler implements InboxEventHandler {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(NotificationHelper) private readonly helper: NotificationHelper,
  ) {}

  async handle(record: InboxRecord): Promise<void> {
    const outbox = await this.prisma.outboxMessage.findUnique({
      where: { eventId: record.externalEventId },
    });
    if (!outbox || !outbox.workspaceId || !outbox.tenantId) return;

    const workspaceId = outbox.workspaceId;
    const tenantId = outbox.tenantId;

    const payload = validatePayload(outbox.payload, {
      assessmentId: 'string',
      learnerPrincipalId: 'string',
    });

    const assessment = await this.prisma.assessment.findUnique({
      where: { id: payload.assessmentId },
    });
    const learner = await this.prisma.principal.findUnique({
      where: { id: payload.learnerPrincipalId },
    });

    const title = assessment?.title ?? 'Assessment';
    const learnerName = learner?.displayName ?? learner?.email ?? 'A learner';

    // Notify teacher/creator/admins
    const recipients = new Set<string>();
    if (assessment?.ownerPrincipalId) {
      recipients.add(assessment.ownerPrincipalId);
    }
    const admins = await this.helper.getWorkspaceAdmins(workspaceId);
    for (const adminId of admins) {
      recipients.add(adminId);
    }

    for (const recipientId of recipients) {
      await this.helper.checkPreferenceAndCreateIntents({
        workspaceId,
        tenantId,
        userId: recipientId,
        category: 'ASSESSMENT',
        templateKey: 'assessment.attempt.submitted',
        fallbackSubject: 'Assessment Attempt Submitted: {{ title }}',
        fallbackBody: '{{ learnerName }} has submitted an attempt for {{ title }}.',
        variables: { title, learnerName },
        externalEventId: record.externalEventId,
      });
    }
  }
}

// 3. ASSESSMENT_GRADED
@Injectable()
export class AssessmentGradingRunCompletedInboxHandler implements InboxEventHandler {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(NotificationHelper) private readonly helper: NotificationHelper,
  ) {}

  async handle(record: InboxRecord): Promise<void> {
    const outbox = await this.prisma.outboxMessage.findUnique({
      where: { eventId: record.externalEventId },
    });
    if (!outbox || !outbox.workspaceId || !outbox.tenantId) return;

    const workspaceId = outbox.workspaceId;
    const tenantId = outbox.tenantId;

    const payload = validatePayload(outbox.payload, {
      attemptId: 'string',
      assessmentId: 'string',
      totalScore: 'number',
      maxScore: 'number',
    });

    const attempt = await this.prisma.assessmentAttempt.findUnique({
      where: { id: payload.attemptId },
    });
    if (!attempt) return;

    const assessment = await this.prisma.assessment.findUnique({
      where: { id: payload.assessmentId },
    });

    const title = assessment?.title ?? 'Assessment';

    // Notify learner who submitted the attempt
    await this.helper.checkPreferenceAndCreateIntents({
      workspaceId,
      tenantId,
      userId: attempt.learnerPrincipalId,
      category: 'ASSESSMENT',
      templateKey: 'assessment.grading.run.completed',
      fallbackSubject: 'Assessment Graded: {{ title }}',
      fallbackBody:
        "Your attempt for '{{ title }}' has been graded. Score: {{ totalScore }}/{{ maxScore }}.",
      variables: { title, totalScore: payload.totalScore, maxScore: payload.maxScore },
      externalEventId: record.externalEventId,
    });
  }
}

// 4. ASSESSMENT_RESULT_RELEASED
@Injectable()
export class AssessmentResultReleasedInboxHandler implements InboxEventHandler {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(NotificationHelper) private readonly helper: NotificationHelper,
  ) {}

  async handle(record: InboxRecord): Promise<void> {
    const outbox = await this.prisma.outboxMessage.findUnique({
      where: { eventId: record.externalEventId },
    });
    if (!outbox || !outbox.workspaceId || !outbox.tenantId) return;

    const workspaceId = outbox.workspaceId;
    const tenantId = outbox.tenantId;

    const payload = validatePayload(outbox.payload, {
      assessmentId: 'string',
      learnerPrincipalId: 'string',
      score: 'number',
      maxScore: 'number',
    });

    const assessment = await this.prisma.assessment.findUnique({
      where: { id: payload.assessmentId },
    });

    const title = assessment?.title ?? 'Assessment';

    // Notify learner
    await this.helper.checkPreferenceAndCreateIntents({
      workspaceId,
      tenantId,
      userId: payload.learnerPrincipalId,
      category: 'ASSESSMENT',
      templateKey: 'assessment.result.released',
      fallbackSubject: 'Assessment Result Released: {{ title }}',
      fallbackBody:
        "The result for your attempt at '{{ title }}' has been released. Score: {{ score }}/{{ maxScore }}.",
      variables: { title, score: payload.score, maxScore: payload.maxScore },
      externalEventId: record.externalEventId,
    });
  }
}

// 5. COURSE_PUBLISHED
@Injectable()
export class LearningCoursePublishedInboxHandler implements InboxEventHandler {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(NotificationHelper) private readonly helper: NotificationHelper,
  ) {}

  async handle(record: InboxRecord): Promise<void> {
    const outbox = await this.prisma.outboxMessage.findUnique({
      where: { eventId: record.externalEventId },
    });
    if (!outbox || !outbox.workspaceId || !outbox.tenantId) return;

    const workspaceId = outbox.workspaceId;
    const tenantId = outbox.tenantId;

    const payload = validatePayload(outbox.payload, {
      courseId: 'string',
    });

    const course = await this.prisma.learningCourse.findUnique({
      where: { id: payload.courseId },
    });
    if (!course) return;

    const title = course.title;

    // Notify course creator and workspace admins
    const recipients = new Set<string>();
    if (course.creatorPrincipalId) {
      recipients.add(course.creatorPrincipalId);
    }
    const admins = await this.helper.getWorkspaceAdmins(workspaceId);
    for (const adminId of admins) {
      recipients.add(adminId);
    }

    for (const recipientId of recipients) {
      await this.helper.checkPreferenceAndCreateIntents({
        workspaceId,
        tenantId,
        userId: recipientId,
        category: 'COURSE',
        templateKey: 'learning.course.published',
        fallbackSubject: 'Course Published: {{ title }}',
        fallbackBody: "The course '{{ title }}' is now published.",
        variables: { title },
        externalEventId: record.externalEventId,
      });
    }
  }
}

// 6. LEARNER_ENROLLED
@Injectable()
export class LearningEnrollmentCreatedInboxHandler implements InboxEventHandler {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(NotificationHelper) private readonly helper: NotificationHelper,
  ) {}

  async handle(record: InboxRecord): Promise<void> {
    const outbox = await this.prisma.outboxMessage.findUnique({
      where: { eventId: record.externalEventId },
    });
    if (!outbox || !outbox.workspaceId || !outbox.tenantId) return;

    const workspaceId = outbox.workspaceId;
    const tenantId = outbox.tenantId;

    const payload = validatePayload(outbox.payload, {
      enrollmentId: 'string',
    });

    const enrollment = await this.prisma.learningEnrollment.findUnique({
      where: { id: payload.enrollmentId },
    });
    if (!enrollment) return;

    const course = await this.prisma.learningCourse.findUnique({
      where: { id: enrollment.courseId },
    });
    if (!course) return;

    const title = course.title;

    // 1. Notify Learner
    await this.helper.checkPreferenceAndCreateIntents({
      workspaceId,
      tenantId,
      userId: enrollment.learnerPrincipalId,
      category: 'COURSE',
      templateKey: 'learning.enrollment.created:learner',
      fallbackSubject: 'Enrolled in Course: {{ title }}',
      fallbackBody: "You have been enrolled in the course '{{ title }}'.",
      variables: { title },
      externalEventId: record.externalEventId,
    });

    // 2. Notify Course Creator/Admins
    const recipients = new Set<string>();
    if (course.creatorPrincipalId) {
      recipients.add(course.creatorPrincipalId);
    }
    const admins = await this.helper.getWorkspaceAdmins(workspaceId);
    for (const adminId of admins) {
      recipients.add(adminId);
    }

    for (const recipientId of recipients) {
      if (recipientId === enrollment.learnerPrincipalId) continue;
      await this.helper.checkPreferenceAndCreateIntents({
        workspaceId,
        tenantId,
        userId: recipientId,
        category: 'COURSE',
        templateKey: 'learning.enrollment.created:creator',
        fallbackSubject: 'New Enrollment: {{ title }}',
        fallbackBody: "A new learner has enrolled in your course '{{ title }}'.",
        variables: { title },
        externalEventId: record.externalEventId,
      });
    }
  }
}

// 7. LESSON_COMPLETED
@Injectable()
export class LearningProgressCompletedInboxHandler implements InboxEventHandler {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(NotificationHelper) private readonly helper: NotificationHelper,
  ) {}

  async handle(record: InboxRecord): Promise<void> {
    const outbox = await this.prisma.outboxMessage.findUnique({
      where: { eventId: record.externalEventId },
    });
    if (!outbox || !outbox.workspaceId || !outbox.tenantId) return;

    const workspaceId = outbox.workspaceId;
    const tenantId = outbox.tenantId;

    const payload = validatePayload(outbox.payload, {
      progressId: 'string',
    });

    const progress = await this.prisma.learningProgress.findUnique({
      where: { id: payload.progressId },
    });
    if (!progress) return;

    const enrollment = await this.prisma.learningEnrollment.findUnique({
      where: { id: progress.enrollmentId },
    });
    if (!enrollment) return;

    const course = await this.prisma.learningCourse.findUnique({
      where: { id: enrollment.courseId },
    });
    if (!course) return;

    const lesson = await this.prisma.learningLesson.findUnique({
      where: { id: progress.lessonId },
    });
    const lessonTitle = lesson?.title ?? 'Lesson';

    const title = course.title;

    // 1. Notify Learner
    await this.helper.checkPreferenceAndCreateIntents({
      workspaceId,
      tenantId,
      userId: enrollment.learnerPrincipalId,
      category: 'COURSE',
      templateKey: 'learning.progress.completed:learner',
      fallbackSubject: 'Lesson Completed: {{ lessonTitle }}',
      fallbackBody: "You completed the lesson '{{ lessonTitle }}' in course '{{ title }}'.",
      variables: { title, lessonTitle },
      externalEventId: record.externalEventId,
    });

    // 2. Notify Course Creator/Admins
    const recipients = new Set<string>();
    if (course.creatorPrincipalId) {
      recipients.add(course.creatorPrincipalId);
    }
    const admins = await this.helper.getWorkspaceAdmins(workspaceId);
    for (const adminId of admins) {
      recipients.add(adminId);
    }

    for (const recipientId of recipients) {
      if (recipientId === enrollment.learnerPrincipalId) continue;
      await this.helper.checkPreferenceAndCreateIntents({
        workspaceId,
        tenantId,
        userId: recipientId,
        category: 'COURSE',
        templateKey: 'learning.progress.completed:creator',
        fallbackSubject: 'Lesson Completed by Learner: {{ lessonTitle }}',
        fallbackBody: "A learner completed the lesson '{{ lessonTitle }}' in course '{{ title }}'.",
        variables: { title, lessonTitle },
        externalEventId: record.externalEventId,
      });
    }
  }
}

// 8. COURSE_COMPLETED
@Injectable()
export class LearningEnrollmentCompletedInboxHandler implements InboxEventHandler {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(NotificationHelper) private readonly helper: NotificationHelper,
  ) {}

  async handle(record: InboxRecord): Promise<void> {
    const outbox = await this.prisma.outboxMessage.findUnique({
      where: { eventId: record.externalEventId },
    });
    if (!outbox || !outbox.workspaceId || !outbox.tenantId) return;

    const workspaceId = outbox.workspaceId;
    const tenantId = outbox.tenantId;

    const payload = validatePayload(outbox.payload, {
      enrollmentId: 'string',
    });

    const enrollment = await this.prisma.learningEnrollment.findUnique({
      where: { id: payload.enrollmentId },
    });
    if (!enrollment) return;

    const course = await this.prisma.learningCourse.findUnique({
      where: { id: enrollment.courseId },
    });
    if (!course) return;

    const title = course.title;

    // 1. Notify Learner
    await this.helper.checkPreferenceAndCreateIntents({
      workspaceId,
      tenantId,
      userId: enrollment.learnerPrincipalId,
      category: 'COURSE',
      templateKey: 'learning.enrollment.completed:learner',
      fallbackSubject: 'Course Completed: {{ title }}',
      fallbackBody: "Congratulations! You have completed the course '{{ title }}'.",
      variables: { title },
      externalEventId: record.externalEventId,
    });

    // 2. Notify Course Creator/Admins
    const recipients = new Set<string>();
    if (course.creatorPrincipalId) {
      recipients.add(course.creatorPrincipalId);
    }
    const admins = await this.helper.getWorkspaceAdmins(workspaceId);
    for (const adminId of admins) {
      recipients.add(adminId);
    }

    for (const recipientId of recipients) {
      if (recipientId === enrollment.learnerPrincipalId) continue;
      await this.helper.checkPreferenceAndCreateIntents({
        workspaceId,
        tenantId,
        userId: recipientId,
        category: 'COURSE',
        templateKey: 'learning.enrollment.completed:creator',
        fallbackSubject: 'Course Completed by Learner: {{ title }}',
        fallbackBody: "A learner has completed the course '{{ title }}'.",
        variables: { title },
        externalEventId: record.externalEventId,
      });
    }
  }
}

// 9. CONTENT_DOCUMENT_PUBLISHED
@Injectable()
export class ContentDocumentPublishedInboxHandler implements InboxEventHandler {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(NotificationHelper) private readonly helper: NotificationHelper,
  ) {}

  async handle(record: InboxRecord): Promise<void> {
    const outbox = await this.prisma.outboxMessage.findUnique({
      where: { eventId: record.externalEventId },
    });
    if (!outbox || !outbox.workspaceId || !outbox.tenantId) return;

    const workspaceId = outbox.workspaceId;
    const tenantId = outbox.tenantId;

    const payload = validatePayload(outbox.payload, {
      documentId: 'string',
    });

    const document = await this.prisma.contentDocument.findUnique({
      where: { id: payload.documentId },
    });
    if (!document) return;

    const title = document.title;

    // Notify creator/owner and admins
    const recipients = new Set<string>();
    if (document.ownerPrincipalId) {
      recipients.add(document.ownerPrincipalId);
    }
    const admins = await this.helper.getWorkspaceAdmins(workspaceId);
    for (const adminId of admins) {
      recipients.add(adminId);
    }

    for (const recipientId of recipients) {
      await this.helper.checkPreferenceAndCreateIntents({
        workspaceId,
        tenantId,
        userId: recipientId,
        category: 'ANNOUNCEMENT',
        templateKey: 'content.document.published',
        fallbackSubject: 'Document Published: {{ title }}',
        fallbackBody: "The document '{{ title }}' has been published.",
        variables: { title },
        externalEventId: record.externalEventId,
      });
    }
  }
}

// 10. CONTENT_DOCUMENT_UPDATED
@Injectable()
export class ContentDocumentDraftBlocksReplacedInboxHandler implements InboxEventHandler {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(NotificationHelper) private readonly helper: NotificationHelper,
  ) {}

  async handle(record: InboxRecord): Promise<void> {
    const outbox = await this.prisma.outboxMessage.findUnique({
      where: { eventId: record.externalEventId },
    });
    if (!outbox || !outbox.workspaceId || !outbox.tenantId) return;

    const workspaceId = outbox.workspaceId;
    const tenantId = outbox.tenantId;

    const payload = validatePayload(outbox.payload, {
      documentId: 'string',
    });

    const document = await this.prisma.contentDocument.findUnique({
      where: { id: payload.documentId },
    });
    if (!document) return;

    const title = document.title;

    // Notify collaborators/creator and admins
    const recipients = new Set<string>();
    if (document.ownerPrincipalId) {
      recipients.add(document.ownerPrincipalId);
    }
    const admins = await this.helper.getWorkspaceAdmins(workspaceId);
    for (const adminId of admins) {
      recipients.add(adminId);
    }

    for (const recipientId of recipients) {
      await this.helper.checkPreferenceAndCreateIntents({
        workspaceId,
        tenantId,
        userId: recipientId,
        category: 'ANNOUNCEMENT',
        templateKey: 'content.document.draft_blocks_replaced',
        fallbackSubject: 'Document Updated: {{ title }}',
        fallbackBody: "The document '{{ title }}' has been updated with new content.",
        variables: { title },
        externalEventId: record.externalEventId,
      });
    }
  }
}

// 11. CONTENT_DOCUMENT_REVIEW_READY
@Injectable()
export class ContentDocumentReviewReadyInboxHandler implements InboxEventHandler {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(NotificationHelper) private readonly helper: NotificationHelper,
  ) {}

  async handle(record: InboxRecord): Promise<void> {
    const outbox = await this.prisma.outboxMessage.findUnique({
      where: { eventId: record.externalEventId },
    });
    if (!outbox || !outbox.workspaceId || !outbox.tenantId) return;

    const workspaceId = outbox.workspaceId;
    const tenantId = outbox.tenantId;

    const payload = validatePayload(outbox.payload, {
      documentId: 'string',
    });

    const document = await this.prisma.contentDocument.findUnique({
      where: { id: payload.documentId },
    });
    if (!document) return;

    const title = document.title;

    // Notify reviewers/admins
    const recipients = new Set<string>();
    if (document.ownerPrincipalId) {
      recipients.add(document.ownerPrincipalId);
    }
    const admins = await this.helper.getWorkspaceAdmins(workspaceId);
    for (const adminId of admins) {
      recipients.add(adminId);
    }

    for (const recipientId of recipients) {
      await this.helper.checkPreferenceAndCreateIntents({
        workspaceId,
        tenantId,
        userId: recipientId,
        category: 'SYSTEM',
        templateKey: 'content.document.review_ready',
        fallbackSubject: 'Document Ready for Review: {{ title }}',
        fallbackBody: "The document '{{ title }}' is ready for review.",
        variables: { title },
        externalEventId: record.externalEventId,
      });
    }
  }
}

// 12. MEDIA_PROCESSING_SUCCEEDED
@Injectable()
export class MediaProcessingSucceededInboxHandler implements InboxEventHandler {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(NotificationHelper) private readonly helper: NotificationHelper,
  ) {}

  async handle(record: InboxRecord): Promise<void> {
    const outbox = await this.prisma.outboxMessage.findUnique({
      where: { eventId: record.externalEventId },
    });
    if (!outbox || !outbox.workspaceId || !outbox.tenantId) return;

    const workspaceId = outbox.workspaceId;
    const tenantId = outbox.tenantId;

    const payload = validatePayload(outbox.payload, {
      assetId: 'string',
      ownerPrincipalId: 'string',
    });

    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id: payload.assetId },
    });
    if (!asset) return;

    const filename = asset.filename;

    await this.helper.checkPreferenceAndCreateIntents({
      workspaceId,
      tenantId,
      userId: payload.ownerPrincipalId,
      category: 'MEDIA',
      templateKey: 'media.processing.succeeded',
      fallbackSubject: 'Media Processing Succeeded: {{ filename }}',
      fallbackBody:
        "Your media file '{{ filename }}' has been processed successfully and is ready.",
      variables: { filename },
      externalEventId: record.externalEventId,
    });
  }
}

// 13. MEDIA_PROCESSING_FAILED
@Injectable()
export class MediaProcessingFailedInboxHandler implements InboxEventHandler {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(NotificationHelper) private readonly helper: NotificationHelper,
  ) {}

  async handle(record: InboxRecord): Promise<void> {
    const outbox = await this.prisma.outboxMessage.findUnique({
      where: { eventId: record.externalEventId },
    });
    if (!outbox || !outbox.workspaceId || !outbox.tenantId) return;

    const workspaceId = outbox.workspaceId;
    const tenantId = outbox.tenantId;

    const payload = validatePayload(outbox.payload, {
      assetId: 'string',
      ownerPrincipalId: 'string',
      errorMessage: 'string?',
    });
    type MediaProcessingFailedPayload = {
      assetId: string;
      ownerPrincipalId: string;
      errorMessage?: string;
    };
    const typedPayload = payload as MediaProcessingFailedPayload;

    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id: typedPayload.assetId },
    });
    if (!asset) return;

    const filename = asset.filename;
    const errorMsg = typedPayload.errorMessage ?? 'Unknown processing error';

    await this.helper.checkPreferenceAndCreateIntents({
      workspaceId,
      tenantId,
      userId: typedPayload.ownerPrincipalId,
      category: 'MEDIA',
      templateKey: 'media.processing.failed',
      fallbackSubject: 'Media Processing Failed: {{ filename }}',
      fallbackBody:
        "Processing for your media file '{{ filename }}' failed. Error: {{ errorMessage }}.",
      variables: { filename, errorMessage: errorMsg },
      externalEventId: record.externalEventId,
    });
  }
}

// 14. MEDIA_SECURITY_SCAN_COMPLETED
@Injectable()
export class MediaSecurityScanCompletedInboxHandler implements InboxEventHandler {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(NotificationHelper) private readonly helper: NotificationHelper,
  ) {}

  async handle(record: InboxRecord): Promise<void> {
    const outbox = await this.prisma.outboxMessage.findUnique({
      where: { eventId: record.externalEventId },
    });
    if (!outbox || !outbox.workspaceId || !outbox.tenantId) return;

    const workspaceId = outbox.workspaceId;
    const tenantId = outbox.tenantId;

    const payload = validatePayload(outbox.payload, {
      assetId: 'string',
      scanStatus: 'string',
      resultMessage: 'string?',
    });
    type MediaSecurityScanPayload = {
      assetId: string;
      scanStatus: string;
      resultMessage?: string;
    };
    const typedScanPayload = payload as MediaSecurityScanPayload;

    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id: typedScanPayload.assetId },
    });
    if (!asset) return;

    const filename = asset.filename;
    const ownerPrincipalId = asset.ownerPrincipalId;

    const sanitizedMsg = sanitizeResultMessage(
      typedScanPayload.scanStatus,
      typedScanPayload.resultMessage || undefined,
    );

    if (typedScanPayload.scanStatus === 'QUARANTINED') {
      // Notify Owner
      await this.helper.checkPreferenceAndCreateIntents({
        workspaceId,
        tenantId,
        userId: ownerPrincipalId,
        category: 'SECURITY',
        templateKey: 'media.security_scan.quarantined:owner',
        fallbackSubject: 'Media Quarantined: {{ filename }}',
        fallbackBody:
          "Your media file '{{ filename }}' has been quarantined due to a security scan match: {{ resultMessage }}.",
        variables: { filename, resultMessage: sanitizedMsg },
        externalEventId: record.externalEventId,
      });

      // Notify Admins
      const admins = await this.helper.getWorkspaceAdmins(workspaceId);
      for (const adminId of admins) {
        if (adminId === ownerPrincipalId) continue;
        await this.helper.checkPreferenceAndCreateIntents({
          workspaceId,
          tenantId,
          userId: adminId,
          category: 'SECURITY',
          templateKey: 'media.security_scan.quarantined:admin',
          fallbackSubject: 'Security Alert: Media Quarantined in Workspace',
          fallbackBody:
            "A media file '{{ filename }}' uploaded by owner ID {{ ownerPrincipalId }} has been quarantined: {{ resultMessage }}.",
          variables: { filename, ownerPrincipalId, resultMessage: sanitizedMsg },
          externalEventId: record.externalEventId,
        });
      }
    } else if (typedScanPayload.scanStatus === 'SCAN_FAILED') {
      // Notify Owner
      await this.helper.checkPreferenceAndCreateIntents({
        workspaceId,
        tenantId,
        userId: ownerPrincipalId,
        category: 'SECURITY',
        templateKey: 'media.security_scan.failed:owner',
        fallbackSubject: 'Media Security Scan Failed: {{ filename }}',
        fallbackBody:
          "Security scanning failed for your media file '{{ filename }}'. Error: {{ resultMessage }}.",
        variables: { filename, resultMessage: sanitizedMsg },
        externalEventId: record.externalEventId,
      });

      // Notify Admins
      const admins = await this.helper.getWorkspaceAdmins(workspaceId);
      for (const adminId of admins) {
        if (adminId === ownerPrincipalId) continue;
        await this.helper.checkPreferenceAndCreateIntents({
          workspaceId,
          tenantId,
          userId: adminId,
          category: 'SECURITY',
          templateKey: 'media.security_scan.failed:admin',
          fallbackSubject: 'Security Warning: Media Scan Failed',
          fallbackBody:
            "Security scanning failed for media file '{{ filename }}' uploaded by owner ID {{ ownerPrincipalId }}. Error: {{ resultMessage }}.",
          variables: { filename, ownerPrincipalId, resultMessage: sanitizedMsg },
          externalEventId: record.externalEventId,
        });
      }
    }
  }
}

// 15. MEDIA_LIFECYCLE_DELETED
@Injectable()
export class MediaLifecycleDeletedInboxHandler implements InboxEventHandler {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(NotificationHelper) private readonly helper: NotificationHelper,
  ) {}

  async handle(record: InboxRecord): Promise<void> {
    const outbox = await this.prisma.outboxMessage.findUnique({
      where: { eventId: record.externalEventId },
    });
    if (!outbox || !outbox.workspaceId || !outbox.tenantId) return;

    const workspaceId = outbox.workspaceId;
    const tenantId = outbox.tenantId;

    const payload = validatePayload(outbox.payload, {
      assetId: 'string',
      ownerPrincipalId: 'string',
    });

    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id: payload.assetId },
    });

    const filename = asset?.filename ?? 'deleted asset';

    // Notify Owner
    await this.helper.checkPreferenceAndCreateIntents({
      workspaceId,
      tenantId,
      userId: payload.ownerPrincipalId,
      category: 'MEDIA',
      templateKey: 'media.lifecycle.deleted:owner',
      fallbackSubject: 'Media Asset Deleted: {{ filename }}',
      fallbackBody: "Your media asset '{{ filename }}' has been deleted by the lifecycle policy.",
      variables: { filename },
      externalEventId: record.externalEventId,
    });

    // Notify Admins
    const admins = await this.helper.getWorkspaceAdmins(workspaceId);
    for (const adminId of admins) {
      if (adminId === payload.ownerPrincipalId) continue;
      await this.helper.checkPreferenceAndCreateIntents({
        workspaceId,
        tenantId,
        userId: adminId,
        category: 'MEDIA',
        templateKey: 'media.lifecycle.deleted:admin',
        fallbackSubject: 'Media Asset Deleted by Lifecycle Policy',
        fallbackBody:
          "A media asset '{{ filename }}' belonging to owner ID {{ ownerPrincipalId }} has been deleted by the lifecycle policy.",
        variables: { filename, ownerPrincipalId: payload.ownerPrincipalId },
        externalEventId: record.externalEventId,
      });
    }
  }
}
