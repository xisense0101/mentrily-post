-- CreateEnum
CREATE TYPE "AssessmentAttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AssessmentAttemptAnswerStatus" AS ENUM ('DRAFT', 'SUBMITTED');

-- CreateEnum
CREATE TYPE "AssessmentAttemptGradingStatus" AS ENUM ('NOT_GRADED', 'AUTO_GRADING_RESERVED', 'PENDING_MANUAL_REVIEW', 'GRADED', 'RELEASED');

-- CreateTable
CREATE TABLE "AssessmentAttempt" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "assessmentId" UUID NOT NULL,
    "snapshotId" UUID NOT NULL,
    "snapshotVersionId" UUID NOT NULL,
    "snapshotVersionNumber" INTEGER NOT NULL,
    "learnerPrincipalId" UUID NOT NULL,
    "status" "AssessmentAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentAttemptAnswer" (
    "id" UUID NOT NULL,
    "attemptId" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "questionKind" "AssessmentQuestionKind" NOT NULL,
    "answer" JSONB NOT NULL,
    "status" "AssessmentAttemptAnswerStatus" NOT NULL DEFAULT 'DRAFT',
    "savedAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL,

    CONSTRAINT "AssessmentAttemptAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentAttemptSession" (
    "id" UUID NOT NULL,
    "attemptId" UUID NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL,

    CONSTRAINT "AssessmentAttemptSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentAttemptResult" (
    "id" UUID NOT NULL,
    "attemptId" UUID NOT NULL,
    "gradingStatus" "AssessmentAttemptGradingStatus" NOT NULL DEFAULT 'NOT_GRADED',
    "score" DOUBLE PRECISION,
    "maxScore" DOUBLE PRECISION,
    "releasedAt" TIMESTAMP(3),
    "feedback" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentAttemptResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssessmentAttempt_tenantId_idx" ON "AssessmentAttempt"("tenantId");

-- CreateIndex
CREATE INDEX "AssessmentAttempt_workspaceId_idx" ON "AssessmentAttempt"("workspaceId");

-- CreateIndex
CREATE INDEX "AssessmentAttempt_assessmentId_idx" ON "AssessmentAttempt"("assessmentId");

-- CreateIndex
CREATE INDEX "AssessmentAttempt_snapshotId_idx" ON "AssessmentAttempt"("snapshotId");

-- CreateIndex
CREATE INDEX "AssessmentAttempt_learnerPrincipalId_idx" ON "AssessmentAttempt"("learnerPrincipalId");

-- CreateIndex
CREATE INDEX "AssessmentAttempt_status_idx" ON "AssessmentAttempt"("status");

-- CreateIndex
CREATE INDEX "AssessmentAttempt_startedAt_idx" ON "AssessmentAttempt"("startedAt");

-- CreateIndex
CREATE INDEX "AssessmentAttempt_submittedAt_idx" ON "AssessmentAttempt"("submittedAt");

-- CreateIndex
CREATE INDEX "AssessmentAttempt_expiresAt_idx" ON "AssessmentAttempt"("expiresAt");

-- CreateIndex
CREATE INDEX "AssessmentAttempt_assessmentId_learnerPrincipalId_idx" ON "AssessmentAttempt"("assessmentId", "learnerPrincipalId");

-- CreateIndex
CREATE INDEX "AssessmentAttempt_workspaceId_learnerPrincipalId_idx" ON "AssessmentAttempt"("workspaceId", "learnerPrincipalId");

-- CreateIndex
CREATE INDEX "AssessmentAttemptAnswer_attemptId_idx" ON "AssessmentAttemptAnswer"("attemptId");

-- CreateIndex
CREATE INDEX "AssessmentAttemptAnswer_questionId_idx" ON "AssessmentAttemptAnswer"("questionId");

-- CreateIndex
CREATE INDEX "AssessmentAttemptAnswer_status_idx" ON "AssessmentAttemptAnswer"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentAttemptAnswer_attemptId_questionId_key" ON "AssessmentAttemptAnswer"("attemptId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentAttemptSession_attemptId_key" ON "AssessmentAttemptSession"("attemptId");

-- CreateIndex
CREATE INDEX "AssessmentAttemptSession_expiresAt_idx" ON "AssessmentAttemptSession"("expiresAt");

-- CreateIndex
CREATE INDEX "AssessmentAttemptSession_lastSeenAt_idx" ON "AssessmentAttemptSession"("lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentAttemptResult_attemptId_key" ON "AssessmentAttemptResult"("attemptId");

-- CreateIndex
CREATE INDEX "AssessmentAttemptResult_gradingStatus_idx" ON "AssessmentAttemptResult"("gradingStatus");

-- CreateIndex
CREATE INDEX "AssessmentAttemptResult_releasedAt_idx" ON "AssessmentAttemptResult"("releasedAt");

-- AddForeignKey
ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "AssessmentPublishedSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentAttemptAnswer" ADD CONSTRAINT "AssessmentAttemptAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "AssessmentAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentAttemptSession" ADD CONSTRAINT "AssessmentAttemptSession_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "AssessmentAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentAttemptResult" ADD CONSTRAINT "AssessmentAttemptResult_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "AssessmentAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
