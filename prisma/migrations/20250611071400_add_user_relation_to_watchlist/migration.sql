-- AlterTable
ALTER TABLE "watchlist_users" ADD COLUMN "user_id" TEXT NOT NULL,
ALTER COLUMN "followers_count" SET DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "watchlist_users_user_id_username_key" ON "watchlist_users"("user_id", "username");

-- AddForeignKey
ALTER TABLE "watchlist_users" ADD CONSTRAINT "watchlist_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;