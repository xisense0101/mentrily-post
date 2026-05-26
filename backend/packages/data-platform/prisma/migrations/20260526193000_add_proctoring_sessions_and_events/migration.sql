-- CreateEnum
CREATE TYPE "AssessmentProctoringMode" AS ENUM ('OFF', 'BASIC_EVENT_MONITORING', 'RESERVED_LIVE_MONITORING');

-- CreateEnum
CREATE TYPE "AssessmentProctoringSessionStatus" AS ENUM ('PENDING', 'ACTIVE', 'ENDED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AssessmentProctoringEventType" AS ENUM (
  'SESSION_STARTED',
  'SESSION_ENDED',
  'HEARTBEAT',
  'WINDOW_BLUR',
  'WINDOW_FOCUS',
  'VISIBILITY_HIDDEN',
  'VISIBILITY_VISIBLE',
  'FULLSCREEN_EXITED',
  'FULLSCREEN_ENTERED',
  'COPY_ATTEMPTED',
  'PASTE_ATTEMPTED',
  'NETWORK_OFFLINE',
  'NETWORK_ONLINE',
  'SUSPICIOUS_ACTIVITY_REPORTED',
  'SYSTEM_WARNING'
);

-- CreateEnum
CREATE TYPE "AssessmentProctoringEventSeverity" AS ENUM ('INFO', 'LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "AssessmentProctoringSession" (
  "id" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "workspaceId" UUID NOT NULL,
  "assessmentId" UUID NOT NULL,
  "attemptId" UUID NOT NULL,
  "learnerPrincipalId" UUID NOT NULL,
  "mode" "AssessmentProctoringMode" NOT NULL,
  "status" "AssessmentProctoringSessionStatus" NOT NULL DEFAULT 'PENDING',
  "startedAt" TIMESTAMP(3) NOT NULL,
  "endedAt" TIMESTAMP(3),
  "lastHeartbeatAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssessmentProctoringSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentProctoringEvent" (
  "id" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "workspaceId" UUID NOT NULL,
  "sessionId" UUID NOT NULL,
  "attemptId" UUID NOT NULL,
  "assessmentId" UUID NOT NULL,
  "learnerPrincipalId" UUID NOT NULL,
  "eventId" TEXT,
  "eventType" "AssessmentProctoringEventType" NOT NULL,
  "severity" "AssessmentProctoringEventSeverity" NOT NULL DEFAULT 'INFO',
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB NOT NULL,
  CONSTRAINT "AssessmentProctoringEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssessmentProctoringSession_tenantId_idx" ON "AssessmentProctoringSession"("tenantId");
CREATE INDEX "AssessmentProctoringSession_workspaceId_idx" ON "AssessmentProctoringSession"("workspaceId");
CREATE INDEX "AssessmentProctoringSession_attemptId_idx" ON "AssessmentProctoringSession"("attemptId");
CREATE INDEX "AssessmentProctoringSession_assessmentId_idx" ON "AssessmentProctoringSession"("assessmentId");
CREATE INDEX "AssessmentProctoringSession_learnerPrincipalId_idx" ON "AssessmentProctoringSession"("learnerPrincipalId");
CREATE INDEX "AssessmentProctoringSession_workspaceId_attemptId_idx" ON "AssessmentProctoringSession"("workspaceId", "attemptId");
CREATE INDEX "AssessmentProctoringSession_workspaceId_assessmentId_idx" ON "AssessmentProctoringSession"("workspaceId", "assessmentId");
CREATE INDEX "AssessmentProctoringSession_workspaceId_learnerPrincipalId_idx" ON "AssessmentProctoringSession"("workspaceId", "learnerPrincipalId");
CREATE INDEX "AssessmentProctoringSession_status_idx" ON "AssessmentProctoringSession"("status");

CREATE INDEX "AssessmentProctoringEvent_tenantId_idx" ON "AssessmentProctoringEvent"("tenantId");
CREATE INDEX "AssessmentProctoringEvent_workspaceId_idx" ON "AssessmentProctoringEvent"("workspaceId");
CREATE INDEX "AssessmentProctoringEvent_sessionId_idx" ON "AssessmentProctoringEvent"("sessionId");
CREATE INDEX "AssessmentProctoringEvent_attemptId_idx" ON "AssessmentProctoringEvent"("attemptId");
CREATE INDEX "AssessmentProctoringEvent_assessmentId_idx" ON "AssessmentProctoringEvent"("assessmentId");
CREATE INDEX "AssessmentProctoringEvent_learnerPrincipalId_idx" ON "AssessmentProctoringEvent"("learnerPrincipalId");
CREATE INDEX "AssessmentProctoringEvent_eventType_idx" ON "AssessmentProctoringEvent"("eventType");
CREATE INDEX "AssessmentProctoringEvent_occurredAt_idx" ON "AssessmentProctoringEvent"("occurredAt");
CREATE INDEX "AssessmentProctoringEvent_receivedAt_idx" ON "AssessmentProctoringEvent"("receivedAt");
CREATE INDEX "AssessmentProctoringEvent_workspaceId_sessionId_occurredAt_idx" ON "AssessmentProctoringEvent"("workspaceId", "sessionId", "occurredAt");
CREATE INDEX "AssessmentProctoringEvent_workspaceId_eventType_occurredAt_idx" ON "AssessmentProctoringEvent"("workspaceId", "eventType", "occurredAt");
CREATE UNIQUE INDEX "AssessmentProctoringEvent_workspaceId_sessionId_eventId_key" ON "AssessmentProctoringEvent"("workspaceId", "sessionId", "eventId");

-- AddForeignKey
ALTER TABLE "AssessmentProctoringSession"
ADD CONSTRAINT "AssessmentProctoringSession_attemptId_fkey"
FOREIGN KEY ("attemptId") REFERENCES "AssessmentAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AssessmentProctoringEvent"
ADD CONSTRAINT "AssessmentProctoringEvent_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "AssessmentProctoringSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
