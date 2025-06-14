import { NextResponse } from 'next/server';
import { Pool } from 'pg';

// マイグレーション用のAPI
export async function POST() {
  // DIRECT_URLを使用
  const directUrl = process.env.DIRECT_URL;
  
  if (!directUrl) {
    return NextResponse.json(
      { error: 'DIRECT_URL is not configured' },
      { status: 500 }
    );
  }

  const pool = new Pool({
    connectionString: directUrl,
  });

  try {
    // CotSessionテーブルの作成
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "cot_sessions" (
        "id" TEXT NOT NULL,
        "user_config" JSONB NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'pending',
        "current_phase" INTEGER NOT NULL DEFAULT 0,
        "phase_results" JSONB,
        "error" TEXT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "completed_at" TIMESTAMP(3),
        CONSTRAINT "cot_sessions_pkey" PRIMARY KEY ("id")
      )
    `);

    // CotDraftテーブルの作成
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "cot_drafts" (
        "id" TEXT NOT NULL,
        "session_id" TEXT NOT NULL,
        "concept_number" INTEGER NOT NULL,
        "topic" TEXT NOT NULL,
        "format" TEXT NOT NULL,
        "hook" TEXT NOT NULL,
        "angle" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "thread_content" JSONB,
        "visual_guide" TEXT,
        "hashtags" TEXT[],
        "timing" TEXT,
        "news_source" TEXT,
        "source_url" TEXT,
        "viral_score" DOUBLE PRECISION,
        "status" TEXT NOT NULL DEFAULT 'draft',
        "edited_content" TEXT,
        "scheduled_at" TIMESTAMP(3),
        "posted_at" TIMESTAMP(3),
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "cot_drafts_pkey" PRIMARY KEY ("id")
      )
    `);

    // インデックスの作成
    await pool.query(`CREATE INDEX IF NOT EXISTS "cot_sessions_status_idx" ON "cot_sessions"("status")`);
    await pool.query(`CREATE INDEX IF NOT EXISTS "cot_sessions_created_at_idx" ON "cot_sessions"("created_at")`);
    await pool.query(`CREATE INDEX IF NOT EXISTS "cot_drafts_session_id_idx" ON "cot_drafts"("session_id")`);
    await pool.query(`CREATE INDEX IF NOT EXISTS "cot_drafts_status_idx" ON "cot_drafts"("status")`);

    // 作成されたテーブルの確認
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('cot_sessions', 'cot_drafts')
    `);

    return NextResponse.json({
      success: true,
      message: 'Tables created successfully',
      tables: result.rows
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  } finally {
    await pool.end();
  }
}