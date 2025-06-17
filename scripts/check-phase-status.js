const { PrismaClient } = require('../lib/generated/prisma');
const prisma = new PrismaClient();

async function checkPhaseStatus(sessionId) {
  try {
    const session = await prisma.cotSession.findUnique({
      where: { id: sessionId },
      include: {
        phases: {
          orderBy: { phaseNumber: 'asc' }
        }
      }
    });

    if (!session) {
      console.log('セッションが見つかりません');
      return;
    }

    console.log('\n=== セッション情報 ===');
    console.log(`ID: ${session.id}`);
    console.log(`ステータス: ${session.status}`);
    console.log(`現在のフェーズ: ${session.currentPhase}`);
    console.log(`現在のステップ: ${session.currentStep}`);

    console.log('\n=== フェーズ詳細 ===');
    for (const phase of session.phases) {
      console.log(`\nPhase ${phase.phaseNumber}: ${phase.status}`);
      
      if (phase.thinkResult) {
        console.log('  THINK: 完了');
        const questions = phase.thinkResult.perplexityQuestions || [];
        console.log(`  質問数: ${questions.length}`);
      }
      
      if (phase.executeResult) {
        console.log('  EXECUTE: 完了');
        const responses = phase.executeResult.savedPerplexityResponses || [];
        console.log(`  取得した記事数: ${responses.length}`);
      }
      
      if (phase.integrateResult) {
        console.log('  INTEGRATE: 完了');
        const articles = phase.integrateResult.collectedArticles || [];
        console.log(`  収集した記事数: ${articles.length}`);
        
        if (articles.length > 0) {
          console.log('\n  === collectedArticles の構造 ===');
          const firstArticle = articles[0];
          console.log('  フィールド:', Object.keys(firstArticle).join(', '));
          console.log(`  タイトル: ${firstArticle.title}`);
          console.log(`  URL: ${firstArticle.url}`);
        }
      }
    }

    // API タスクの確認
    const apiTasks = await prisma.$queryRaw`
      SELECT * FROM api_tasks 
      WHERE session_id = ${sessionId}
      ORDER BY created_at DESC
      LIMIT 5
    `;

    console.log('\n=== APIタスク ===');
    console.log(`タスク数: ${apiTasks.length}`);
    for (const task of apiTasks) {
      console.log(`- ${task.task_type}: ${task.status} (${task.phase}/${task.step})`);
    }

  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// コマンドライン引数からセッションIDを取得
const sessionId = process.argv[2] || 'c7cba53e-9f94-4136-bc70-adf9f457ed88';
checkPhaseStatus(sessionId);