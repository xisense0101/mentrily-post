-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "channel" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotificationPreference_tenantId_idx" ON "NotificationPreference"("tenantId");

-- CreateIndex
CREATE INDEX "NotificationPreference_workspaceId_idx" ON "NotificationPreference"("workspaceId");

-- CreateIndex
CREATE INDEX "NotificationPreference_userId_idx" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_workspaceId_userId_channel_category_key" ON "NotificationPreference"("workspaceId", "userId", "channel", "category");
