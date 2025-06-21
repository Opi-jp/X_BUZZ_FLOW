#!/usr/bin/env node

/**
 * Generate APIのデバッグテスト
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const { PrismaClient } = require('./lib/generated/prisma');
const prisma = new PrismaClient();

async function testGenerateAPI() {
  console.log('🔍 Generate APIデバッグテスト\n');
  
  try {
    // 最新のCONCEPTS_GENERATEDセッションを取得
    const session = await prisma.viral_sessions.findFirst({
      where: { 
        status: 'CONCEPTS_GENERATED',
        selected_ids: { isEmpty: false }
      },
      orderBy: { created_at: 'desc' }
    });
    
    if (!session) {
      console.log('❌ CONCEPTS_GENERATEDステータスのセッションがありません');
      
      // 手動でselected_idsを設定
      const completedSession = await prisma.viral_sessions.findFirst({
        where: { status: 'COMPLETED' },
        orderBy: { created_at: 'desc' }
      });
      
      if (completedSession && completedSession.concepts) {
        const concepts = completedSession.concepts;
        const firstConceptId = concepts[0]?.conceptId;
        
        if (firstConceptId) {
          console.log('✅ COMPLETEDセッションのselected_idsを設定:', firstConceptId);
          await prisma.viral_sessions.update({
            where: { id: completedSession.id },
            data: { 
              status: 'CONCEPTS_GENERATED',
              selected_ids: [firstConceptId]
            }
          });
          
          // セッションを再取得
          const updatedSession = await prisma.viral_sessions.findUnique({
            where: { id: completedSession.id }
          });
          
          await callGenerateAPI(updatedSession);
        }
      }
      return;
    }
    
    await callGenerateAPI(session);
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function callGenerateAPI(session) {
  console.log('📝 セッション情報:');
  console.log('  ID:', session.id);
  console.log('  selected_ids:', session.selected_ids);
  
  console.log('\n🔄 Generate API呼び出し...');
  
  const response = await fetch(`http://localhost:3000/api/create/flow/${session.id}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      characterId: 'cardi-dare',
      selectedConceptIds: session.selected_ids
    })
  });
  
  const result = await response.text();
  
  console.log('\n📥 レスポンス:');
  console.log('  ステータス:', response.status);
  
  try {
    const data = JSON.parse(result);
    console.log('  結果:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.log('  テキスト:', result);
  }
  
  // 下書きの確認
  console.log('\n📋 下書き確認...');
  const drafts = await prisma.viral_drafts.findMany({
    where: { session_id: session.id }
  });
  
  console.log('  下書き数:', drafts.length);
  if (drafts.length > 0) {
    drafts.forEach((draft, i) => {
      console.log(`  ${i+1}. ${draft.title}`);
      console.log(`     - ID: ${draft.id}`);
      console.log(`     - thread_structure: ${draft.thread_structure ? 'あり' : 'なし'}`);
    });
  }
}

testGenerateAPI();