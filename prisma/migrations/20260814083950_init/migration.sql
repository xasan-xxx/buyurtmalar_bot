-- CreateTable
CREATE TABLE "Waiter" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Waiter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderGroup" (
    "id" SERIAL NOT NULL,
    "chatId" BIGINT NOT NULL,
    "name" TEXT,
    "setAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" SERIAL NOT NULL,
    "waiterId" INTEGER NOT NULL,
    "tableNumber" INTEGER NOT NULL,
    "itemsText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "telegramId" BIGINT NOT NULL,
    "waiterId" INTEGER,
    "step" TEXT NOT NULL DEFAULT 'idle',
    "tempData" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("telegramId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Waiter_username_key" ON "Waiter"("username");

-- CreateIndex
CREATE UNIQUE INDEX "OrderGroup_chatId_key" ON "OrderGroup"("chatId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_waiterId_fkey" FOREIGN KEY ("waiterId") REFERENCES "Waiter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_waiterId_fkey" FOREIGN KEY ("waiterId") REFERENCES "Waiter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
