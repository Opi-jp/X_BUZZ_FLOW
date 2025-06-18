#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });

const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');

const prisma = new PrismaClient();

async function createSessionWithMockData() {
  try {
    // モックデータを読み込む
    const mockDataPath = path.join(process.cwd(), 'lib/prompts/mock-data/perplexity/ai-work-20250618.json');
    const mockData = JSON.parse(await fs.readFile(mockDataPath, 'utf-8'));
    
    console.log('🚀 モックデータでセッションを作成中...\n');
    
    // 1. セッションを作成
    const session = await prisma.viralSession.create({
      data: {
        title: 'AI時代の働き方変革 - モックデータテスト',
        platform: mockData.variables.platform,
        style: mockData.variables.style,
        theme: mockData.variables.theme,
        tone: 'friendly',
        status: 'PERPLEXITY_COMPLETED',
        perplexityData: mockData.response
      }
    });
    
    console.log(`✅ セッション作成完了: ${session.id}`);
    console.log(`📋 タイトル: ${session.title}`);
    console.log(`🎯 プラットフォーム: ${session.platform}`);
    console.log(`🎨 スタイル: ${session.style}`);
    console.log(`📊 トピック数: ${mockData.response.topics.length}`);
    
    console.log('\n📝 トピック一覧:');
    mockData.response.topics.forEach((topic, index) => {
      console.log(`  ${index + 1}. ${topic.TOPIC}`);
    });
    
    console.log('\n✨ 次のステップ:');
    console.log(`1. コンセプト生成: curl -X POST http://localhost:3000/api/generation/content/sessions/${session.id}/generate-concepts`);
    console.log(`2. ステータス確認: curl http://localhost:3000/api/generation/content/sessions/${session.id}`);
    
    return session.id;
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 実行
createSessionWithMockData();