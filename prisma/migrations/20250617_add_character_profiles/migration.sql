-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female', 'other');

-- CreateTable
CREATE TABLE "character_profiles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "gender" "Gender" NOT NULL,
    "occupation" TEXT NOT NULL,
    "catchphrase" TEXT NOT NULL,
    "personality" TEXT NOT NULL,
    "speaking_style" TEXT NOT NULL,
    "expertise" TEXT NOT NULL,
    "backstory" TEXT NOT NULL,
    "philosophy" TEXT,
    "tone" TEXT NOT NULL,
    "voice_style" JSONB NOT NULL,
    "emoji_style" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "character_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "character_profiles_name_key" ON "character_profiles"("name");