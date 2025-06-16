#!/usr/bin/env node

const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

async function checkPhase2(sessionId) {
  console.log(`\n=== Phase 2 URL確認 ===`);
  console.log(`セッションID: ${sessionId}\n`);

  try {
    // Phase 2の結果を取得
    const phase2 = await prisma.cotPhase.findUnique({
      where: {
        sessionId_phaseNumber: {
          sessionId,
          phaseNumber: 2
        }
      }
    });

    if (!phase2) {
      console.log('Phase 2がまだ存在しません');
      return;
    }

    console.log('Phase 2ステータス:', phase2.status);
    console.log('最終更新:', phase2.updatedAt);

    // integrateResultを確認
    if (phase2.integrateResult) {
      console.log('\n=== Phase 2 IntegrateResult ===');
      const result = phase2.integrateResult;
      
      if (result.concepts) {
        console.log(`\nコンセプト数: ${result.concepts.length}`);
        
        result.concepts.forEach((concept, index) => {
          console.log(`\n--- コンセプト ${index + 1}: ${concept.title} ---`);
          console.log(`形式: ${concept.A}`);
          console.log(`フック: ${concept.B}`);
          console.log(`角度: ${concept.C}`);
          console.log(`ニュースソース: ${concept.newsSource || 'なし'}`);
          console.log(`ソースURL: ${concept.sourceUrl || 'なし'}`);
          console.log(`基となった機会: ${concept.opportunity || 'なし'}`);
          
          if (concept.D && concept.D.length > 0) {
            console.log(`キーポイント数: ${concept.D.length}`);
          }
        });
      }
    }

    // Phase 1の情報がPhase 2に渡されているか確認
    const session = await prisma.cotSession.findUnique({
      where: { id: sessionId },
      include: { phases: true }
    });

    const phase1 = session.phases.find(p => p.phaseNumber === 1);
    if (phase1?.executeResult) {
      console.log('\n\n=== Phase 1のURL情報（参考） ===');
      const executeResult = phase1.executeResult;
      
      if (executeResult.searchResults) {
        let totalUrls = 0;
        executeResult.searchResults.forEach((result) => {
          const content = result.content || '';
          const urls = content.match(/https?:\/\/[^\s\)]+/g) || [];
          totalUrls += urls.length;
          
          if (result.searchResults && result.searchResults.length > 0) {
            totalUrls += result.searchResults.length;
          }
        });
        
        console.log(`Phase 1で取得した総URL数: ${totalUrls}`);
        console.log(`Phase 2のコンセプトでURL付きの数: ${phase2.integrateResult?.concepts?.filter(c => c.sourceUrl).length || 0}`);
      }
    }

  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 実行
const sessionId = process.argv[2] || 'a5f3dff1-1954-4db0-a50b-48750603f569';
checkPhase2(sessionId);