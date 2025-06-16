#!/usr/bin/env node

const dotenv = require('dotenv');
const path = require('path');

// .env.localファイルを読み込む
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

async function testFullFlow() {
  try {
    const sessionId = process.argv[2] || '5818523f-8a1c-410c-99e8-3cba1b694b69';
    
    console.log('🚀 Phase 1-5の完全テストを開始');
    console.log('セッションID:', sessionId);
    console.log('');
    
    // 各フェーズを順番に実行
    for (let phase = 1; phase <= 5; phase++) {
      console.log(`\n=== Phase ${phase} ===`);
      
      // セッションの状態を確認
      const session = await prisma.cotSession.findUnique({
        where: { id: sessionId },
        include: {
          phases: {
            where: { phaseNumber: phase }
          }
        }
      });
      
      if (!session) {
        console.error('セッションが見つかりません');
        return;
      }
      
      // 現在のフェーズに移動
      if (session.currentPhase < phase) {
        await prisma.cotSession.update({
          where: { id: sessionId },
          data: {
            currentPhase: phase,
            currentStep: 'THINK',
            status: 'PENDING'
          }
        });
      }
      
      // Phase 1の場合はモックのPerplexity結果を挿入
      if (phase === 1) {
        await prisma.cotPhase.upsert({
          where: {
            sessionId_phaseNumber: { sessionId, phaseNumber: 1 }
          },
          update: {
            executeResult: {
              savedPerplexityResponses: [
                {
                  content: 'AIアシスタントの進化により、個人の生産性が劇的に向上。特に文書作成や情報整理の分野で革新的な変化。',
                  searchResults: [{ title: 'AI革命2025', url: 'https://example.com' }]
                },
                {
                  content: 'リモートワークとAIの融合により、新しい働き方のモデルが確立。時間と場所の制約から解放。',
                  searchResults: [{ title: 'Future of Work', url: 'https://example.com' }]
                }
              ]
            }
          },
          create: {
            sessionId,
            phaseNumber: 1,
            status: 'EXECUTING',
            executeResult: {
              savedPerplexityResponses: []
            }
          }
        });
      }
      
      // INTEGRATEステップを直接実行
      await prisma.cotSession.update({
        where: { id: sessionId },
        data: {
          currentStep: 'INTEGRATE',
          status: 'PENDING'
        }
      });
      
      // process-asyncを呼び出し
      console.log(`Phase ${phase} INTEGRATE を実行中...`);
      const response = await fetch(`http://localhost:3000/api/viral/cot-session/${sessionId}/process-async`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        console.error(`Phase ${phase} INTEGRATE 失敗:`, await response.text());
        continue;
      }
      
      // 完了を待つ
      await waitForPhaseCompletion(sessionId, phase);
      
      // 結果を表示
      await showPhaseResult(sessionId, phase);
    }
    
    // 最終的な下書きを確認
    const drafts = await prisma.cotDraft.findMany({
      where: { sessionId },
      orderBy: { conceptNumber: 'asc' }
    });
    
    console.log('\n=== 作成された下書き ===');
    console.log(`下書き数: ${drafts.length}`);
    drafts.forEach(d => {
      console.log(`\n下書き${d.conceptNumber}: ${d.title}`);
      console.log(`  内容: ${d.content ? d.content.substring(0, 100) + '...' : 'なし'}`);
      console.log(`  ハッシュタグ: ${d.hashtags.join(', ')}`);
    });
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function waitForPhaseCompletion(sessionId, phaseNumber) {
  for (let i = 0; i < 30; i++) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const phase = await prisma.cotPhase.findFirst({
      where: { sessionId, phaseNumber }
    });
    
    if (phase?.status === 'COMPLETED' && phase.integrateResult) {
      console.log(`✅ Phase ${phaseNumber} 完了`);
      return;
    }
  }
  
  console.log(`⚠️ Phase ${phaseNumber} タイムアウト`);
}

async function showPhaseResult(sessionId, phaseNumber) {
  const phase = await prisma.cotPhase.findFirst({
    where: { sessionId, phaseNumber }
  });
  
  if (!phase?.integrateResult) return;
  
  const result = phase.integrateResult;
  
  if (typeof result === 'string') {
    console.log(`  エラー: ${result.substring(0, 100)}...`);
    return;
  }
  
  switch (phaseNumber) {
    case 1:
      console.log(`  トピック: ${result.trendedTopics?.map(t => t.topicName).join(', ') || 'なし'}`);
      break;
    case 2:
      console.log(`  コンセプト: ${result.concepts?.map(c => c.title).join(', ') || 'なし'}`);
      break;
    case 3:
      const contents = result.contents || [];
      console.log(`  コンテンツ: ${contents.length}件`);
      contents.forEach((c, i) => {
        console.log(`    ${i+1}. ${c.title || 'タイトルなし'}`);
      });
      break;
    case 4:
      console.log(`  戦略: ${result.executionPlan ? '✓' : '✗'}`);
      break;
    case 5:
      console.log(`  KPI: ${result.kpis || result.successMetrics ? '✓' : '✗'}`);
      break;
  }
}

// 実行
testFullFlow();