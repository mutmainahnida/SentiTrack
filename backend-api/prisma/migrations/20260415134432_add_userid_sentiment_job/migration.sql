/*
  Warnings:

  - Added the required column `userId` to the `SentimentJobHistory` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SentimentJobHistory" ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "SentimentJobHistory_userId_idx" ON "SentimentJobHistory"("userId");

-- AddForeignKey
ALTER TABLE "SentimentJobHistory" ADD CONSTRAINT "SentimentJobHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
