const { PrismaClient } = require('../lib/generated/prisma');
const prisma = new PrismaClient();

async function checkConceptStructure() {
  try {
    // conceptsが保存されているセッションを探す
    const session = await prisma.viralSession.findFirst({
      where: {
        concepts: { not: null }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!session || !session.concepts) {
      console.log('コンセプトが保存されているセッションが見つかりません');
      return;
    }

    console.log(`\nセッションID: ${session.id}`);
    console.log(`テーマ: ${session.theme}\n`);

    const concepts = JSON.parse(JSON.stringify(session.concepts));
    
    console.log(`生成されたコンセプト数: ${concepts.length}\n`);

    // 最初のコンセプトの構造を詳しく見る
    if (concepts[0]) {
      console.log('=== コンセプト構造の分析 ===\n');
      const concept = concepts[0];
      
      console.log(`コンセプトID: ${concept.conceptId}`);
      console.log(`タイトル: ${concept.conceptTitle}`);
      console.log(`フックタイプ: ${concept.hookType}`);
      console.log(`フック組み合わせ: ${JSON.stringify(concept.hookCombination)}`);
      console.log(`角度: ${concept.angle}`);
      console.log(`角度組み合わせ: ${JSON.stringify(concept.angleCombination)}`);
      
      console.log('\n構造体（structure）:');
      if (concept.structure) {
        console.log(`- openingHook: ${concept.structure.openingHook?.substring(0, 50)}...`);
        console.log(`- background: ${concept.structure.background?.substring(0, 50)}...`);
        console.log(`- mainContent: ${concept.structure.mainContent?.substring(0, 50)}...`);
      }
    }

  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkConceptStructure();