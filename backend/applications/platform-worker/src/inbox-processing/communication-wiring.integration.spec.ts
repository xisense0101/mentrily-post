import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { PrismaService } from '@mentrily/data-platform';
import { WorkerModule } from '../worker.module.js';
import { OutboxRelayWorker } from '../outbox-relay/outbox-relay.worker.js';
import { InboxProcessingWorker } from './inbox-processing.worker.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../../../../.env.test');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match && match[1] && match[2]) {
      const key = match[1].trim();
      const val = match[2].trim().replace(/^['"]|['"]$/g, '');
      process.env[key] = val;
    }
  }
}

export async function truncatePublicSchema(client: any): Promise<void> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await client.$executeRawUnsafe(`
        DO $$
        DECLARE
          table_names text;
        BEGIN
          PERFORM pg_advisory_lock(hashtext('mentrily_test_truncate_public_schema'));
          BEGIN
          SELECT string_agg(format('%I.%I', schemaname, tablename), ', ' ORDER BY tablename)
          INTO table_names
          FROM pg_tables
          WHERE schemaname = 'public'
            AND tablename != '_prisma_migrations';

          IF table_names IS NOT NULL THEN
            EXECUTE 'TRUNCATE TABLE ' || table_names || ' RESTART IDENTITY CASCADE';
          END IF;
          EXCEPTION WHEN OTHERS THEN
            PERFORM pg_advisory_unlock(hashtext('mentrily_test_truncate_public_schema'));
            RAISE;
          END;
          PERFORM pg_advisory_unlock(hashtext('mentrily_test_truncate_public_schema'));
        END $$;
      `);
      return;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes('40P01')) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
    }
  }

  throw lastError;
}

