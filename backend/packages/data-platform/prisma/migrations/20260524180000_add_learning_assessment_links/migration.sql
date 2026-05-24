-- CreateEnum
CREATE TYPE "LearningAssessmentUnlockPolicy" AS ENUM ('IMMEDIATE', 'AFTER_LESSON_COMPLETE');

-- CreateTable
CREATE TABLE "LearningAssessmentLink" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "sectionId" UUID,
    "lessonId" UUID,
    "assessmentId" UUID NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL,
    "unlockPolicy" "LearningAssessmentUnlockPolicy" NOT NULL DEFAULT 'IMMEDIATE',
    "minimumScore" DOUBLE PRECISION,
    "createdByPrincipalId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningAssessmentLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LearningAssessmentLink_tenantId_idx" ON "LearningAssessmentLink"("tenantId");
CREATE INDEX "LearningAssessmentLink_workspaceId_idx" ON "LearningAssessmentLink"("workspaceId");
CREATE INDEX "LearningAssessmentLink_courseId_idx" ON "LearningAssessmentLink"("courseId");
CREATE INDEX "LearningAssessmentLink_sectionId_idx" ON "LearningAssessmentLink"("sectionId");
CREATE INDEX "LearningAssessmentLink_lessonId_idx" ON "LearningAssessmentLink"("lessonId");
CREATE INDEX "LearningAssessmentLink_assessmentId_idx" ON "LearningAssessmentLink"("assessmentId");
CREATE INDEX "LearningAssessmentLink_createdByPrincipalId_idx" ON "LearningAssessmentLink"("createdByPrincipalId");
CREATE INDEX "LearningAssessmentLink_workspaceId_courseId_idx" ON "LearningAssessmentLink"("workspaceId", "courseId");
CREATE INDEX "LearningAssessmentLink_workspaceId_lessonId_idx" ON "LearningAssessmentLink"("workspaceId", "lessonId");
CREATE INDEX "LearningAssessmentLink_workspaceId_assessmentId_idx" ON "LearningAssessmentLink"("workspaceId", "assessmentId");
CREATE INDEX "LearningAssessmentLink_workspaceId_courseId_position_idx" ON "LearningAssessmentLink"("workspaceId", "courseId", "position");

-- AddForeignKey
ALTER TABLE "LearningAssessmentLink" ADD CONSTRAINT "LearningAssessmentLink_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "LearningCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningAssessmentLink" ADD CONSTRAINT "LearningAssessmentLink_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "LearningSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LearningAssessmentLink" ADD CONSTRAINT "LearningAssessmentLink_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "LearningLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningAssessmentLink" ADD CONSTRAINT "LearningAssessmentLink_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
