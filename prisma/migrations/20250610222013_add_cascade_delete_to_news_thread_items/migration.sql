-- DropForeignKey
ALTER TABLE "news_thread_items" DROP CONSTRAINT "news_thread_items_thread_id_fkey";

-- AddForeignKey
ALTER TABLE "news_thread_items" ADD CONSTRAINT "news_thread_items_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "news_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
