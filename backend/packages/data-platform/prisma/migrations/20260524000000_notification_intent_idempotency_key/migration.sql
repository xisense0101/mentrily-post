-- Add deterministic idempotency key to NotificationIntent
ALTER TABLE "NotificationIntent" ADD COLUMN "idempotencyKey" TEXT;

-- Backfill existing rows with a placeholder (NULL is fine for historical rows)
-- New rows will always have the key set

-- Create unique index on idempotencyKey (only for non-null values)
CREATE UNIQUE INDEX "NotificationIntent_idempotencyKey_key"
  ON "NotificationIntent"("idempotencyKey")
  WHERE "idempotencyKey" IS NOT NULL;

-- Add index for lookup efficiency
CREATE INDEX "NotificationIntent_idempotencyKey_idx"
  ON "NotificationIntent"("idempotencyKey")
  WHERE "idempotencyKey" IS NOT NULL;
