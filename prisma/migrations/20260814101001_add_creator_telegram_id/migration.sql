-- AlterTable: add creatorTelegramId column
ALTER TABLE "Waiter" ADD COLUMN "creatorTelegramId" BIGINT;

-- Backfill from the earliest Session known to be linked to each waiter (best-effort attribution)
UPDATE "Waiter" w
SET "creatorTelegramId" = s."telegramId"
FROM "Session" s
WHERE s."waiterId" = w."id" AND w."creatorTelegramId" IS NULL;

-- Any remaining rows without a matching session (pre-existing test data) fall back to the admin id
UPDATE "Waiter" SET "creatorTelegramId" = 6005134432 WHERE "creatorTelegramId" IS NULL;

ALTER TABLE "Waiter" ALTER COLUMN "creatorTelegramId" SET NOT NULL;
