/*
  Warnings:

  - You are about to drop the column `rank` on the `news_thread_items` table. All the data in the column will be lost.
  - You are about to drop the column `tweet_content` on the `news_thread_items` table. All the data in the column will be lost.
  - Added the required column `content` to the `news_thread_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `position` to the `news_thread_items` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "news_thread_items" DROP CONSTRAINT "news_thread_items_article_id_fkey";

-- AlterTable
ALTER TABLE "news_thread_items" DROP COLUMN "rank",
DROP COLUMN "tweet_content",
ADD COLUMN     "content" TEXT NOT NULL,
ADD COLUMN     "metadata" JSON,
ADD COLUMN     "position" INTEGER NOT NULL,
ALTER COLUMN "article_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "news_thread_items" ADD CONSTRAINT "news_thread_items_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "news_articles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
