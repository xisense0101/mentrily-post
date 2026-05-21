-- CreateEnum
CREATE TYPE "AssessmentPurpose" AS ENUM ('QUIZ', 'EXAM', 'PRACTICE', 'ASSIGNMENT', 'PLACEMENT_TEST', 'CERTIFICATION');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AssessmentVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED_SNAPSHOT', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "AssessmentVisibility" AS ENUM ('PRIVATE', 'WORKSPACE', 'PUBLIC_LINK', 'INVITE_ONLY');

-- CreateEnum
CREATE TYPE "AssessmentQuestionKind" AS ENUM ('MCQ', 'MULTI_SELECT', 'TRUE_FALSE', 'SHORT_ANSWER', 'LONG_ANSWER', 'CODE', 'NOTEBOOK', 'READING_PASSAGE', 'FILE_UPLOAD', 'RUBRIC_ONLY');

-- CreateEnum
CREATE TYPE "AssessmentGradingMode" AS ENUM ('AUTO', 'MANUAL', 'HYBRID');

-- CreateEnum
CREATE TYPE "AssessmentResultReleasePolicy" AS ENUM ('IMMEDIATE', 'AFTER_DUE_DATE', 'AFTER_MANUAL_REVIEW', 'MANUAL_RELEASE');


-- CreateTable
CREATE TABLE "Assessment" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "ownerPrincipalId" UUID NOT NULL,
    "purpose" "AssessmentPurpose" NOT NULL,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'DRAFT',
    "visibility" "AssessmentVisibility" NOT NULL DEFAULT 'WORKSPACE',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "currentDraftVersionId" UUID,
    "publishedSnapshotId" UUID,
    "attemptPolicy" JSONB NOT NULL,
    "timeLimitMinutes" INTEGER,
    "resultReleasePolicy" "AssessmentResultReleasePolicy" NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentVersion" (
    "id" UUID NOT NULL,
    "assessmentId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" "AssessmentVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "createdByPrincipalId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "supersededAt" TIMESTAMP(3),

    CONSTRAINT "AssessmentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentSection" (
    "id" UUID NOT NULL,
    "assessmentId" UUID NOT NULL,
    "versionId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentQuestion" (
    "id" UUID NOT NULL,
    "assessmentId" UUID NOT NULL,
    "versionId" UUID NOT NULL,
    "sectionId" UUID,
    "kind" "AssessmentQuestionKind" NOT NULL,
    "title" TEXT NOT NULL,
    "prompt" JSONB NOT NULL,
    "options" JSONB NOT NULL,
    "answerKey" JSONB,
    "points" DOUBLE PRECISION NOT NULL,
    "gradingMode" "AssessmentGradingMode" NOT NULL,
    "position" INTEGER NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentGradingRubric" (
    "id" UUID NOT NULL,
    "assessmentId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "criteria" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentGradingRubric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentGradingRule" (
    "id" UUID NOT NULL,
    "assessmentId" UUID NOT NULL,
    "questionId" UUID,
    "mode" "AssessmentGradingMode" NOT NULL,
    "ruleType" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentGradingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentPublishedSnapshot" (
    "id" UUID NOT NULL,
    "assessmentId" UUID NOT NULL,
    "versionId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "sections" JSONB NOT NULL,
    "looseQuestions" JSONB NOT NULL,
    "publishedByPrincipalId" UUID NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssessmentPublishedSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Assessment_currentDraftVersionId_key" ON "Assessment"("currentDraftVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "Assessment_publishedSnapshotId_key" ON "Assessment"("publishedSnapshotId");

-- CreateIndex
CREATE INDEX "Assessment_tenantId_idx" ON "Assessment"("tenantId");

-- CreateIndex
CREATE INDEX "Assessment_workspaceId_idx" ON "Assessment"("workspaceId");

-- CreateIndex
CREATE INDEX "Assessment_ownerPrincipalId_idx" ON "Assessment"("ownerPrincipalId");

-- CreateIndex
CREATE INDEX "Assessment_purpose_idx" ON "Assessment"("purpose");

-- CreateIndex
CREATE INDEX "Assessment_status_idx" ON "Assessment"("status");

-- CreateIndex
CREATE INDEX "Assessment_visibility_idx" ON "Assessment"("visibility");

-- CreateIndex
CREATE INDEX "Assessment_createdAt_idx" ON "Assessment"("createdAt");

-- CreateIndex
CREATE INDEX "Assessment_publishedAt_idx" ON "Assessment"("publishedAt");

-- CreateIndex
CREATE INDEX "Assessment_archivedAt_idx" ON "Assessment"("archivedAt");

-- CreateIndex
CREATE INDEX "AssessmentVersion_assessmentId_idx" ON "AssessmentVersion"("assessmentId");

-- CreateIndex
CREATE INDEX "AssessmentVersion_status_idx" ON "AssessmentVersion"("status");

-- CreateIndex
CREATE INDEX "AssessmentVersion_createdByPrincipalId_idx" ON "AssessmentVersion"("createdByPrincipalId");

-- CreateIndex
CREATE INDEX "AssessmentVersion_createdAt_idx" ON "AssessmentVersion"("createdAt");

-- CreateIndex
CREATE INDEX "AssessmentVersion_publishedAt_idx" ON "AssessmentVersion"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentVersion_assessmentId_versionNumber_key" ON "AssessmentVersion"("assessmentId", "versionNumber");

-- CreateIndex
CREATE INDEX "AssessmentSection_assessmentId_idx" ON "AssessmentSection"("assessmentId");

-- CreateIndex
CREATE INDEX "AssessmentSection_versionId_idx" ON "AssessmentSection"("versionId");

-- CreateIndex
CREATE INDEX "AssessmentSection_position_idx" ON "AssessmentSection"("position");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentSection_versionId_id_key" ON "AssessmentSection"("versionId", "id");

-- CreateIndex
CREATE INDEX "AssessmentQuestion_assessmentId_idx" ON "AssessmentQuestion"("assessmentId");

-- CreateIndex
CREATE INDEX "AssessmentQuestion_versionId_idx" ON "AssessmentQuestion"("versionId");

-- CreateIndex
CREATE INDEX "AssessmentQuestion_sectionId_idx" ON "AssessmentQuestion"("sectionId");

-- CreateIndex
CREATE INDEX "AssessmentQuestion_kind_idx" ON "AssessmentQuestion"("kind");

-- CreateIndex
CREATE INDEX "AssessmentQuestion_gradingMode_idx" ON "AssessmentQuestion"("gradingMode");

-- CreateIndex
CREATE INDEX "AssessmentQuestion_position_idx" ON "AssessmentQuestion"("position");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentQuestion_versionId_id_key" ON "AssessmentQuestion"("versionId", "id");

-- CreateIndex
CREATE INDEX "AssessmentGradingRubric_assessmentId_idx" ON "AssessmentGradingRubric"("assessmentId");

-- CreateIndex
CREATE INDEX "AssessmentGradingRubric_title_idx" ON "AssessmentGradingRubric"("title");

-- CreateIndex
CREATE INDEX "AssessmentGradingRule_assessmentId_idx" ON "AssessmentGradingRule"("assessmentId");

-- CreateIndex
CREATE INDEX "AssessmentGradingRule_questionId_idx" ON "AssessmentGradingRule"("questionId");

-- CreateIndex
CREATE INDEX "AssessmentGradingRule_mode_idx" ON "AssessmentGradingRule"("mode");

-- CreateIndex
CREATE INDEX "AssessmentGradingRule_ruleType_idx" ON "AssessmentGradingRule"("ruleType");

-- CreateIndex
CREATE INDEX "AssessmentPublishedSnapshot_assessmentId_idx" ON "AssessmentPublishedSnapshot"("assessmentId");

-- CreateIndex
CREATE INDEX "AssessmentPublishedSnapshot_versionId_idx" ON "AssessmentPublishedSnapshot"("versionId");

-- CreateIndex
CREATE INDEX "AssessmentPublishedSnapshot_versionNumber_idx" ON "AssessmentPublishedSnapshot"("versionNumber");

-- CreateIndex
CREATE INDEX "AssessmentPublishedSnapshot_publishedAt_idx" ON "AssessmentPublishedSnapshot"("publishedAt");

-- CreateIndex
CREATE INDEX "AssessmentPublishedSnapshot_publishedByPrincipalId_idx" ON "AssessmentPublishedSnapshot"("publishedByPrincipalId");


-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_currentDraftVersionId_fkey" FOREIGN KEY ("currentDraftVersionId") REFERENCES "AssessmentVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_publishedSnapshotId_fkey" FOREIGN KEY ("publishedSnapshotId") REFERENCES "AssessmentPublishedSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentVersion" ADD CONSTRAINT "AssessmentVersion_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentSection" ADD CONSTRAINT "AssessmentSection_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentSection" ADD CONSTRAINT "AssessmentSection_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "AssessmentVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentQuestion" ADD CONSTRAINT "AssessmentQuestion_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentQuestion" ADD CONSTRAINT "AssessmentQuestion_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "AssessmentVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentQuestion" ADD CONSTRAINT "AssessmentQuestion_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "AssessmentSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentGradingRubric" ADD CONSTRAINT "AssessmentGradingRubric_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentGradingRule" ADD CONSTRAINT "AssessmentGradingRule_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentPublishedSnapshot" ADD CONSTRAINT "AssessmentPublishedSnapshot_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentPublishedSnapshot" ADD CONSTRAINT "AssessmentPublishedSnapshot_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "AssessmentVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
