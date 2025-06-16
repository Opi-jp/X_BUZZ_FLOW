#!/usr/bin/env node

const { PrismaClient } = require('../app/generated/prisma');
const dotenv = require('dotenv');
const path = require('path');

// .env.localファイルを読み込む
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const prisma = new PrismaClient();

async function createTables() {
  console.log('🔧 API Task テーブルを作成中...\n');
  
  try {
    // api_tasksテーブルを作成
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS api_tasks (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        type TEXT NOT NULL,
        session_id TEXT NOT NULL,
        phase_number INTEGER NOT NULL,
        step_name TEXT NOT NULL,
        request JSONB NOT NULL,
        status TEXT NOT NULL DEFAULT 'QUEUED',
        retry_count INTEGER NOT NULL DEFAULT 0,
        response JSONB,
        error TEXT,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        started_at TIMESTAMP(3),
        completed_at TIMESTAMP(3)
      )
    `;
    
    console.log('✅ api_tasksテーブルを作成しました');
    
    // インデックスを作成
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_api_tasks_session_id ON api_tasks(session_id)
    `;
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_api_tasks_status ON api_tasks(status)
    `;
    
    console.log('✅ インデックスを作成しました');
    
    // cot_sessionsテーブルにmetadataカラムを追加（存在しない場合）
    try {
      await prisma.$executeRaw`
        ALTER TABLE cot_sessions ADD COLUMN IF NOT EXISTS metadata JSONB
      `;
      console.log('✅ metadataカラムを追加しました');
    } catch (e) {
      console.log('ℹ️  metadataカラムは既に存在します');
    }
    
    // セッションステータスに新しい値を追加
    try {
      await prisma.$executeRaw`
        ALTER TYPE "CotSessionStatus" ADD VALUE IF NOT EXISTS 'WAITING_API'
      `;
      console.log('✅ WAITING_APIステータスを追加しました');
    } catch (e) {
      console.log('ℹ️  WAITING_APIステータスは既に存在します');
    }
    
    try {
      await prisma.$executeRaw`
        ALTER TYPE "CotSessionStatus" ADD VALUE IF NOT EXISTS 'WAITING_PERPLEXITY'
      `;
      console.log('✅ WAITING_PERPLEXITYステータスを追加しました');
    } catch (e) {
      console.log('ℹ️  WAITING_PERPLEXITYステータスは既に存在します');
    }
    
    console.log('\n✅ 全ての変更が完了しました！');
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

// 実行
createTables();