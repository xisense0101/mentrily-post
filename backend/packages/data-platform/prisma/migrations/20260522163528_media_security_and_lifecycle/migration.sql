-- CreateEnum
CREATE TYPE "MediaScanStatus" AS ENUM ('UNSCANNED', 'SCAN_QUEUED', 'SCANNING', 'CLEAN', 'SUSPICIOUS', 'INFECTED', 'QUARANTINED', 'SCAN_FAILED');

-- CreateEnum
CREATE TYPE "MediaLifecycleJobType" AS ENUM ('EXPIRE_UPLOAD', 'DELETE_ASSET', 'DELETE_RENDITION', 'CLEAN_FAILED', 'CLEAN_ORPHANED');

-- CreateEnum
CREATE TYPE "MediaLifecycleJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'RETRYING', 'DEAD');

-- CreateEnum
CREATE TYPE "MediaSecurityScanJobStatus" AS ENUM ('QUEUED', 'SCANNING', 'CLEAN', 'INFECTED', 'FAILED', 'RETRYING', 'DEAD');

-- CreateEnum
CREATE TYPE "MediaSecurityScannerProvider" AS ENUM ('NOOP', 'FIXTURE', 'CLAMAV_RESERVED', 'EXTERNAL_RESERVED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MediaAssetStatus" ADD VALUE 'ABANDONED';
ALTER TYPE "MediaAssetStatus" ADD VALUE 'DELETE_QUEUED';
ALTER TYPE "MediaAssetStatus" ADD VALUE 'DELETED';

-- AlterTable
ALTER TABLE "MediaAsset" ADD COLUMN     "deleteAfter" TIMESTAMP(3),
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "quarantineReason" TEXT,
ADD COLUMN     "quarantinedAt" TIMESTAMP(3),
ADD COLUMN     "scanErrorCode" TEXT,
ADD COLUMN     "scanErrorMessage" TEXT,
ADD COLUMN     "scanStatus" "MediaScanStatus" NOT NULL DEFAULT 'UNSCANNED',
ADD COLUMN     "scannedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "MediaSecurityScanJob" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "mediaAssetId" UUID NOT NULL,
    "status" "MediaSecurityScanJobStatus" NOT NULL DEFAULT 'QUEUED',
    "scannerProvider" "MediaSecurityScannerProvider" NOT NULL DEFAULT 'NOOP',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "runAfter" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "resultCode" TEXT,
    "resultMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaSecurityScanJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaLifecycleJob" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "mediaAssetId" UUID,
    "jobType" "MediaLifecycleJobType" NOT NULL,
    "status" "MediaLifecycleJobStatus" NOT NULL DEFAULT 'QUEUED',
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

    CONSTRAINT "MediaLifecycleJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MediaSecurityScanJob_idempotencyKey_key" ON "MediaSecurityScanJob"("idempotencyKey");

-- CreateIndex
CREATE INDEX "MediaSecurityScanJob_workspaceId_idx" ON "MediaSecurityScanJob"("workspaceId");

-- CreateIndex
CREATE INDEX "MediaSecurityScanJob_mediaAssetId_idx" ON "MediaSecurityScanJob"("mediaAssetId");

-- CreateIndex
CREATE INDEX "MediaSecurityScanJob_status_runAfter_idx" ON "MediaSecurityScanJob"("status", "runAfter");

-- CreateIndex
CREATE UNIQUE INDEX "MediaLifecycleJob_idempotencyKey_key" ON "MediaLifecycleJob"("idempotencyKey");

-- CreateIndex
CREATE INDEX "MediaLifecycleJob_workspaceId_idx" ON "MediaLifecycleJob"("workspaceId");

-- CreateIndex
CREATE INDEX "MediaLifecycleJob_mediaAssetId_idx" ON "MediaLifecycleJob"("mediaAssetId");

-- CreateIndex
CREATE INDEX "MediaLifecycleJob_status_runAfter_idx" ON "MediaLifecycleJob"("status", "runAfter");

-- AddForeignKey
ALTER TABLE "MediaSecurityScanJob" ADD CONSTRAINT "MediaSecurityScanJob_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaLifecycleJob" ADD CONSTRAINT "MediaLifecycleJob_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
