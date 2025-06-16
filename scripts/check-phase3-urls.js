#!/usr/bin/env node

const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

async function checkPhase3(sessionId) {
  console.log(`\n=== Phase 3 URL確認 ===`);
  console.log(`セッションID: ${sessionId}\n`);

  try {
    const phases = await prisma.cotPhase.findMany({
      where: { sessionId },
      orderBy: { phaseNumber: 'asc' }
    });

    // Phase 3の結果を確認
    const phase3 = phases.find(p => p.phaseNumber === 3);
    if (!phase3) {
      console.log('Phase 3がまだ存在しません');
      return;
    }

    console.log('Phase 3ステータス:', phase3.status);
    console.log('最終更新:', phase3.updatedAt);

    if (phase3.integrateResult) {
      console.log('\n=== Phase 3 IntegrateResult ===');
      const result = phase3.integrateResult;
      
      if (result.contents) {
        console.log(`\nコンテンツ数: ${result.contents.length}`);
        
        result.contents.forEach((content, index) => {
          console.log(`\n--- コンテンツ ${index + 1}: ${content.title} ---`);
          console.log(`コンセプト番号: ${content.conceptNumber}`);
          console.log(`投稿文の長さ: ${content.mainPost?.length || 0}文字`);
          console.log(`ハッシュタグ数: ${content.hashtags?.length || 0}`);
          
          // URLが投稿文に含まれているか確認
          if (content.mainPost) {
            const urls = content.mainPost.match(/https?:\/\/[^\s]+/g) || [];
            console.log(`投稿文内のURL数: ${urls.length}`);
            if (urls.length > 0) {
              urls.forEach((url, i) => {
                console.log(`  ${i + 1}. ${url}`);
              });
            }
          }
        });
      }
    }

    // Phase 2からのURL情報の引き継ぎを確認
    const phase2 = phases.find(p => p.phaseNumber === 2);
    if (phase2?.integrateResult?.concepts) {
      console.log('\n\n=== Phase 2から引き継がれたURL情報 ===');
      const concepts = phase2.integrateResult.concepts;
      
      concepts.forEach((concept, index) => {
        console.log(`\nコンセプト ${index + 1}: ${concept.title}`);
        console.log(`  ソースURL: ${concept.sourceUrl || 'なし'}`);
      });
      
      console.log(`\nPhase 2でURL付きコンセプト数: ${concepts.filter(c => c.sourceUrl).length}`);
      console.log(`Phase 3で作成されたコンテンツ数: ${phase3.integrateResult?.contents?.length || 0}`);
    }

    // 下書きテーブルへの保存を確認
    const drafts = await prisma.cotDraft.findMany({
      where: { sessionId },
      orderBy: { conceptNumber: 'asc' }
    });

    if (drafts.length > 0) {
      console.log('\n\n=== 作成された下書き ===');
      console.log(`下書き数: ${drafts.length}`);
      
      drafts.forEach((draft, index) => {
        console.log(`\n--- 下書き ${index + 1}: ${draft.title} ---`);
        console.log(`ソースURL: ${draft.sourceUrl || 'なし'}`);
        console.log(`ニュースソース: ${draft.newsSource || 'なし'}`);
      });
    }

  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 実行
const sessionId = process.argv[2] || 'a5f3dff1-1954-4db0-a50b-48750603f569';
checkPhase3(sessionId);