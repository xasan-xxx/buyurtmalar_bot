-- AlterTable: add subscription/trial columns
ALTER TABLE "Waiter" ADD COLUMN "trialEndsAt" TIMESTAMP(3);
ALTER TABLE "Waiter" ADD COLUMN "subscriptionStatus" TEXT NOT NULL DEFAULT 'trial';
ALTER TABLE "Waiter" ADD COLUMN "subscriptionExpiresAt" TIMESTAMP(3);

-- Backfill trialEndsAt for existing rows (createdAt + 7 days)
UPDATE "Waiter"
SET "trialEndsAt" = "createdAt" + INTERVAL '7 days'
WHERE "trialEndsAt" IS NULL;

ALTER TABLE "Waiter" ALTER COLUMN "trialEndsAt" SET NOT NULL;
