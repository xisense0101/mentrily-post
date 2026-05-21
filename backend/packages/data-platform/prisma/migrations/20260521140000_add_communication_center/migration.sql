-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS', 'IN_APP');

-- CreateEnum
CREATE TYPE "NotificationIntentStatus" AS ENUM ('DRAFT', 'QUEUED', 'DISPATCHED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationTemplateStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "NotificationProvider" AS ENUM ('NOOP', 'FIXTURE', 'RESERVED_EMAIL', 'RESERVED_SMS');

-- CreateTable
CREATE TABLE "NotificationTemplate" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "channel" "NotificationChannel" NOT NULL,
    "subjectTemplate" TEXT,
    "bodyTemplate" TEXT NOT NULL,
    "variables" TEXT[] NOT NULL,
    "status" "NotificationTemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "metadata" JSONB NOT NULL,
    "createdByPrincipalId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationIntent" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "templateId" UUID,
    "channel" "NotificationChannel" NOT NULL,
    "recipient" JSONB NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "NotificationIntentStatus" NOT NULL DEFAULT 'QUEUED',
    "provider" "NotificationProvider" NOT NULL DEFAULT 'NOOP',
    "scheduledFor" TIMESTAMP(3),
    "queuedAt" TIMESTAMP(3),
    "dispatchedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "metadata" JSONB NOT NULL,
    "createdByPrincipalId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationIntent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationDeliveryAttempt" (
    "id" UUID NOT NULL,
    "intentId" UUID NOT NULL,
    "provider" "NotificationProvider" NOT NULL,
    "status" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "providerMessageId" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL,

    CONSTRAINT "NotificationDeliveryAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationTemplate_workspaceId_key_key" ON "NotificationTemplate"("workspaceId", "key");

-- CreateIndex
CREATE INDEX "NotificationTemplate_tenantId_idx" ON "NotificationTemplate"("tenantId");

-- CreateIndex
CREATE INDEX "NotificationTemplate_workspaceId_idx" ON "NotificationTemplate"("workspaceId");

-- CreateIndex
CREATE INDEX "NotificationTemplate_workspaceId_status_idx" ON "NotificationTemplate"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "NotificationTemplate_workspaceId_channel_idx" ON "NotificationTemplate"("workspaceId", "channel");

-- CreateIndex
CREATE INDEX "NotificationTemplate_createdAt_idx" ON "NotificationTemplate"("createdAt");

-- CreateIndex
CREATE INDEX "NotificationIntent_tenantId_idx" ON "NotificationIntent"("tenantId");

-- CreateIndex
CREATE INDEX "NotificationIntent_workspaceId_idx" ON "NotificationIntent"("workspaceId");

-- CreateIndex
CREATE INDEX "NotificationIntent_templateId_idx" ON "NotificationIntent"("templateId");

-- CreateIndex
CREATE INDEX "NotificationIntent_workspaceId_status_idx" ON "NotificationIntent"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "NotificationIntent_workspaceId_channel_idx" ON "NotificationIntent"("workspaceId", "channel");

-- CreateIndex
CREATE INDEX "NotificationIntent_workspaceId_priority_idx" ON "NotificationIntent"("workspaceId", "priority");

-- CreateIndex
CREATE INDEX "NotificationIntent_scheduledFor_idx" ON "NotificationIntent"("scheduledFor");

-- CreateIndex
CREATE INDEX "NotificationIntent_queuedAt_idx" ON "NotificationIntent"("queuedAt");

-- CreateIndex
CREATE INDEX "NotificationIntent_createdAt_idx" ON "NotificationIntent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationDeliveryAttempt_intentId_attemptNumber_key" ON "NotificationDeliveryAttempt"("intentId", "attemptNumber");

-- CreateIndex
CREATE INDEX "NotificationDeliveryAttempt_intentId_idx" ON "NotificationDeliveryAttempt"("intentId");

-- CreateIndex
CREATE INDEX "NotificationDeliveryAttempt_provider_idx" ON "NotificationDeliveryAttempt"("provider");

-- CreateIndex
CREATE INDEX "NotificationDeliveryAttempt_status_idx" ON "NotificationDeliveryAttempt"("status");

-- CreateIndex
CREATE INDEX "NotificationDeliveryAttempt_createdAt_idx" ON "NotificationDeliveryAttempt"("createdAt");

-- AddForeignKey
ALTER TABLE "NotificationIntent" ADD CONSTRAINT "NotificationIntent_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "NotificationTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDeliveryAttempt" ADD CONSTRAINT "NotificationDeliveryAttempt_intentId_fkey" FOREIGN KEY ("intentId") REFERENCES "NotificationIntent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
