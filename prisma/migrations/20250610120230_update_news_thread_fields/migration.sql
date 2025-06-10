/*
  Warnings:

  - You are about to drop the column `date` on the `news_threads` table. All the data in the column will be lost.
  - You are about to drop the column `main_tweet_id` on the `news_threads` table. All the data in the column will be lost.
  - You are about to drop the column `total_items` on the `news_threads` table. All the data in the column will be lost.
  - Added the required column `title` to the `news_threads` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "news_threads" DROP COLUMN "date",
DROP COLUMN "main_tweet_id",
DROP COLUMN "total_items",
ADD COLUMN     "metadata" JSON,
ADD COLUMN     "scheduled_at" TIMESTAMP(3),
ADD COLUMN     "title" TEXT NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'draft';
