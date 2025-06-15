-- CotPhaseテーブルにPerplexityの生の応答を保存するカラムを追加
-- これにより、再実行時にPerplexity APIを呼ばずにテスト可能

ALTER TABLE "CotPhase" 
ADD COLUMN IF NOT EXISTS "perplexity_responses" JSONB;

-- 既存のexecuteResultとは別に、Perplexityの生の応答を保存
-- executeResultは構造化された結果
-- perplexity_responsesは生の応答テキスト配列

COMMENT ON COLUMN "CotPhase"."perplexity_responses" IS 'Perplexity APIからの生の応答を保存。再実行時のテスト用。';

-- インデックスを追加（JSONBの検索性能向上）
CREATE INDEX IF NOT EXISTS idx_cot_phase_perplexity_responses 
ON "CotPhase" USING gin("perplexity_responses");