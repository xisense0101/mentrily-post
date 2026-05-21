-- Migration: add_learning_delivery (Task 008B)
-- This migration creates learning delivery tables and enums.

BEGIN;

-- Enums
DO $$ BEGIN
    CREATE TYPE "LearningCourseStatus" AS ENUM ('DRAFT','PUBLISHED','ARCHIVED');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
    CREATE TYPE "LearningVisibility" AS ENUM ('PRIVATE','WORKSPACE','PUBLIC','UNLISTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
    CREATE TYPE "LearningContentKind" AS ENUM ('TEXT','VIDEO','EMBED','FILE','LIVE_SESSION','EXTERNAL_LINK');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
    CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE','COMPLETED','CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
    CREATE TYPE "LearningProgressStatus" AS ENUM ('NOT_STARTED','IN_PROGRESS','COMPLETED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Tables
CREATE TABLE IF NOT EXISTS "LearningCourse" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL,
  "workspaceId" uuid NOT NULL,
  "creatorPrincipalId" uuid NOT NULL,
  "title" text NOT NULL,
  "slug" text NOT NULL,
  "description" text,
  "status" "LearningCourseStatus" NOT NULL DEFAULT 'DRAFT',
  "visibility" "LearningVisibility" NOT NULL DEFAULT 'WORKSPACE',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "publishedAt" timestamptz,
  "archivedAt" timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS "LearningCourse_workspace_slug_unique" ON "LearningCourse" ("workspaceId","slug");
CREATE INDEX IF NOT EXISTS "LearningCourse_tenant_idx" ON "LearningCourse" ("tenantId");

CREATE TABLE IF NOT EXISTS "LearningSection" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "courseId" uuid NOT NULL,
  "title" text NOT NULL,
  "position" integer NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "LearningSection_course_position_unique" ON "LearningSection" ("courseId","position");

CREATE TABLE IF NOT EXISTS "LearningLesson" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "sectionId" uuid NOT NULL,
  "title" text NOT NULL,
  "kind" "LearningContentKind" NOT NULL,
  "position" integer NOT NULL,
  "estimatedMinutes" integer,
  "contentRef" text,
  "isRequired" boolean NOT NULL DEFAULT true,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "LearningLesson_section_position_unique" ON "LearningLesson" ("sectionId","position");

CREATE TABLE IF NOT EXISTS "LearningEnrollment" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL,
  "workspaceId" uuid NOT NULL,
  "courseId" uuid NOT NULL,
  "learnerPrincipalId" uuid NOT NULL,
  "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
  "enrolledAt" timestamptz NOT NULL DEFAULT now(),
  "startedAt" timestamptz,
  "completedAt" timestamptz,
  "cancelledAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "LearningEnrollment_ws_course_learner_unique" ON "LearningEnrollment" ("workspaceId","courseId","learnerPrincipalId");

CREATE TABLE IF NOT EXISTS "LearningProgress" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL,
  "workspaceId" uuid NOT NULL,
  "courseId" uuid NOT NULL,
  "enrollmentId" uuid NOT NULL,
  "lessonId" uuid NOT NULL,
  "learnerPrincipalId" uuid NOT NULL,
  "status" "LearningProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "startedAt" timestamptz,
  "completedAt" timestamptz,
  "lastSeenAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "LearningProgress_enrollment_lesson_unique" ON "LearningProgress" ("enrollmentId","lessonId");

COMMIT;
