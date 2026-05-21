-- CreateEnum
CREATE TYPE "AssessmentAnswerGradeStatus" AS ENUM ('NOT_GRADED', 'AUTO_GRADED', 'PENDING_MANUAL_REVIEW', 'MANUALLY_GRADED', 'GRADING_SKIPPED', 'GRADING_FAILED');

-- CreateEnum
CREATE TYPE "AssessmentGradingRunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'PARTIAL', 'FAILED');

-- CreateEnum
CREATE TYPE "AssessmentGradingMethod" AS ENUM ('AUTO_RULE', 'MANUAL_REVIEW', 'CODE_EXECUTION_RESERVED', 'AI_RESERVED');


-- CreateTable
CREATE TABLE "AssessmentGradingRun" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "attemptId" UUID NOT NULL,
    "assessmentId" UUID NOT NULL,
    "snapshotId" UUID NOT NULL,
    "triggeredByPrincipalId" UUID,
    "status" "AssessmentGradingRunStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "error" TEXT,
    "totalScore" DOUBLE PRECISION,
    "maxScore" DOUBLE PRECISION,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentGradingRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentAnswerGrade" (
    "id" UUID NOT NULL,
    "gradingRunId" UUID NOT NULL,
    "attemptId" UUID NOT NULL,
    "answerId" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "questionKind" "AssessmentQuestionKind" NOT NULL,
    "status" "AssessmentAnswerGradeStatus" NOT NULL DEFAULT 'NOT_GRADED',
    "method" "AssessmentGradingMethod" NOT NULL,
    "score" DOUBLE PRECISION,
    "maxScore" DOUBLE PRECISION NOT NULL,
    "feedback" JSONB,
    "gradedByPrincipalId" UUID,
    "gradedAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentAnswerGrade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssessmentGradingRun_tenantId_idx" ON "AssessmentGradingRun"("tenantId");

-- CreateIndex
CREATE INDEX "AssessmentGradingRun_workspaceId_idx" ON "AssessmentGradingRun"("workspaceId");

-- CreateIndex
CREATE INDEX "AssessmentGradingRun_attemptId_idx" ON "AssessmentGradingRun"("attemptId");

-- CreateIndex
CREATE INDEX "AssessmentGradingRun_assessmentId_idx" ON "AssessmentGradingRun"("assessmentId");

-- CreateIndex
CREATE INDEX "AssessmentGradingRun_snapshotId_idx" ON "AssessmentGradingRun"("snapshotId");

-- CreateIndex
CREATE INDEX "AssessmentGradingRun_status_idx" ON "AssessmentGradingRun"("status");

-- CreateIndex
CREATE INDEX "AssessmentGradingRun_startedAt_idx" ON "AssessmentGradingRun"("startedAt");

-- CreateIndex
CREATE INDEX "AssessmentGradingRun_completedAt_idx" ON "AssessmentGradingRun"("completedAt");

-- CreateIndex
CREATE INDEX "AssessmentGradingRun_failedAt_idx" ON "AssessmentGradingRun"("failedAt");

-- CreateIndex
CREATE INDEX "AssessmentGradingRun_workspaceId_status_idx" ON "AssessmentGradingRun"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "AssessmentGradingRun_attemptId_startedAt_idx" ON "AssessmentGradingRun"("attemptId", "startedAt");

-- CreateIndex
CREATE INDEX "AssessmentAnswerGrade_gradingRunId_idx" ON "AssessmentAnswerGrade"("gradingRunId");

-- CreateIndex
CREATE INDEX "AssessmentAnswerGrade_attemptId_idx" ON "AssessmentAnswerGrade"("attemptId");

-- CreateIndex
CREATE INDEX "AssessmentAnswerGrade_answerId_idx" ON "AssessmentAnswerGrade"("answerId");

-- CreateIndex
CREATE INDEX "AssessmentAnswerGrade_questionId_idx" ON "AssessmentAnswerGrade"("questionId");

-- CreateIndex
CREATE INDEX "AssessmentAnswerGrade_status_idx" ON "AssessmentAnswerGrade"("status");

-- CreateIndex
CREATE INDEX "AssessmentAnswerGrade_method_idx" ON "AssessmentAnswerGrade"("method");

-- CreateIndex
CREATE INDEX "AssessmentAnswerGrade_gradedAt_idx" ON "AssessmentAnswerGrade"("gradedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentAnswerGrade_gradingRunId_answerId_key" ON "AssessmentAnswerGrade"("gradingRunId", "answerId");


-- AddForeignKey
ALTER TABLE "AssessmentGradingRun" ADD CONSTRAINT "AssessmentGradingRun_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "AssessmentAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentAnswerGrade" ADD CONSTRAINT "AssessmentAnswerGrade_gradingRunId_fkey" FOREIGN KEY ("gradingRunId") REFERENCES "AssessmentGradingRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentAnswerGrade" ADD CONSTRAINT "AssessmentAnswerGrade_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "AssessmentAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentAnswerGrade" ADD CONSTRAINT "AssessmentAnswerGrade_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "AssessmentAttemptAnswer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
