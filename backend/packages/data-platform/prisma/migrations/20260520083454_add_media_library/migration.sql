-- CreateEnum
CREATE TYPE "MediaAssetStatus" AS ENUM ('PENDING_UPLOAD', 'AVAILABLE', 'ARCHIVED', 'FAILED');

-- CreateEnum
CREATE TYPE "MediaUploadIntentStatus" AS ENUM ('PENDING', 'COMPLETED', 'EXPIRED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "MediaAssetVisibility" AS ENUM ('PRIVATE', 'WORKSPACE');

-- CreateEnum
CREATE TYPE "MediaFileCategory" AS ENUM ('DOCUMENT', 'IMAGE', 'VIDEO', 'AUDIO', 'ARCHIVE', 'OTHER');

-- CreateEnum
CREATE TYPE "MediaStorageProvider" AS ENUM ('FIXTURE', 'S3_COMPATIBLE_RESERVED');

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "ownerPrincipalId" UUID NOT NULL,
    "filename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "fileCategory" "MediaFileCategory" NOT NULL,
    "sizeBytes" BIGINT,
    "checksumSha256" TEXT,
    "storageProvider" "MediaStorageProvider" NOT NULL,
    "objectKey" TEXT NOT NULL,
    "visibility" "MediaAssetVisibility" NOT NULL DEFAULT 'PRIVATE',
    "status" "MediaAssetStatus" NOT NULL DEFAULT 'PENDING_UPLOAD',
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaUploadIntent" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "ownerPrincipalId" UUID NOT NULL,
    "objectKey" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "fileCategory" "MediaFileCategory" NOT NULL,
    "maxSizeBytes" BIGINT NOT NULL,
    "status" "MediaUploadIntentStatus" NOT NULL DEFAULT 'PENDING',
    "uploadUrl" TEXT NOT NULL,
    "uploadMethod" TEXT NOT NULL,
    "headers" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL,

    CONSTRAINT "MediaUploadIntent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_objectKey_key" ON "MediaAsset"("objectKey");

-- CreateIndex
CREATE INDEX "MediaAsset_tenantId_idx" ON "MediaAsset"("tenantId");

-- CreateIndex
CREATE INDEX "MediaAsset_workspaceId_idx" ON "MediaAsset"("workspaceId");

-- CreateIndex
CREATE INDEX "MediaAsset_ownerPrincipalId_idx" ON "MediaAsset"("ownerPrincipalId");

-- CreateIndex
CREATE INDEX "MediaAsset_status_idx" ON "MediaAsset"("status");

-- CreateIndex
CREATE INDEX "MediaAsset_fileCategory_idx" ON "MediaAsset"("fileCategory");

-- CreateIndex
CREATE INDEX "MediaAsset_createdAt_idx" ON "MediaAsset"("createdAt");

-- CreateIndex
CREATE INDEX "MediaAsset_workspaceId_status_idx" ON "MediaAsset"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "MediaAsset_workspaceId_ownerPrincipalId_idx" ON "MediaAsset"("workspaceId", "ownerPrincipalId");

-- CreateIndex
CREATE INDEX "MediaUploadIntent_tenantId_idx" ON "MediaUploadIntent"("tenantId");

-- CreateIndex
CREATE INDEX "MediaUploadIntent_workspaceId_idx" ON "MediaUploadIntent"("workspaceId");

-- CreateIndex
CREATE INDEX "MediaUploadIntent_assetId_idx" ON "MediaUploadIntent"("assetId");

-- CreateIndex
CREATE INDEX "MediaUploadIntent_ownerPrincipalId_idx" ON "MediaUploadIntent"("ownerPrincipalId");

-- CreateIndex
CREATE INDEX "MediaUploadIntent_status_idx" ON "MediaUploadIntent"("status");

-- CreateIndex
CREATE INDEX "MediaUploadIntent_expiresAt_idx" ON "MediaUploadIntent"("expiresAt");

-- CreateIndex
CREATE INDEX "MediaUploadIntent_workspaceId_ownerPrincipalId_idx" ON "MediaUploadIntent"("workspaceId", "ownerPrincipalId");

-- CreateIndex
CREATE INDEX "MediaUploadIntent_assetId_status_idx" ON "MediaUploadIntent"("assetId", "status");

-- AddForeignKey
ALTER TABLE "MediaUploadIntent" ADD CONSTRAINT "MediaUploadIntent_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
