#!/usr/bin/env node

/**
 * Source Formatter DB統合テスト
 * 実際のセッションデータから出典フォーマットをテスト
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const { PrismaClient } = require('./lib/generated/prisma');
const prisma = new PrismaClient();

async function testSourceFormatter() {
  console.log('🧪 Source Formatter DB統合テスト\n');
  
  try {
    // 最新のセッションを取得
    const sessions = await prisma.viral_sessions.findMany({
      where: {
        topics: { not: null }
      },
      orderBy: { created_at: 'desc' },
      take: 3,
      select: {
        id: true,
        theme: true,
        topics: true,
        created_at: true
      }
    });
    
    console.log(`📊 ${sessions.length}個のセッションを確認\n`);
    
    for (const session of sessions) {
      console.log('━'.repeat(60));
      console.log(`🆔 セッションID: ${session.id}`);
      console.log(`📝 テーマ: ${session.theme}`);
      console.log(`📅 作成日: ${session.created_at}`);
      
      // topicsの内容を確認
      const topicsText = typeof session.topics === 'string' 
        ? session.topics 
        : JSON.stringify(session.topics);
        
      console.log(`\n📚 Topics データ (最初の500文字):`);
      console.log(topicsText.substring(0, 500));
      
      // JSONとしてパース可能か確認
      try {
        const topicsData = JSON.parse(topicsText);
        
        if (topicsData.topics && Array.isArray(topicsData.topics)) {
          console.log(`\n✅ 出典情報: ${topicsData.topics.length}件`);
          
          topicsData.topics.forEach((topic, index) => {
            console.log(`\n  ${index + 1}. ${topic.title || 'タイトルなし'}`);
            console.log(`     URL: ${topic.url || 'URLなし'}`);
            console.log(`     ソース: ${topic.source || 'ソースなし'}`);
            console.log(`     日付: ${topic.date || '日付なし'}`);
            
            // URLが完全かチェック
            if (topic.url) {
              const isValidUrl = topic.url.startsWith('http://') || topic.url.startsWith('https://');
              const hasExtension = topic.url.includes('.html') || topic.url.includes('.htm') || topic.url.endsWith('/');
              console.log(`     URL検証: ${isValidUrl ? '✅' : '❌'} 有効な形式, ${hasExtension ? '✅' : '⚠️'} 完全な形式`);
            }
          });
        } else {
          console.log('\n⚠️ topics配列が見つかりません');
        }
      } catch (parseError) {
        console.log('\n❌ JSONパースエラー:', parseError.message);
        
        // JSONブロックを探す
        const jsonBlockRegex = /```\s*\n?\{[\s\S]*?\}\s*\n?```/g;
        const jsonBlocks = topicsText.match(jsonBlockRegex) || [];
        console.log(`\n📦 JSONブロック数: ${jsonBlocks.length}`);
      }
      
      console.log('\n');
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 実行
testSourceFormatter();