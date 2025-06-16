#!/usr/bin/env node

const dotenv = require('dotenv');
const path = require('path');

// .env.localファイルを読み込む
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

async function forceProcessStep(sessionId, expectedStep) {
  const baseUrl = 'http://localhost:3000';
  
  console.log(`\n🔧 強制的に${expectedStep}ステップを実行...`);
  
  // process APIを直接呼び出し（復旧処理をバイパス）
  const response = await fetch(`${baseUrl}/api/viral/cot-session/${sessionId}/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Skip-Recovery': 'true' // カスタムヘッダー（実装が必要）
    }
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error(`❌ エラー:`, error);
    return false;
  }
  
  const result = await response.json();
  console.log(`✅ レスポンス:`, {
    success: result.success,
    phase: result.phase,
    step: result.step,
    message: result.message
  });
  
  return true;
}

async function testDirectIntegrate() {
  console.log('🧪 INTEGRATE直接実行テスト\n');
  
  const baseUrl = 'http://localhost:3000';
  const { PrismaClient } = require('./app/generated/prisma');
  const prisma = new PrismaClient();
  
  try {
    // 1. 既存のセッションを探す（Phase 1 THINKが完了しているもの）
    console.log('1️⃣ 既存のセッションを検索...');
    const sessions = await prisma.cotSession.findMany({
      where: {
        currentPhase: 1,
        status: {
          in: ['EXECUTING', 'PENDING', 'THINKING', 'INTEGRATING']
        }
      },
      include: {
        phases: {
          where: { phaseNumber: 1 }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    
    console.log(`見つかったセッション: ${sessions.length}件`);
    
    let targetSession = null;
    for (const session of sessions) {
      const phase = session.phases[0];
      if (phase && phase.thinkResult) {
        targetSession = session;
        break;
      }
    }
    
    if (!targetSession) {
      console.log('適切なセッションが見つかりません。新規作成します...');
      // 新規作成は省略
      return;
    }
    
    const sessionId = targetSession.id;
    console.log(`✅ セッション選択: ${sessionId}`);
    console.log(`  - 状態: ${targetSession.status}`);
    console.log(`  - ステップ: ${targetSession.currentStep}`);
    
    // 2. Phase 1のデータを確認
    const phase1 = targetSession.phases[0];
    console.log('\n2️⃣ Phase 1のデータ確認:');
    console.log(`  - THINKデータ: ${phase1.thinkResult ? '✅' : '❌'}`);
    console.log(`  - EXECUTEデータ: ${phase1.executeResult ? '✅' : '❌'}`);
    console.log(`  - INTEGRATEデータ: ${phase1.integrateResult ? '✅' : '❌'}`);
    
    // 3. EXECUTEデータがない場合はモックを作成
    if (!phase1.executeResult) {
      console.log('\n3️⃣ EXECUTEデータを作成...');
      
      const thinkResult = phase1.thinkResult;
      const mockExecuteResult = {
        searchResults: [
          {
            question: thinkResult.perplexityQuestions?.[0]?.question || "What are the latest AI developments?",
            category: "A",
            strategicIntent: "最新動向の把握",
            viralAngle: "技術革新への期待",
            analysis: "モックデータ: 最新のAI技術に関する議論が活発化しています。特にChatGPTのような対話型AIの進化が注目を集めています。多くの人々が仕事への影響を議論しており、賛否両論が巻き起こっています。",
            sources: [
              { title: "AI最新動向2025", url: "https://example.com/ai-news", date: "2025年6月15日" }
            ],
            rawResponse: "モックレスポンス"
          }
        ],
        searchMethod: "mock",
        savedPerplexityResponses: []
      };
      
      await prisma.cotPhase.update({
        where: {
          sessionId_phaseNumber: {
            sessionId,
            phaseNumber: 1
          }
        },
        data: {
          executeResult: mockExecuteResult,
          executeDuration: 1000,
          executeAt: new Date(),
          status: 'EXECUTING'
        }
      });
      
      console.log('✅ モックEXECUTEデータを作成しました');
    }
    
    // 4. セッション状態を強制的にINTEGRATEに設定
    console.log('\n4️⃣ セッション状態を設定...');
    await prisma.cotSession.update({
      where: { id: sessionId },
      data: {
        currentStep: 'INTEGRATE',
        status: 'PENDING', // 復旧処理を避けるためPENDINGに
        updatedAt: new Date(Date.now() - 3 * 60 * 1000) // 3分前に設定
      }
    });
    
    // 5. INTEGRATEを実行
    console.log('\n5️⃣ INTEGRATEステップを実行...');
    const processResponse = await fetch(`${baseUrl}/api/viral/cot-session/${sessionId}/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!processResponse.ok) {
      const error = await processResponse.text();
      console.error('❌ INTEGRATE失敗:', error);
      return;
    }
    
    const result = await processResponse.json();
    console.log('✅ INTEGRATE成功!');
    console.log('結果:', {
      success: result.success,
      phaseCompleted: result.phaseCompleted,
      nextPhase: result.nextPhase,
      message: result.message
    });
    
    // 6. 最終結果を確認
    console.log('\n6️⃣ 最終結果の確認...');
    const finalPhase = await prisma.cotPhase.findUnique({
      where: {
        sessionId_phaseNumber: {
          sessionId,
          phaseNumber: 1
        }
      }
    });
    
    if (finalPhase?.integrateResult) {
      const integrateResult = finalPhase.integrateResult;
      console.log('✅ INTEGRATEデータが保存されました:');
      console.log(`  - trendedTopics数: ${integrateResult.trendedTopics?.length || 0}`);
      console.log(`  - topicCount: ${integrateResult.topicCount}`);
      console.log(`  - categoryInsights: ${integrateResult.categoryInsights ? '✅' : '❌'}`);
      
      if (integrateResult.trendedTopics?.length > 0) {
        console.log('\n特定されたトピック例:');
        const topic = integrateResult.trendedTopics[0];
        console.log(`  - ${topic.topicName}`);
        console.log(`    カテゴリ: ${topic.category}`);
        console.log(`    専門性との関連: ${topic.expertiseRelevance}`);
      }
    }
    
  } catch (error) {
    console.error('\n❌ エラー:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// メイン処理
async function main() {
  console.log('🚀 X_BUZZ_FLOW INTEGRATE直接テスト\n');
  
  const serverRunning = await fetch('http://localhost:3000').then(() => true).catch(() => false);
  if (!serverRunning) {
    console.error('❌ 開発サーバーが起動していません');
    process.exit(1);
  }
  
  await testDirectIntegrate();
}

// 実行
main().catch(console.error);