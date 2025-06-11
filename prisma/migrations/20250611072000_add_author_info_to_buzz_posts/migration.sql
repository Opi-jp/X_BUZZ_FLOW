-- AlterTable
ALTER TABLE "buzz_posts" ADD COLUMN "author_followers" INTEGER,
ADD COLUMN "author_following" INTEGER,
ADD COLUMN "author_verified" BOOLEAN;