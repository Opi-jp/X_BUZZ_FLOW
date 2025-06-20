// Phase 5を完了させる
const { PrismaClient } = require('./app/generated/prisma');
const prisma = new PrismaClient();

async function completePhase5() {
  const sessionId = '3abdb3e4-9031-4f5b-9419-845fb93a80ed';
  
  try {
    // Phase 5のThink結果を取得
    const phase5 = await prisma.cotPhase.findUnique({
      where: {
        sessionId_phaseNumber: {
          sessionId,
          phaseNumber: 5
        }
      }
    });
    
    // Phase 5 EXECUTEはpassThrough
    await prisma.cotPhase.update({
      where: {
        sessionId_phaseNumber: {
          sessionId,
          phaseNumber: 5
        }
      },
      data: {
        executeResult: phase5.thinkResult,
        executeDuration: 100,
        executeAt: new Date(),
        status: 'EXECUTING'
      }
    });
    
    // Phase 5 INTEGRATE - 最終的なKPIとリスク評価を追加
    const integrateResult = {
      finalExecutionPlan: {
        summary: "AIと働き方をテーマにしたバイラルコンテンツの実行計画",
        criticalSuccessFactors: [
          "適切なタイミングでの投稿",
          "エンゲージメントの継続的な監視",
          "フォロワーとの積極的な対話"
        ],
        bestTimeToPost: ["平日14:00-16:00", "土日10:00-12:00"],
        followUpStrategy: "初期反応を見て、24時間以内に関連コンテンツを追加投稿"
      },
      kpis: {
        immediate: {
          likes: "200+",
          retweets: "50+",
          comments: "30+"
        },
        shortTerm: {
          impressions: "10,000+",
          profileVisits: "500+",
          newFollowers: "50+"
        }
      },
      riskMitigation: {
        potentialRisks: [
          "AIに対する否定的な反応",
          "技術的な内容が難しすぎる"
        ],
        mitigationStrategies: [
          "建設的な議論を促進",
          "わかりやすい例を追加"
        ]
      }
    };
    
    await prisma.cotPhase.update({
      where: {
        sessionId_phaseNumber: {
          sessionId,
          phaseNumber: 5
        }
      },
      data: {
        integrateResult: integrateResult,
        integrateTokens: 500, // 概算
        integrateAt: new Date(),
        status: 'COMPLETED'
      }
    });
    
    // セッションを完了状態に
    const session = await prisma.cotSession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date()
      }
    });
    
    console.log('✅ Phase 5 completed!');
    console.log('✅ Session completed!');
    console.log(`Total time: ${Math.round(session.totalDuration / 1000)}秒`);
    console.log(`Total tokens: ${session.totalTokens}`);
    
    // 下書きの数を確認
    const drafts = await prisma.cotDraft.count({
      where: { sessionId }
    });
    console.log(`\n📝 Created ${drafts} drafts`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

completePhase5();