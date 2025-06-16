#!/usr/bin/env node

/**
 * 停滞したセッションを復旧するスクリプト
 */

const dotenv = require('dotenv');
const path = require('path');

// .env.localファイルを読み込む
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

async function recoverStuckSessions() {
  try {
    console.log('🔧 停滞セッションの復旧を開始...\n');
    
    // 停滞しているセッションを検索
    const stuckSessions = await prisma.cotSession.findMany({
      where: {
        status: { in: ['PENDING', 'EXECUTING', 'INTEGRATING'] },
        updatedAt: { lt: new Date(Date.now() - 5 * 60 * 1000) } // 5分以上更新なし
      },
      include: {
        phases: true
      }
    });
    
    console.log(`${stuckSessions.length}件の停滞セッションを発見\n`);
    
    for (const session of stuckSessions) {
      console.log(`\n=== セッション ${session.id} ===`);
      console.log(`Status: ${session.status}`);
      console.log(`Current Phase/Step: ${session.currentPhase}/${session.currentStep}`);
      console.log(`Last Updated: ${session.updatedAt.toLocaleString()}`);
      
      // Phase 5まで完了していて下書きがない場合
      const phase5 = session.phases.find(p => p.phaseNumber === 5 && p.status === 'COMPLETED');
      if (phase5) {
        const draftCount = await prisma.cotDraft.count({
          where: { sessionId: session.id }
        });
        
        if (draftCount === 0) {
          console.log('⚠️  Phase 5完了済みだが下書きが未作成');
          
          // 下書き作成処理を実行
          await createDraftsFromCompletedSession(session.id);
        }
      }
      
      // INTEGRATEステップで止まっている場合
      if (session.currentStep === 'INTEGRATE' && session.status === 'PENDING') {
        console.log('⚠️  INTEGRATEステップで停滞');
        
        // process-asyncを呼び出して再開
        try {
          const response = await fetch(`http://localhost:3000/api/viral/cot-session/${session.id}/process-async`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (response.ok) {
            console.log('✅ process-asyncを再実行しました');
          } else {
            console.error('❌ process-async実行失敗:', await response.text());
          }
        } catch (error) {
          console.error('❌ API呼び出しエラー:', error.message);
        }
      }
    }
    
    console.log('\n✅ 復旧処理完了');
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function createDraftsFromCompletedSession(sessionId) {
  try {
    const phases = await prisma.cotPhase.findMany({
      where: { sessionId },
      orderBy: { phaseNumber: 'asc' }
    });
    
    const session = await prisma.cotSession.findUnique({
      where: { id: sessionId }
    });
    
    // Phase 2からコンセプト情報を取得
    const phase2 = phases.find(p => p.phaseNumber === 2);
    const concepts = phase2?.integrateResult?.concepts || [];
    
    // Phase 3から3つのコンテンツを取得
    const phase3 = phases.find(p => p.phaseNumber === 3);
    const contents = phase3?.integrateResult?.contents || [];
    
    // Phase 4から戦略情報を取得
    const phase4 = phases.find(p => p.phaseNumber === 4);
    const strategy = phase4?.integrateResult || {};
    
    console.log(`📝 ${concepts.length}件の下書きを作成中...`);
    
    // 3つ全てのコンセプトで下書きを作成
    for (let i = 0; i < concepts.length; i++) {
      const concept = concepts[i];
      const content = contents[i] || {};
      
      await prisma.cotDraft.create({
        data: {
          sessionId,
          conceptNumber: i + 1,
          title: concept.title || content.title || `コンセプト${i + 1}`,
          hook: concept.hook || concept.B || '',
          angle: concept.angle || concept.C || '',
          format: concept.format || concept.A || 'single',
          content: content.mainPost || content.content || null,
          visualGuide: content.visualDescription || concept.visual || null,
          timing: content.postingNotes || concept.timing || '',
          hashtags: content.hashtags || concept.hashtags || [],
          newsSource: concept.newsSource || concept.opportunity || '',
          sourceUrl: concept.sourceUrl || null,
          kpis: strategy.successMetrics || strategy.kpis || null,
          riskAssessment: strategy.riskAssessment || strategy.riskMitigation || null,
          optimizationTips: strategy.optimizationTechniques || null,
          status: 'DRAFT',
          viralScore: concept.viralPotential === '高' ? 90 : 
                     concept.viralPotential === '中' ? 70 : 
                     concept.viralPotential === '低' ? 50 : null
        }
      });
    }
    
    console.log(`✅ ${concepts.length}件の下書きを作成しました`);
    
  } catch (error) {
    console.error('下書き作成エラー:', error);
  }
}

// 実行
recoverStuckSessions();