import { Injectable } from '@nestjs/common';
import type {
  AnalyticsDashboardActivityItemContract,
  AnalyticsEventCategoryContract,
  AnalyticsSubjectTypeContract,
} from '@mentrily/contract-catalog';

interface OutboxEventRecord {
  id: string;
  eventId: string;
  eventName: string;
  workspaceId: string | null;
  occurredAt: Date;
  payload: unknown;
}

interface NormalizedActivityDefinition {
  category: AnalyticsEventCategoryContract;
  subjectType: AnalyticsSubjectTypeContract;
  title: string;
  describe(payload: Record<string, unknown>): string;
  subjectId(payload: Record<string, unknown>): string | undefined;
}

const EVENT_DEFINITIONS: Record<string, NormalizedActivityDefinition> = {
  'learning.course.created': {
    category: 'LEARNING',
    subjectType: 'COURSE',
    title: 'Course created',
    describe: () => 'A learning course was created.',
    subjectId: (payload) => readString(payload, 'courseId'),
  },
  'learning.course.published': {
    category: 'LEARNING',
    subjectType: 'COURSE',
    title: 'Course published',
    describe: () => 'A learning course was published.',
    subjectId: (payload) => readString(payload, 'courseId'),
  },
  'learning.enrollment.created': {
    category: 'LEARNING',
    subjectType: 'ENROLLMENT',
    title: 'Enrollment created',
    describe: () => 'A learner enrolled in a course.',
    subjectId: (payload) => readString(payload, 'enrollmentId'),
  },
  'learning.enrollment.completed': {
    category: 'LEARNING',
    subjectType: 'ENROLLMENT',
    title: 'Course completed',
    describe: () => 'A learner completed a course.',
    subjectId: (payload) => readString(payload, 'enrollmentId'),
  },
  'learning.progress.completed': {
    category: 'LEARNING',
    subjectType: 'LESSON_PROGRESS',
    title: 'Lesson completed',
    describe: () => 'A lesson completion was recorded.',
    subjectId: (payload) => readString(payload, 'progressId'),
  },
  'assessment.published': {
    category: 'ASSESSMENT',
    subjectType: 'ASSESSMENT',
    title: 'Assessment published',
    describe: () => 'An assessment was published.',
    subjectId: (payload) => readString(payload, 'assessmentId'),
  },
  'assessment.attempt.started': {
    category: 'ASSESSMENT',
    subjectType: 'ASSESSMENT_ATTEMPT',
    title: 'Assessment attempt started',
    describe: () => 'A learner started an assessment attempt.',
    subjectId: (payload) => readString(payload, 'attemptId'),
  },
  'assessment.attempt.submitted': {
    category: 'ASSESSMENT',
    subjectType: 'ASSESSMENT_ATTEMPT',
    title: 'Assessment submitted',
    describe: () => 'A learner submitted an assessment attempt.',
    subjectId: (payload) => readString(payload, 'attemptId'),
  },
  'assessment.answer.pending_manual_review': {
    category: 'ASSESSMENT',
    subjectType: 'ASSESSMENT_ATTEMPT',
    title: 'Manual review required',
    describe: () => 'An assessment answer is pending manual review.',
    subjectId: (payload) => readString(payload, 'attemptId'),
  },
  'assessment.grading.run.completed': {
    category: 'ASSESSMENT',
    subjectType: 'ASSESSMENT_ATTEMPT',
    title: 'Assessment grading completed',
    describe: () => 'Assessment grading completed for an attempt.',
    subjectId: (payload) => readString(payload, 'attemptId'),
  },
  'assessment.grading.run.partial': {
    category: 'ASSESSMENT',
    subjectType: 'ASSESSMENT_ATTEMPT',
    title: 'Assessment grading partial',
    describe: () => 'Assessment grading finished with pending manual review.',
    subjectId: (payload) => readString(payload, 'attemptId'),
  },
  'assessment.result.released': {
    category: 'ASSESSMENT',
    subjectType: 'ASSESSMENT_RESULT',
    title: 'Assessment result released',
    describe: () => 'A released assessment result is now visible to the learner.',
    subjectId: (payload) => readString(payload, 'attemptId'),
  },
  'content.document.created': {
    category: 'CONTENT',
    subjectType: 'CONTENT_DOCUMENT',
    title: 'Document created',
    describe: () => 'A content document was created.',
    subjectId: (payload) => readString(payload, 'documentId'),
  },
  'content.document.draft_blocks_replaced': {
    category: 'CONTENT',
    subjectType: 'CONTENT_DOCUMENT',
    title: 'Document updated',
    describe: () => 'Draft content blocks were updated.',
    subjectId: (payload) => readString(payload, 'documentId'),
  },
  'content.document.published': {
    category: 'CONTENT',
    subjectType: 'CONTENT_DOCUMENT',
    title: 'Document published',
    describe: () => 'A content document was published.',
    subjectId: (payload) => readString(payload, 'documentId'),
  },
  'content.document.archived': {
    category: 'CONTENT',
    subjectType: 'CONTENT_DOCUMENT',
    title: 'Document archived',
    describe: () => 'A content document was archived.',
    subjectId: (payload) => readString(payload, 'documentId'),
  },
  'media.upload.completed': {
    category: 'MEDIA',
    subjectType: 'MEDIA_ASSET',
    title: 'Media upload completed',
    describe: () => 'A media asset upload completed.',
    subjectId: (payload) => readString(payload, 'assetId'),
  },
  'media.upload.failed': {
    category: 'MEDIA',
    subjectType: 'MEDIA_ASSET',
    title: 'Media upload failed',
    describe: () => 'A media upload failed.',
    subjectId: (payload) => readString(payload, 'assetId'),
  },
  'media.asset.archived': {
    category: 'MEDIA',
    subjectType: 'MEDIA_ASSET',
    title: 'Media archived',
    describe: () => 'A media asset was archived.',
    subjectId: (payload) => readString(payload, 'assetId'),
  },
  'communication.intent.created': {
    category: 'COMMUNICATION',
    subjectType: 'NOTIFICATION_INTENT',
    title: 'Notification intent created',
    describe: () => 'A notification intent was created.',
    subjectId: (payload) => readString(payload, 'intentId'),
  },
  'communication.intent.dispatched': {
    category: 'COMMUNICATION',
    subjectType: 'NOTIFICATION_INTENT',
    title: 'Notification delivered',
    describe: () => 'A notification intent was dispatched successfully.',
    subjectId: (payload) => readString(payload, 'intentId'),
  },
  'communication.intent.failed': {
    category: 'COMMUNICATION',
    subjectType: 'NOTIFICATION_INTENT',
    title: 'Notification failed',
    describe: () => 'A notification intent failed delivery.',
    subjectId: (payload) => readString(payload, 'intentId'),
  },
};

@Injectable()
export class AnalyticsEventNormalizerService {
  normalize(record: OutboxEventRecord): AnalyticsDashboardActivityItemContract | null {
    if (!record.workspaceId) {
      return null;
    }

    const definition = EVENT_DEFINITIONS[record.eventName];
    if (!definition) {
      return null;
    }

    const payload = asRecord(record.payload);
    if (!payload) {
      return null;
    }

    const subjectId = definition.subjectId(payload);

    return {
      id: record.eventId || record.id,
      category: definition.category,
      type: record.eventName,
      subjectType: definition.subjectType,
      ...(subjectId ? { subjectId } : {}),
      title: definition.title,
      description: definition.describe(payload),
      occurredAt: record.occurredAt.toISOString(),
    };
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(payload: Record<string, unknown>, key: string): string | undefined {
  const value = payload[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
