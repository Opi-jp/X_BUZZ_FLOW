#!/usr/bin/env node

const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

async function showDraftContent(sessionId) {
  try {
    // 下書きを取得
    const drafts = await prisma.cotDraft.findMany({
      where: { sessionId },
      orderBy: { conceptNumber: 'asc' }
    });

    console.log(`\n=== 生成された投稿文 (${drafts.length}件) ===\n`);

    drafts.forEach((draft, index) => {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📝 投稿 ${index + 1}: ${draft.title}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`\n【投稿文】`);
      console.log(draft.content || '（コンテンツなし）');
      
      if (draft.hashtags && draft.hashtags.length > 0) {
        console.log(`\n【ハッシュタグ】`);
        console.log(draft.hashtags.map(tag => `#${tag}`).join(' '));
      }
      
      console.log(`\n【メタ情報】`);
      console.log(`形式: ${draft.format || 'N/A'}`);
      console.log(`ソース: ${draft.newsSource || 'N/A'}`);
      console.log(`URL: ${draft.sourceUrl || 'N/A'}`);
      console.log(`文字数: ${draft.content ? draft.content.length : 0}文字`);
      
      if (draft.timing) {
        console.log(`投稿タイミング: ${draft.timing}`);
      }
      
      console.log(`\n`);
    });

    // Phase 3の詳細も確認
    const phase3 = await prisma.cotPhase.findUnique({
      where: {
        sessionId_phaseNumber: {
          sessionId,
          phaseNumber: 3
        }
      }
    });

    if (phase3?.integrateResult?.contents) {
      console.log(`\n=== Phase 3で生成された元の投稿文 ===\n`);
      phase3.integrateResult.contents.forEach((content, index) => {
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`📄 コンテンツ ${index + 1}: ${content.title}`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`\n${content.mainPost}`);
        console.log(`\n`);
      });
    }

  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

const sessionId = process.argv[2] || 'a5f3dff1-1954-4db0-a50b-48750603f569';
showDraftContent(sessionId);