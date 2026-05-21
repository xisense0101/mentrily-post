-- CreateEnum
CREATE TYPE "ContentDocumentPurpose" AS ENUM ('COURSE_CONTENT', 'LESSON_CONTENT', 'ASSESSMENT_CONTENT_RESERVED', 'QUESTION_CONTENT_RESERVED', 'GENERAL_PAGE');

-- CreateEnum
CREATE TYPE "ContentDocumentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ContentVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED_SNAPSHOT', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "BlockContentKind" AS ENUM ('PARAGRAPH', 'HEADING', 'SUBHEADING', 'BULLET_LIST', 'NUMBERED_LIST', 'QUOTE', 'CALLOUT', 'DIVIDER', 'IMAGE', 'VIDEO', 'EMBED', 'FILE', 'LINK', 'CODE', 'LESSON_REFERENCE', 'SECTION_REFERENCE', 'AI_PROMPT_PLACEHOLDER', 'MCQ_QUESTION', 'MULTI_SELECT_QUESTION', 'CODE_QUESTION', 'READING_PASSAGE', 'RUBRIC', 'GRADING_RULE', 'NOTEBOOK_PROMPT');

-- CreateTable
CREATE TABLE "ContentDocument" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "ownerPrincipalId" UUID NOT NULL,
    "purpose" "ContentDocumentPurpose" NOT NULL,
    "status" "ContentDocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "currentDraftVersionId" UUID,
    "publishedSnapshotId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "ContentDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentVersion" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" "ContentVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "createdByPrincipalId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "supersededAt" TIMESTAMP(3),

    CONSTRAINT "ContentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentBlock" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "versionId" UUID NOT NULL,
    "parentBlockId" UUID,
    "kind" "BlockContentKind" NOT NULL,
    "position" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentPublishedSnapshot" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "versionId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "blocks" JSONB NOT NULL,
    "publishedByPrincipalId" UUID NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentPublishedSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContentDocument_currentDraftVersionId_key" ON "ContentDocument"("currentDraftVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentDocument_publishedSnapshotId_key" ON "ContentDocument"("publishedSnapshotId");

-- CreateIndex
CREATE INDEX "ContentDocument_tenantId_idx" ON "ContentDocument"("tenantId");

-- CreateIndex
CREATE INDEX "ContentDocument_workspaceId_idx" ON "ContentDocument"("workspaceId");

-- CreateIndex
CREATE INDEX "ContentDocument_ownerPrincipalId_idx" ON "ContentDocument"("ownerPrincipalId");

-- CreateIndex
CREATE INDEX "ContentDocument_purpose_idx" ON "ContentDocument"("purpose");

-- CreateIndex
CREATE INDEX "ContentDocument_status_idx" ON "ContentDocument"("status");

-- CreateIndex
CREATE INDEX "ContentDocument_createdAt_idx" ON "ContentDocument"("createdAt");

-- CreateIndex
CREATE INDEX "ContentDocument_publishedAt_idx" ON "ContentDocument"("publishedAt");

-- CreateIndex
CREATE INDEX "ContentVersion_documentId_idx" ON "ContentVersion"("documentId");

-- CreateIndex
CREATE INDEX "ContentVersion_status_idx" ON "ContentVersion"("status");

-- CreateIndex
CREATE INDEX "ContentVersion_createdByPrincipalId_idx" ON "ContentVersion"("createdByPrincipalId");

-- CreateIndex
CREATE INDEX "ContentVersion_createdAt_idx" ON "ContentVersion"("createdAt");

-- CreateIndex
CREATE INDEX "ContentVersion_publishedAt_idx" ON "ContentVersion"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContentVersion_documentId_versionNumber_key" ON "ContentVersion"("documentId", "versionNumber");

-- CreateIndex
CREATE INDEX "ContentBlock_documentId_idx" ON "ContentBlock"("documentId");

-- CreateIndex
CREATE INDEX "ContentBlock_versionId_idx" ON "ContentBlock"("versionId");

-- CreateIndex
CREATE INDEX "ContentBlock_parentBlockId_idx" ON "ContentBlock"("parentBlockId");

-- CreateIndex
CREATE INDEX "ContentBlock_kind_idx" ON "ContentBlock"("kind");

-- CreateIndex
CREATE INDEX "ContentBlock_position_idx" ON "ContentBlock"("position");

-- CreateIndex
CREATE INDEX "ContentBlock_path_idx" ON "ContentBlock"("path");

-- CreateIndex
CREATE UNIQUE INDEX "ContentBlock_versionId_id_key" ON "ContentBlock"("versionId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ContentBlock_versionId_path_key" ON "ContentBlock"("versionId", "path");

-- CreateIndex
CREATE INDEX "ContentPublishedSnapshot_documentId_idx" ON "ContentPublishedSnapshot"("documentId");

-- CreateIndex
CREATE INDEX "ContentPublishedSnapshot_versionId_idx" ON "ContentPublishedSnapshot"("versionId");

-- CreateIndex
CREATE INDEX "ContentPublishedSnapshot_versionNumber_idx" ON "ContentPublishedSnapshot"("versionNumber");

-- CreateIndex
CREATE INDEX "ContentPublishedSnapshot_publishedAt_idx" ON "ContentPublishedSnapshot"("publishedAt");

-- CreateIndex
CREATE INDEX "ContentPublishedSnapshot_publishedByPrincipalId_idx" ON "ContentPublishedSnapshot"("publishedByPrincipalId");

-- AddForeignKey
ALTER TABLE "ContentDocument" ADD CONSTRAINT "ContentDocument_currentDraftVersionId_fkey" FOREIGN KEY ("currentDraftVersionId") REFERENCES "ContentVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentDocument" ADD CONSTRAINT "ContentDocument_publishedSnapshotId_fkey" FOREIGN KEY ("publishedSnapshotId") REFERENCES "ContentPublishedSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentVersion" ADD CONSTRAINT "ContentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ContentDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentBlock" ADD CONSTRAINT "ContentBlock_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ContentDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentBlock" ADD CONSTRAINT "ContentBlock_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "ContentVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentPublishedSnapshot" ADD CONSTRAINT "ContentPublishedSnapshot_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ContentDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentPublishedSnapshot" ADD CONSTRAINT "ContentPublishedSnapshot_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "ContentVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
