-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'READY', 'SCHEDULED', 'SENDING_DISABLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CampaignAudienceType" AS ENUM ('ALL_WORKSPACE_MEMBERS', 'WORKSPACE_ADMINS', 'COURSE_LEARNERS', 'ASSESSMENT_PARTICIPANTS', 'CONTENT_AUTHORS', 'MEDIA_OWNERS', 'CUSTOM_USER_IDS');

-- CreateTable
CREATE TABLE "Campaign" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "channel" "NotificationChannel" NOT NULL,
    "templateId" UUID,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "audienceType" "CampaignAudienceType" NOT NULL,
    "audienceConfig" JSONB NOT NULL DEFAULT '{}',
    "scheduledFor" TIMESTAMP(3),
    "createdByPrincipalId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Campaign_workspaceId_status_idx" ON "Campaign"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Campaign_workspaceId_createdAt_idx" ON "Campaign"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "Campaign_workspaceId_scheduledFor_idx" ON "Campaign"("workspaceId", "scheduledFor");

-- CreateIndex
DROP INDEX IF EXISTS "NotificationIntent_idempotencyKey_idx";
CREATE INDEX "NotificationIntent_idempotencyKey_idx" ON "NotificationIntent"("idempotencyKey");