describe('Communication Event Wiring (integration)', () => {
  let prisma: PrismaService;
  let relayWorker: OutboxRelayWorker;
  let inboxWorker: InboxProcessingWorker;
  let originalEnableEmail: string | undefined;
  let originalEnableSms: string | undefined;

  beforeAll(async () => {
    originalEnableEmail = process.env.ENABLE_EMAIL_NOTIFICATIONS;
    originalEnableSms = process.env.ENABLE_SMS_NOTIFICATIONS;
    process.env.ENABLE_EMAIL_NOTIFICATIONS = 'true';
    process.env.ENABLE_SMS_NOTIFICATIONS = 'true';

    const moduleRef = await Test.createTestingModule({
      imports: [WorkerModule],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    relayWorker = moduleRef.get(OutboxRelayWorker);
    inboxWorker = moduleRef.get(InboxProcessingWorker);
  });

  beforeEach(async () => {
    await truncatePublicSchema(prisma);
  });

  afterAll(async () => {
    if (originalEnableEmail !== undefined) {
      process.env.ENABLE_EMAIL_NOTIFICATIONS = originalEnableEmail;
    } else {
      delete process.env.ENABLE_EMAIL_NOTIFICATIONS;
    }
    if (originalEnableSms !== undefined) {
      process.env.ENABLE_SMS_NOTIFICATIONS = originalEnableSms;
    } else {
      delete process.env.ENABLE_SMS_NOTIFICATIONS;
    }
    await prisma.$disconnect();
  });

  it('proves no EMAIL/SMS intent by default, and no real provider behavior', async () => {
    const tenantId = randomUUID();
    const workspaceId = randomUUID();
    const userId = randomUUID();
    const assessmentId = randomUUID();

    // Seed workspace, user, and member
    await prisma.workspace.create({
      data: {
        id: workspaceId,
        name: 'Default Test WS',
        slug: 'default-ws',
      },
    });

    await prisma.principal.create({
      data: {
        id: userId,
        email: 'default-user@lovetech.org',
        displayName: 'Default User',
      },
    });

    await prisma.workspaceMember.create({
      data: {
        id: randomUUID(),
        workspaceId,
        principalId: userId,
        status: 'ACTIVE',
      },
    });

    await prisma.assessment.create({
      data: {
        id: assessmentId,
        workspaceId,
        tenantId,
        title: 'Default MCQ',
        purpose: 'QUIZ',
        ownerPrincipalId: userId,
        status: 'PUBLISHED',
        metadata: {},
        attemptPolicy: { allowRetake: false, shuffleQuestions: false, shuffleOptions: false },
        resultReleasePolicy: 'IMMEDIATE',
      },
    });

    // Emit event
    const eventId = randomUUID();
    await prisma.outboxMessage.create({
      data: {
        id: randomUUID(),
        eventId,
        eventName: 'assessment.published',
        eventVersion: 1,
        tenantId,
        workspaceId,
        correlationId: randomUUID(),
        payload: {
          assessmentId,
        },
        occurredAt: new Date(),
        status: 'PENDING',
      },
    });

    await relayWorker.runOnce(10);
    await inboxWorker.runOnce(10);

    // Verify only IN_APP created by default (no EMAIL/SMS)
    const intents = await prisma.notificationIntent.findMany();
    expect(intents).toHaveLength(1);
    expect(intents[0]?.channel).toBe('IN_APP');
    expect(intents[0]?.provider).toBe('FIXTURE'); // Tests use FIXTURE provider, not real
  });

  it('creates EMAIL and SMS intents when feature flags are enabled, preferences exist, and contact info is present', async () => {
    const tenantId = randomUUID();
    const workspaceId = randomUUID();
    const userId = randomUUID();
    const assessmentId = randomUUID();

    await prisma.workspace.create({
      data: {
        id: workspaceId,
        name: 'Opt-in WS',
        slug: 'optin-ws',
      },
    });

    await prisma.principal.create({
      data: {
        id: userId,
        email: 'optin@lovetech.org',
        displayName: 'Opt-in User',
      },
    });

    await prisma.workspaceMember.create({
      data: {
        id: randomUUID(),
        workspaceId,
        principalId: userId,
        status: 'ACTIVE',
      },
    });

    // Seed external identity with phone number in metadata
    await prisma.externalIdentity.create({
      data: {
        id: randomUUID(),
        principalId: userId,
        provider: 'CLERK',
        externalId: 'clerk-optin',
        email: 'optin@lovetech.org',
        metadata: {
          phoneNumber: '+15551234567',
        },
      },
    });

    // Seed preferences to enable EMAIL and SMS
    await prisma.notificationPreference.createMany({
      data: [
        {
          id: randomUUID(),
          workspaceId,
          tenantId,
          userId,
          channel: 'EMAIL',
          category: 'ASSESSMENT',
          enabled: true,
        },
        {
          id: randomUUID(),
          workspaceId,
          tenantId,
          userId,
          channel: 'SMS',
          category: 'ASSESSMENT',
          enabled: true,
        },
      ],
    });

    await prisma.assessment.create({
      data: {
        id: assessmentId,
        workspaceId,
        tenantId,
        title: 'Opt-in MCQ',
        purpose: 'QUIZ',
        ownerPrincipalId: userId,
        status: 'PUBLISHED',
        metadata: {},
        attemptPolicy: { allowRetake: false, shuffleQuestions: false, shuffleOptions: false },
        resultReleasePolicy: 'IMMEDIATE',
      },
    });

    const eventId = randomUUID();
    await prisma.outboxMessage.create({
      data: {
        id: randomUUID(),
        eventId,
        eventName: 'assessment.published',
        eventVersion: 1,
        tenantId,
        workspaceId,
        correlationId: randomUUID(),
        payload: {
          assessmentId,
        },
        occurredAt: new Date(),
        status: 'PENDING',
      },
    });

    await relayWorker.runOnce(10);
    await inboxWorker.runOnce(10);

    const intents = await prisma.notificationIntent.findMany();
    expect(intents).toHaveLength(3); // IN_APP, EMAIL, SMS

    const smsIntent = intents.find((i) => i.channel === 'SMS');
    expect(smsIntent).toBeDefined();
    const recipient = smsIntent?.recipient as Record<string, any>;
    expect(recipient?.phoneNumber).toBe('+15551234567');
  });

  it('renders custom template if active template is provided in database', async () => {
    const tenantId = randomUUID();
    const workspaceId = randomUUID();
    const userId = randomUUID();
    const assessmentId = randomUUID();

    await prisma.workspace.create({
      data: {
        id: workspaceId,
        name: 'Template Workspace',
        slug: 'template-ws',
      },
    });

    await prisma.principal.create({
      data: {
        id: userId,
        email: 'charles@babbage.org',
        displayName: 'Charles Babbage',
      },
    });

    await prisma.workspaceMember.create({
      data: {
        id: randomUUID(),
        workspaceId,
        principalId: userId,
        status: 'ACTIVE',
      },
    });

    // Seed preference for EMAIL to allow rendering
    await prisma.notificationPreference.create({
      data: {
        id: randomUUID(),
        workspaceId,
        tenantId,
        userId,
        channel: 'EMAIL',
        category: 'ASSESSMENT',
        enabled: true,
      },
    });

    await prisma.assessment.create({
      data: {
        id: assessmentId,
        workspaceId,
        tenantId,
        title: 'Difference Engine MCQ',
        purpose: 'QUIZ',
        ownerPrincipalId: userId,
        status: 'PUBLISHED',
        metadata: {},
        attemptPolicy: { allowRetake: false, shuffleQuestions: false, shuffleOptions: false },
        resultReleasePolicy: 'IMMEDIATE',
      },
    });

    await prisma.notificationTemplate.create({
      data: {
        id: randomUUID(),
        workspaceId,
        tenantId,
        key: 'assessment.published:EMAIL',
        name: 'Custom Pub Template',
        channel: 'EMAIL',
        status: 'ACTIVE',
        subjectTemplate: 'Custom Subject Alert: {{ title }}',
        bodyTemplate: 'Custom Body Alert: {{ title }} with purpose: {{ purpose }} is online.',
        variables: ['title', 'purpose'],
        createdByPrincipalId: userId,
        metadata: {},
      },
    });

    const eventId = randomUUID();
    await prisma.outboxMessage.create({
      data: {
        id: randomUUID(),
        eventId,
        eventName: 'assessment.published',
        eventVersion: 1,
        tenantId,
        workspaceId,
        correlationId: randomUUID(),
        payload: {
          assessmentId,
        },
        occurredAt: new Date(),
        status: 'PENDING',
      },
    });

    await relayWorker.runOnce(10);
    await inboxWorker.runOnce(10);

    const intents = await prisma.notificationIntent.findMany();
    const emailIntent = intents.find((i) => i.channel === 'EMAIL');
    expect(emailIntent).toBeDefined();
    expect(emailIntent?.subject).toBe('Custom Subject Alert: Difference Engine MCQ');
    expect(emailIntent?.body).toBe(
      'Custom Body Alert: Difference Engine MCQ with purpose: QUIZ is online.',
    );
  });

  it('sanitizes media quarantine result messages and notifies owner and admins', async () => {
    const tenantId = randomUUID();
    const workspaceId = randomUUID();
    const ownerId = randomUUID();
    const adminId = randomUUID();
    const assetId = randomUUID();

    await prisma.workspace.create({
      data: {
        id: workspaceId,
        name: 'Security WS',
        slug: 'security-ws',
      },
    });

    await prisma.principal.createMany({
      data: [
        { id: ownerId, email: 'owner@sec.org', displayName: 'Asset Owner' },
        { id: adminId, email: 'admin@sec.org', displayName: 'Workspace Admin' },
      ],
    });

    // Seed admin role membership
    await prisma.workspaceMember.createMany({
      data: [
        {
          id: randomUUID(),
          workspaceId,
          principalId: ownerId,
          status: 'ACTIVE',
        },
        {
          id: randomUUID(),
          workspaceId,
          principalId: adminId,
          status: 'ACTIVE',
        },
      ],
    });

    await prisma.mediaAsset.create({
      data: {
        id: assetId,
        tenantId,
        workspaceId,
        ownerPrincipalId: ownerId,
        filename: 'malicious-payload.exe',
        contentType: 'application/octet-stream',
        fileCategory: 'OTHER',
      },
    });

    const eventId = randomUUID();
    await prisma.outboxMessage.create({
      data: {
        id: randomUUID(),
        eventId,
        eventName: 'media.security_scan.completed',
        eventVersion: 1,
        tenantId,
        workspaceId,
        correlationId: randomUUID(),
        payload: {
          assetId,
          scanStatus: 'QUARANTINED',
          resultMessage: 'Found EICAR test virus signature in file buffer',
        },
        occurredAt: new Date(),
        status: 'PENDING',
      },
    });

    await relayWorker.runOnce(10);
    await inboxWorker.runOnce(10);

    const intents = await prisma.notificationIntent.findMany();
    // Expect 2 IN_APP intents: one for owner, one for admin
    expect(intents).toHaveLength(2);

    const ownerIntent = intents.find(
      (i) => (i.recipient as Record<string, any>).principalId === ownerId,
    );
    expect(ownerIntent).toBeDefined();
    // Verify body is sanitized and doesn't leak EICAR text
    expect(ownerIntent?.body).toContain('Suspicious content detected');
    expect(ownerIntent?.body).not.toContain('EICAR');

    const adminIntent = intents.find(
      (i) => (i.recipient as Record<string, any>).principalId === adminId,
    );
    expect(adminIntent).toBeDefined();
    expect(adminIntent?.body).toContain('Suspicious content detected');
    expect(adminIntent?.body).not.toContain('EICAR');
  });

  it('handles multiple event mappings like course.published, assessment.result.released, and media.processing.failed', async () => {
    const tenantId = randomUUID();
    const workspaceId = randomUUID();
    const userId = randomUUID();
    const courseId = randomUUID();
    const assessmentId = randomUUID();
    const assetId = randomUUID();

    await prisma.workspace.create({
      data: {
        id: workspaceId,
        name: 'Multi WS',
        slug: 'multi-ws',
      },
    });

    await prisma.principal.create({
      data: {
        id: userId,
        email: 'multi@lovetech.org',
        displayName: 'Multi User',
      },
    });

    await prisma.workspaceMember.create({
      data: {
        id: randomUUID(),
        workspaceId,
        principalId: userId,
        status: 'ACTIVE',
      },
    });

    // 1. Seed Course
    await prisma.learningCourse.create({
      data: {
        id: courseId,
        workspaceId,
        tenantId,
        title: 'Intro to Quantum Computing',
        creatorPrincipalId: userId,
        status: 'PUBLISHED',
      },
    });

    // Emit course.published
    await prisma.outboxMessage.create({
      data: {
        id: randomUUID(),
        eventId: randomUUID(),
        eventName: 'learning.course.published',
        eventVersion: 1,
        tenantId,
        workspaceId,
        correlationId: randomUUID(),
        payload: { courseId },
        occurredAt: new Date(),
        status: 'PENDING',
      },
    });

    // 2. Seed Assessment and Attempt
    await prisma.assessment.create({
      data: {
        id: assessmentId,
        workspaceId,
        tenantId,
        title: 'Quantum MCQ',
        purpose: 'QUIZ',
        ownerPrincipalId: userId,
        status: 'PUBLISHED',
        metadata: {},
        attemptPolicy: { allowRetake: false, shuffleQuestions: false, shuffleOptions: false },
        resultReleasePolicy: 'IMMEDIATE',
      },
    });

    // Emit assessment.result.released
    await prisma.outboxMessage.create({
      data: {
        id: randomUUID(),
        eventId: randomUUID(),
        eventName: 'assessment.result.released',
        eventVersion: 1,
        tenantId,
        workspaceId,
        correlationId: randomUUID(),
        payload: {
          assessmentId,
          learnerPrincipalId: userId,
          score: 9,
          maxScore: 10,
        },
        occurredAt: new Date(),
        status: 'PENDING',
      },
    });

    // 3. Seed Media Asset
    await prisma.mediaAsset.create({
      data: {
        id: assetId,
        tenantId,
        workspaceId,
        ownerPrincipalId: userId,
        filename: 'heavy-render.mp4',
        contentType: 'video/mp4',
        fileCategory: 'VIDEO',
      },
    });

    // Emit media.processing.failed
    await prisma.outboxMessage.create({
      data: {
        id: randomUUID(),
        eventId: randomUUID(),
        eventName: 'media.processing.failed',
        eventVersion: 1,
        tenantId,
        workspaceId,
        correlationId: randomUUID(),
        payload: {
          assetId,
          ownerPrincipalId: userId,
          errorMessage: 'Transcoding subprocess terminated with exit code 1',
        },
        occurredAt: new Date(),
        status: 'PENDING',
      },
    });

    await relayWorker.runOnce(10);
    await inboxWorker.runOnce(10);

    const intents = await prisma.notificationIntent.findMany();
    // We expect 3 IN_APP intents
    expect(intents).toHaveLength(3);

    const courseIntent = intents.find((i) => i.body.includes('Intro to Quantum Computing'));
    expect(courseIntent).toBeDefined();

    const resultIntent = intents.find(
      (i) => i.body.includes('Quantum MCQ') && i.body.includes('9/10'),
    );
    expect(resultIntent).toBeDefined();

    const mediaIntent = intents.find(
      (i) => i.body.includes('heavy-render.mp4') && i.body.includes('Transcoding subprocess'),
    );
    expect(mediaIntent).toBeDefined();
  });
});
