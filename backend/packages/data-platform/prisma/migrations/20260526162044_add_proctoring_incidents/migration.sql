-- CreateEnum
CREATE TYPE "AssessmentProctoringIncidentType" AS ENUM ('FOCUS_LOSS', 'FULLSCREEN_EXIT', 'COPY_PASTE_ACTIVITY', 'CONNECTIVITY_INTERRUPTION', 'SESSION_INTERRUPTION', 'MULTIPLE_WARNINGS', 'HIGH_SEVERITY_EVENT', 'SYSTEM_FLAG', 'MANUAL_REVIEW_FLAG');

-- CreateEnum
CREATE TYPE "AssessmentProctoringIncidentStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "AssessmentProctoringIncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AssessmentProctoringIncidentReviewActionType" AS ENUM ('OPENED', 'MARKED_IN_REVIEW', 'RESOLVED', 'DISMISSED', 'ESCALATED', 'REOPENED', 'NOTE_ADDED');

-- CreateTable
CREATE TABLE "AssessmentProctoringIncident" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "attemptId" UUID NOT NULL,
    "assessmentId" UUID NOT NULL,
    "learnerPrincipalId" UUID NOT NULL,
    "incidentType" "AssessmentProctoringIncidentType" NOT NULL,
    "severity" "AssessmentProctoringIncidentSeverity" NOT NULL,
    "status" "AssessmentProctoringIncidentStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "firstEventAt" TIMESTAMP(3) NOT NULL,
    "lastEventAt" TIMESTAMP(3) NOT NULL,
    "eventCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByPrincipalId" UUID,
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,

    CONSTRAINT "AssessmentProctoringIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentProctoringIncidentEvent" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "incidentId" UUID NOT NULL,
    "proctoringEventId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssessmentProctoringIncidentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentProctoringIncidentReviewAction" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "incidentId" UUID NOT NULL,
    "actionType" "AssessmentProctoringIncidentReviewActionType" NOT NULL,
    "actorPrincipalId" UUID NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssessmentProctoringIncidentReviewAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssessmentProctoringIncident_tenantId_idx" ON "AssessmentProctoringIncident"("tenantId");

-- CreateIndex
CREATE INDEX "AssessmentProctoringIncident_workspaceId_idx" ON "AssessmentProctoringIncident"("workspaceId");

-- CreateIndex
CREATE INDEX "AssessmentProctoringIncident_sessionId_idx" ON "AssessmentProctoringIncident"("sessionId");

-- CreateIndex
CREATE INDEX "AssessmentProctoringIncident_attemptId_idx" ON "AssessmentProctoringIncident"("attemptId");

-- CreateIndex
CREATE INDEX "AssessmentProctoringIncident_assessmentId_idx" ON "AssessmentProctoringIncident"("assessmentId");

-- CreateIndex
CREATE INDEX "AssessmentProctoringIncident_learnerPrincipalId_idx" ON "AssessmentProctoringIncident"("learnerPrincipalId");

-- CreateIndex
CREATE INDEX "AssessmentProctoringIncident_status_idx" ON "AssessmentProctoringIncident"("status");

-- CreateIndex
CREATE INDEX "AssessmentProctoringIncident_severity_idx" ON "AssessmentProctoringIncident"("severity");

-- CreateIndex
CREATE INDEX "AssessmentProctoringIncident_lastEventAt_idx" ON "AssessmentProctoringIncident"("lastEventAt");

-- CreateIndex
CREATE INDEX "AssessmentProctoringIncident_workspaceId_attemptId_idx" ON "AssessmentProctoringIncident"("workspaceId", "attemptId");

-- CreateIndex
CREATE INDEX "AssessmentProctoringIncident_workspaceId_assessmentId_idx" ON "AssessmentProctoringIncident"("workspaceId", "assessmentId");

-- CreateIndex
CREATE INDEX "AssessmentProctoringIncident_workspaceId_sessionId_idx" ON "AssessmentProctoringIncident"("workspaceId", "sessionId");

-- CreateIndex
CREATE INDEX "AssessmentProctoringIncident_workspaceId_status_idx" ON "AssessmentProctoringIncident"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "AssessmentProctoringIncident_workspaceId_severity_idx" ON "AssessmentProctoringIncident"("workspaceId", "severity");

-- CreateIndex
CREATE INDEX "AssessmentProctoringIncident_workspaceId_assessmentId_statu_idx" ON "AssessmentProctoringIncident"("workspaceId", "assessmentId", "status");

-- CreateIndex
CREATE INDEX "AssessmentProctoringIncident_workspaceId_attemptId_status_idx" ON "AssessmentProctoringIncident"("workspaceId", "attemptId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentProctoringIncident_workspaceId_sessionId_incident_key" ON "AssessmentProctoringIncident"("workspaceId", "sessionId", "incidentType", "status");

-- CreateIndex
CREATE INDEX "AssessmentProctoringIncidentEvent_tenantId_idx" ON "AssessmentProctoringIncidentEvent"("tenantId");

-- CreateIndex
CREATE INDEX "AssessmentProctoringIncidentEvent_workspaceId_idx" ON "AssessmentProctoringIncidentEvent"("workspaceId");

-- CreateIndex
CREATE INDEX "AssessmentProctoringIncidentEvent_incidentId_idx" ON "AssessmentProctoringIncidentEvent"("incidentId");

-- CreateIndex
CREATE INDEX "AssessmentProctoringIncidentEvent_proctoringEventId_idx" ON "AssessmentProctoringIncidentEvent"("proctoringEventId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentProctoringIncidentEvent_workspaceId_incidentId_pr_key" ON "AssessmentProctoringIncidentEvent"("workspaceId", "incidentId", "proctoringEventId");

-- CreateIndex
CREATE INDEX "AssessmentProctoringIncidentReviewAction_tenantId_idx" ON "AssessmentProctoringIncidentReviewAction"("tenantId");

-- CreateIndex
CREATE INDEX "AssessmentProctoringIncidentReviewAction_workspaceId_idx" ON "AssessmentProctoringIncidentReviewAction"("workspaceId");

-- CreateIndex
CREATE INDEX "AssessmentProctoringIncidentReviewAction_incidentId_idx" ON "AssessmentProctoringIncidentReviewAction"("incidentId");

-- AddForeignKey
ALTER TABLE "AssessmentProctoringIncident" ADD CONSTRAINT "AssessmentProctoringIncident_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AssessmentProctoringSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentProctoringIncident" ADD CONSTRAINT "AssessmentProctoringIncident_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "AssessmentAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentProctoringIncidentEvent" ADD CONSTRAINT "AssessmentProctoringIncidentEvent_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "AssessmentProctoringIncident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentProctoringIncidentEvent" ADD CONSTRAINT "AssessmentProctoringIncidentEvent_proctoringEventId_fkey" FOREIGN KEY ("proctoringEventId") REFERENCES "AssessmentProctoringEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentProctoringIncidentReviewAction" ADD CONSTRAINT "AssessmentProctoringIncidentReviewAction_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "AssessmentProctoringIncident"("id") ON DELETE CASCADE ON UPDATE CASCADE;
