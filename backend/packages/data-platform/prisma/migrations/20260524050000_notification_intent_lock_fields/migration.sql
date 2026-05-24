-- AlterTable
ALTER TABLE "NotificationIntent" ADD COLUMN "lockedAt" TIMESTAMP(3),
ADD COLUMN "lockedBy" TEXT;
