-- DropForeignKey
ALTER TABLE "LearningEnrollment" DROP CONSTRAINT "LearningEnrollment_courseId_fkey";

-- DropForeignKey
ALTER TABLE "LearningLesson" DROP CONSTRAINT "LearningLesson_sectionId_fkey";

-- DropForeignKey
ALTER TABLE "LearningProgress" DROP CONSTRAINT "LearningProgress_enrollmentId_fkey";

-- DropForeignKey
ALTER TABLE "LearningSection" DROP CONSTRAINT "LearningSection_courseId_fkey";

-- AlterTable
ALTER TABLE "LearningCourse" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "publishedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "archivedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "LearningEnrollment" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "enrolledAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "startedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "completedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "cancelledAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "LearningLesson" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "LearningProgress" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "startedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "completedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "lastSeenAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "LearningSection" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "LearningSection" ADD CONSTRAINT "LearningSection_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "LearningCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningLesson" ADD CONSTRAINT "LearningLesson_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "LearningSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningEnrollment" ADD CONSTRAINT "LearningEnrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "LearningCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningProgress" ADD CONSTRAINT "LearningProgress_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "LearningEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "LearningCourse_tenant_idx" RENAME TO "LearningCourse_tenantId_idx";

-- RenameIndex
ALTER INDEX "LearningCourse_workspace_slug_unique" RENAME TO "LearningCourse_workspaceId_slug_key";

-- RenameIndex
ALTER INDEX "LearningEnrollment_ws_course_learner_unique" RENAME TO "LearningEnrollment_workspaceId_courseId_learnerPrincipalId_key";

-- RenameIndex
ALTER INDEX "LearningLesson_section_position_unique" RENAME TO "LearningLesson_sectionId_position_key";

-- RenameIndex
ALTER INDEX "LearningProgress_enrollment_lesson_unique" RENAME TO "LearningProgress_enrollmentId_lessonId_key";

-- RenameIndex
ALTER INDEX "LearningSection_course_position_unique" RENAME TO "LearningSection_courseId_position_key";
