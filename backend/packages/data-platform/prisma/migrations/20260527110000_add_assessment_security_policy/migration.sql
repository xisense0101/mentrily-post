-- CreateTable
CREATE TABLE "AssessmentSecurityPolicy" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "assessmentId" UUID NOT NULL,
    "proctoringMode" "AssessmentProctoringMode" NOT NULL DEFAULT 'OFF',
    "requireDisclosureAcknowledgement" BOOLEAN NOT NULL DEFAULT true,
    "requireFullscreen" BOOLEAN NOT NULL DEFAULT false,
    "trackFocusChanges" BOOLEAN NOT NULL DEFAULT true,
    "trackVisibilityChanges" BOOLEAN NOT NULL DEFAULT true,
    "trackFullscreenChanges" BOOLEAN NOT NULL DEFAULT true,
    "trackCopyPasteAttempts" BOOLEAN NOT NULL DEFAULT true,
    "trackNetworkStatus" BOOLEAN NOT NULL DEFAULT true,
    "heartbeatIntervalSeconds" INTEGER NOT NULL DEFAULT 30,
    "incidentThresholdFocusLossCount" INTEGER NOT NULL DEFAULT 3,
    "incidentThresholdFocusLossWindowSeconds" INTEGER NOT NULL DEFAULT 600,
    "incidentThresholdVisibilityHiddenCount" INTEGER NOT NULL DEFAULT 3,
    "incidentThresholdVisibilityHiddenWindowSeconds" INTEGER NOT NULL DEFAULT 600,
    "incidentThresholdNetworkOfflineCount" INTEGER NOT NULL DEFAULT 3,
    "incidentThresholdNetworkOfflineWindowSeconds" INTEGER NOT NULL DEFAULT 600,
    "disclosureTitle" TEXT,
    "disclosureBody" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentSecurityPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentSecurityPolicy_assessmentId_key" ON "AssessmentSecurityPolicy"("assessmentId");

-- CreateIndex
CREATE INDEX "AssessmentSecurityPolicy_tenantId_idx" ON "AssessmentSecurityPolicy"("tenantId");

-- CreateIndex
CREATE INDEX "AssessmentSecurityPolicy_workspaceId_idx" ON "AssessmentSecurityPolicy"("workspaceId");

-- CreateIndex
CREATE INDEX "AssessmentSecurityPolicy_workspaceId_proctoringMode_idx" ON "AssessmentSecurityPolicy"("workspaceId", "proctoringMode");

-- AddForeignKey
ALTER TABLE "AssessmentSecurityPolicy" ADD CONSTRAINT "AssessmentSecurityPolicy_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
