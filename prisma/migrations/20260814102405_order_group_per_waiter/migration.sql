-- Rename createdByWaiterId -> waiterId and make it the unique owner of the group
-- (each Waiter account now has at most one OrderGroup, instead of one global OrderGroup)
ALTER TABLE "OrderGroup" RENAME COLUMN "createdByWaiterId" TO "waiterId";

ALTER TABLE "OrderGroup" DROP CONSTRAINT "OrderGroup_createdByWaiterId_fkey";

ALTER TABLE "OrderGroup" ADD CONSTRAINT "OrderGroup_waiterId_fkey" FOREIGN KEY ("waiterId") REFERENCES "Waiter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "OrderGroup_waiterId_key" ON "OrderGroup"("waiterId");
