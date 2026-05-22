-- CreateEnum
CREATE TYPE "MediaProcessingJobType" AS ENUM ('METADATA_EXTRACTION', 'THUMBNAIL_GENERATION', 'TRANSCODING');

-- CreateEnum
CREATE TYPE "MediaProcessingJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'RETRYING', 'DEAD');

-- CreateEnum
CREATE TYPE "MediaRenditionKind" AS ENUM ('THUMBNAIL', 'PREVIEW', 'TRANSCODED_VIDEO', 'TRANSCODED_AUDIO');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MediaAssetStatus" ADD VALUE 'UPLOADED';
ALTER TYPE "MediaAssetStatus" ADD VALUE 'PROCESSING_QUEUED';
ALTER TYPE "MediaAssetStatus" ADD VALUE 'PROCESSING';
ALTER TYPE "MediaAssetStatus" ADD VALUE 'PROCESSING_FAILED';

-- CreateTable
CREATE TABLE "MediaProcessingJob" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "mediaAssetId" UUID NOT NULL,
    "jobType" "MediaProcessingJobType" NOT NULL,
    "status" "MediaProcessingJobStatus" NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "runAfter" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaProcessingJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaRendition" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "mediaAssetId" UUID NOT NULL,
    "kind" "MediaRenditionKind" NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "durationSeconds" INTEGER,
    "storageKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaRendition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MediaProcessingJob_idempotencyKey_key" ON "MediaProcessingJob"("idempotencyKey");

-- CreateIndex
CREATE INDEX "MediaProcessingJob_workspaceId_idx" ON "MediaProcessingJob"("workspaceId");

-- CreateIndex
CREATE INDEX "MediaProcessingJob_mediaAssetId_idx" ON "MediaProcessingJob"("mediaAssetId");

-- CreateIndex
CREATE INDEX "MediaProcessingJob_status_runAfter_idx" ON "MediaProcessingJob"("status", "runAfter");

-- CreateIndex
CREATE UNIQUE INDEX "MediaRendition_storageKey_key" ON "MediaRendition"("storageKey");

-- CreateIndex
CREATE INDEX "MediaRendition_workspaceId_idx" ON "MediaRendition"("workspaceId");

-- CreateIndex
CREATE INDEX "MediaRendition_mediaAssetId_idx" ON "MediaRendition"("mediaAssetId");

-- AddForeignKey
ALTER TABLE "MediaProcessingJob" ADD CONSTRAINT "MediaProcessingJob_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaRendition" ADD CONSTRAINT "MediaRendition_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
