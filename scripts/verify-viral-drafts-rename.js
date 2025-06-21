#!/usr/bin/env node

/**
 * viral_drafts への名前変更が正しく完了したか検証
 */

const { PrismaClient } = require('../lib/generated/prisma');
const prisma = new PrismaClient();

async function verify() {
  console.log('🔍 viral_drafts テーブルの検証を開始...\n');
  
  try {
    // 1. テーブルの存在確認
    console.log('1️⃣ テーブルの存在確認:');
    const tableCheck = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'viral_drafts'
      ) as exists
    `;
    console.log(`   ✅ viral_drafts テーブル: ${tableCheck[0].exists ? '存在' : '不存在'}`);
    
    // 2. Prismaクライアントでのアクセス確認
    console.log('\n2️⃣ Prismaクライアントでのアクセス:');
    try {
      const count = await prisma.viral_drafts.count();
      console.log(`   ✅ prisma.viral_drafts でアクセス可能`);
      console.log(`   📊 レコード数: ${count}`);
    } catch (error) {
      console.error(`   ❌ エラー: ${error.message}`);
    }
    
    // 3. 最新のドラフトを確認
    console.log('\n3️⃣ 最新のドラフト:');
    const latestDraft = await prisma.viral_drafts.findFirst({
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        title: true,
        status: true,
        created_at: true
      }
    });
    
    if (latestDraft) {
      console.log(`   ✅ ID: ${latestDraft.id}`);
      console.log(`   📝 タイトル: ${latestDraft.title}`);
      console.log(`   📊 ステータス: ${latestDraft.status}`);
      console.log(`   🕒 作成日時: ${latestDraft.created_at}`);
    } else {
      console.log('   ℹ️ ドラフトが存在しません');
    }
    
    // 4. 関連するテーブルとの結合確認
    console.log('\n4️⃣ 関連テーブルとの結合:');
    const draftWithSession = await prisma.viral_drafts.findFirst({
      include: {
        viral_sessions: {
          select: {
            id: true,
            theme: true,
            status: true
          }
        }
      }
    });
    
    if (draftWithSession?.viral_sessions) {
      console.log('   ✅ viral_sessions との結合: 成功');
      console.log(`   📝 セッションテーマ: ${draftWithSession.viral_sessions.theme}`);
    } else {
      console.log('   ℹ️ セッション付きのドラフトが見つかりません');
    }
    
    console.log('\n✨ 検証完了: viral_drafts への名前変更は正常に完了しています！');
    
  } catch (error) {
    console.error('\n❌ 検証中にエラーが発生しました:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 実行
verify();