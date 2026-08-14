-- AlterTable: add createdByWaiterId as nullable first, backfill, then enforce NOT NULL
ALTER TABLE "OrderGroup" ADD COLUMN "createdByWaiterId" INTEGER;

-- Backfill existing rows with the earliest known waiter (best-effort attribution for pre-existing groups)
UPDATE "OrderGroup"
SET "createdByWaiterId" = (SELECT "id" FROM "Waiter" ORDER BY "id" ASC LIMIT 1)
WHERE "createdByWaiterId" IS NULL;

ALTER TABLE "OrderGroup" ALTER COLUMN "createdByWaiterId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "OrderGroup" ADD CONSTRAINT "OrderGroup_createdByWaiterId_fkey" FOREIGN KEY ("createdByWaiterId") REFERENCES "Waiter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: drop unused email column
ALTER TABLE "Waiter" DROP COLUMN "email";
