#!/usr/bin/env node

/**
 * シングル投稿のgenerate APIテスト
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const { PrismaClient } = require('./lib/generated/prisma');
const prisma = new PrismaClient();

async function testSingleGenerate() {
  console.log('🔍 シングル投稿のgenerate APIテスト\n');
  
  try {
    // 最新のセッションを取得
    const session = await prisma.viral_sessions.findFirst({
      where: { id: 'sess_7SrfzUbMwVfZ' }
    });
    
    if (!session) {
      console.log('❌ セッションが見つかりません');
      return;
    }
    
    console.log('📝 セッション情報:');
    console.log('  ID:', session.id);
    console.log('  現在のステータス:', session.status);
    console.log('  selected_ids:', session.selected_ids);
    
    // concepts の中から single 形式のものを探す
    const concepts = session.concepts || [];
    const singleConcept = concepts.find(c => c.format === 'single');
    
    if (!singleConcept) {
      console.log('\n⚠️ single形式のコンセプトがありません');
      console.log('最初のコンセプトを single 形式として扱います');
      
      if (concepts.length > 0) {
        concepts[0].format = 'single';
        await prisma.viral_sessions.update({
          where: { id: session.id },
          data: { 
            concepts: concepts,
            status: 'CONCEPTS_GENERATED',
            selected_ids: [concepts[0].conceptId],
            contents: null
          }
        });
        console.log('✅ コンセプトを single 形式に更新しました');
      }
    } else {
      // single コンセプトを選択
      await prisma.viral_sessions.update({
        where: { id: session.id },
        data: { 
          status: 'CONCEPTS_GENERATED',
          selected_ids: [singleConcept.conceptId],
          contents: null
        }
      });
      console.log('✅ single形式のコンセプトを選択:', singleConcept.conceptTitle);
    }
    
    // 既存の下書きを削除
    await prisma.viral_drafts.deleteMany({
      where: { session_id: session.id }
    });
    console.log('✅ 既存の下書きを削除しました');
    
    // generate APIを呼び出す
    console.log('\n🔄 Generate API呼び出し...');
    const response = await fetch(`http://localhost:3000/api/create/flow/${session.id}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        characterId: 'cardi-dare'
      })
    });
    
    const result = await response.text();
    console.log('  HTTPステータス:', response.status);
    
    try {
      const data = JSON.parse(result);
      if (data.success) {
        console.log('✅ 生成成功!');
        console.log('  生成数:', data.generatedCount);
      } else {
        console.log('❌ 生成失敗:', data.error);
        if (data.details) {
          console.log('  詳細:', data.details);
        }
      }
    } catch (e) {
      console.log('❌ レスポンスパースエラー:', result);
    }
    
    // 下書きを確認
    console.log('\n📋 下書き確認...');
    const drafts = await prisma.viral_drafts.findMany({
      where: { session_id: session.id }
    });
    
    console.log('  下書き数:', drafts.length);
    if (drafts.length > 0) {
      console.log('✅ 下書きが正常に作成されました！');
      drafts.forEach((draft, i) => {
        console.log(`  ${i+1}. ${draft.title}`);
        console.log(`     - ID: ${draft.id}`);
        console.log(`     - format: ${draft.thread_structure ? 'thread' : 'single'}`);
        console.log(`     - content長: ${draft.content?.length || 0}文字`);
        console.log(`     - hashtags: ${draft.hashtags?.join(', ') || 'なし'}`);
      });
    } else {
      console.log('❌ 下書きが作成されていません');
      
      // エラーログを確認
      console.log('\n🔍 最新のエラーログを確認...');
      const fs = require('fs').promises;
      const path = require('path');
      const errorDir = path.join(__dirname, 'logs', 'errors');
      
      try {
        const files = await fs.readdir(errorDir);
        const sortedFiles = files
          .filter(f => f.endsWith('.json'))
          .sort((a, b) => b.localeCompare(a));
        
        if (sortedFiles.length > 0) {
          const latestError = await fs.readFile(path.join(errorDir, sortedFiles[0]), 'utf-8');
          const errorData = JSON.parse(latestError);
          
          if (errorData.sessionId === session.id) {
            console.log('\n最新のエラー:');
            console.log('  メッセージ:', errorData.message);
            console.log('  モジュール:', errorData.module);
            console.log('  操作:', errorData.operation);
          }
        }
      } catch (e) {
        // エラーログの読み取りに失敗した場合は無視
      }
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSingleGenerate();