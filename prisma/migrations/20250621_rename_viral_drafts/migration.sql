-- AlterTable: viral_drafts_v2 を viral_drafts にリネーム
ALTER TABLE "viral_drafts_v2" RENAME TO "viral_drafts";

-- インデックスのリネーム
ALTER INDEX "idx_viral_drafts_v2_scheduled_at" RENAME TO "idx_viral_drafts_scheduled_at";
ALTER INDEX "idx_viral_drafts_v2_session_id" RENAME TO "idx_viral_drafts_session_id";
ALTER INDEX "idx_viral_drafts_v2_status" RENAME TO "idx_viral_drafts_status";

-- 外部キー制約のリネーム（もしあれば）
ALTER TABLE "viral_draft_performance" RENAME CONSTRAINT "fk_draft" TO "fk_viral_draft";