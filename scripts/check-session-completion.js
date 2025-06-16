#!/usr/bin/env node

const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

async function checkCompletion(sessionId) {
  try {
    const session = await prisma.cotSession.findUnique({
      where: { id: sessionId },
      include: {
        phases: true
      }
    });

    console.log('\n=== セッション完了状態 ===');
    console.log('セッションID:', session.id);
    console.log('ステータス:', session.status);
    console.log('現在のフェーズ:', session.currentPhase);
    console.log('現在のステップ:', session.currentStep);
    console.log('完了日時:', session.completedAt || '未完了');

    // 各フェーズの状態
    console.log('\n=== フェーズ別状態 ===');
    session.phases.forEach(phase => {
      console.log(`Phase ${phase.phaseNumber}: ${phase.status}`);
    });

    // 下書きの確認
    const drafts = await prisma.cotDraft.findMany({
      where: { sessionId },
      orderBy: { conceptNumber: 'asc' }
    });

    console.log(`\n=== 作成された下書き (${drafts.length}件) ===`);
    drafts.forEach((draft, index) => {
      console.log(`\n下書き ${index + 1}: ${draft.title}`);
      console.log(`  ソースURL: ${draft.sourceUrl || 'なし'}`);
      console.log(`  ニュースソース: ${draft.newsSource || 'なし'}`);
      console.log(`  ステータス: ${draft.status}`);
    });

  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

const sessionId = process.argv[2] || 'a5f3dff1-1954-4db0-a50b-48750603f569';
checkCompletion(sessionId);