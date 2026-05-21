BEGIN;

DO $$ BEGIN
  ALTER TABLE "LearningSection"
    ADD CONSTRAINT "LearningSection_courseId_fkey"
    FOREIGN KEY ("courseId") REFERENCES "LearningCourse"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "LearningLesson"
    ADD CONSTRAINT "LearningLesson_sectionId_fkey"
    FOREIGN KEY ("sectionId") REFERENCES "LearningSection"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "LearningEnrollment"
    ADD CONSTRAINT "LearningEnrollment_courseId_fkey"
    FOREIGN KEY ("courseId") REFERENCES "LearningCourse"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "LearningProgress"
    ADD CONSTRAINT "LearningProgress_enrollmentId_fkey"
    FOREIGN KEY ("enrollmentId") REFERENCES "LearningEnrollment"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS "LearningCourse_workspaceId_idx" ON "LearningCourse"("workspaceId");
CREATE INDEX IF NOT EXISTS "LearningCourse_creatorPrincipalId_idx" ON "LearningCourse"("creatorPrincipalId");
CREATE INDEX IF NOT EXISTS "LearningCourse_status_idx" ON "LearningCourse"("status");
CREATE INDEX IF NOT EXISTS "LearningCourse_visibility_idx" ON "LearningCourse"("visibility");
CREATE INDEX IF NOT EXISTS "LearningCourse_createdAt_idx" ON "LearningCourse"("createdAt");
CREATE INDEX IF NOT EXISTS "LearningCourse_publishedAt_idx" ON "LearningCourse"("publishedAt");

CREATE INDEX IF NOT EXISTS "LearningSection_courseId_idx" ON "LearningSection"("courseId");
CREATE INDEX IF NOT EXISTS "LearningSection_position_idx" ON "LearningSection"("position");

CREATE INDEX IF NOT EXISTS "LearningLesson_sectionId_idx" ON "LearningLesson"("sectionId");
CREATE INDEX IF NOT EXISTS "LearningLesson_kind_idx" ON "LearningLesson"("kind");
CREATE INDEX IF NOT EXISTS "LearningLesson_isRequired_idx" ON "LearningLesson"("isRequired");
CREATE INDEX IF NOT EXISTS "LearningLesson_position_idx" ON "LearningLesson"("position");

CREATE INDEX IF NOT EXISTS "LearningEnrollment_tenantId_idx" ON "LearningEnrollment"("tenantId");
CREATE INDEX IF NOT EXISTS "LearningEnrollment_workspaceId_idx" ON "LearningEnrollment"("workspaceId");
CREATE INDEX IF NOT EXISTS "LearningEnrollment_courseId_idx" ON "LearningEnrollment"("courseId");
CREATE INDEX IF NOT EXISTS "LearningEnrollment_learnerPrincipalId_idx" ON "LearningEnrollment"("learnerPrincipalId");
CREATE INDEX IF NOT EXISTS "LearningEnrollment_status_idx" ON "LearningEnrollment"("status");
CREATE INDEX IF NOT EXISTS "LearningEnrollment_enrolledAt_idx" ON "LearningEnrollment"("enrolledAt");
CREATE INDEX IF NOT EXISTS "LearningEnrollment_completedAt_idx" ON "LearningEnrollment"("completedAt");

CREATE INDEX IF NOT EXISTS "LearningProgress_tenantId_idx" ON "LearningProgress"("tenantId");
CREATE INDEX IF NOT EXISTS "LearningProgress_workspaceId_idx" ON "LearningProgress"("workspaceId");
CREATE INDEX IF NOT EXISTS "LearningProgress_courseId_idx" ON "LearningProgress"("courseId");
CREATE INDEX IF NOT EXISTS "LearningProgress_enrollmentId_idx" ON "LearningProgress"("enrollmentId");
CREATE INDEX IF NOT EXISTS "LearningProgress_lessonId_idx" ON "LearningProgress"("lessonId");
CREATE INDEX IF NOT EXISTS "LearningProgress_learnerPrincipalId_idx" ON "LearningProgress"("learnerPrincipalId");
CREATE INDEX IF NOT EXISTS "LearningProgress_status_idx" ON "LearningProgress"("status");
CREATE INDEX IF NOT EXISTS "LearningProgress_completedAt_idx" ON "LearningProgress"("completedAt");
CREATE INDEX IF NOT EXISTS "LearningProgress_lastSeenAt_idx" ON "LearningProgress"("lastSeenAt");

COMMIT;
