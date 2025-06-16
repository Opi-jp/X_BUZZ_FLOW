const { PrismaClient } = require('../lib/generated/prisma');
const prisma = new PrismaClient();

async function testPhase2IntegrateFix(sessionId) {
  try {
    // Get session with Phase 2 data
    const session = await prisma.cotSession.findUnique({
      where: { id: sessionId },
      include: {
        phases: {
          where: { phaseNumber: { in: [1, 2] } },
          orderBy: { phaseNumber: 'asc' }
        }
      }
    });

    if (!session) {
      console.error(`Session ${sessionId} not found`);
      return;
    }

    console.log('\n=== Session Info ===');
    console.log(`ID: ${session.id}`);
    console.log(`Expertise: ${session.expertise}`);
    console.log(`Current Phase: ${session.currentPhase}`);
    console.log(`Status: ${session.status}`);

    const phase2 = session.phases.find(p => p.phaseNumber === 2);
    if (!phase2) {
      console.error('\nPhase 2 not found');
      return;
    }

    console.log(`\n=== Phase 2 Status: ${phase2.status} ===`);

    // Check think result
    if (phase2.thinkResult) {
      const thinkResult = typeof phase2.thinkResult === 'string'
        ? JSON.parse(phase2.thinkResult)
        : phase2.thinkResult;

      console.log('\n📝 Think Result Structure:');
      console.log(`- concepts: ${thinkResult.concepts?.length || 0} items`);
      console.log(`- opportunityCount: ${thinkResult.opportunityCount}`);
      console.log(`- analysisInsights: ${thinkResult.analysisInsights ? 'present' : 'missing'}`);
      console.log(`- nextStepMessage: ${thinkResult.nextStepMessage ? 'present' : 'missing'}`);

      // Show the problematic integrate prompt
      console.log('\n⚠️  Current Phase 2 integrate prompt template:');
      console.log('```');
      console.log('# 分析とコンセプト');
      console.log('{opportunityCount}');
      console.log('{analysisInsights}');
      console.log('{concepts}');
      console.log('```');

      console.log('\n❌ This will produce:');
      console.log('```');
      console.log('# 分析とコンセプト');
      console.log(thinkResult.opportunityCount);
      console.log(thinkResult.analysisInsights);
      console.log(JSON.stringify(thinkResult.concepts, null, 2));
      console.log('```');

      console.log('\n✅ Fixed prompt should be:');
      console.log('```');
      console.log(`# 分析とコンセプト

## 発見された機会の数
${thinkResult.opportunityCount}件の潜在的なバイラル機会を特定しました。

## 分析の洞察
${thinkResult.analysisInsights}

## 生成されたコンセプト
以下の${thinkResult.concepts?.length || 0}つのコンセプトを生成しました：

${JSON.stringify(thinkResult.concepts, null, 2)}

これらのコンセプトから、最もバイラルポテンシャルの高いものを選択し、次のフェーズで完全なコンテンツに発展させます。

必ず以下のJSON形式で出力してください：
{
  "selectedOpportunities": [
    {
      "opportunity": "選択した機会のタイトル",
      "relevanceToExpertise": "専門分野との関連性の説明",
      "viralPotentialScore": 85,
      "contentAngle": "選択したコンテンツアングル",
      "targetAudience": "ターゲットオーディエンス",
      "emotionalTriggers": ["感情的トリガー1", "感情的トリガー2"],
      "newsSource": "ニュースソース",
      "sourceUrl": "URL"
    }
  ],
  "rationale": "なぜこれらの機会を選択したかの説明"
}`);
      console.log('```');

      // Check if concepts have proper data
      if (thinkResult.concepts?.length > 0) {
        console.log('\n📊 Concept Details:');
        thinkResult.concepts.forEach((concept, i) => {
          console.log(`\n${i + 1}. ${concept.title || concept.B}`);
          console.log(`   Format: ${concept.A}`);
          console.log(`   Hook: ${concept.B}`);
          console.log(`   Angle: ${concept.C}`);
          console.log(`   Source: ${concept.newsSource || 'N/A'}`);
          console.log(`   URL: ${concept.sourceUrl || 'N/A'}`);
        });
      }
    }

    // Check integrate result
    if (phase2.integrateResult) {
      const integrateResult = typeof phase2.integrateResult === 'string'
        ? JSON.parse(phase2.integrateResult)
        : phase2.integrateResult;

      console.log('\n📋 Current Integrate Result:');
      console.log(`- selectedOpportunities: ${integrateResult.selectedOpportunities?.length || 0}`);
      console.log(`- rationale: ${integrateResult.rationale ? 'present' : 'missing'}`);

      if (integrateResult.selectedOpportunities?.length === 0) {
        console.log('\n❌ No opportunities were selected - this is the bug!');
        console.log('The integrate prompt is not properly formatted, causing GPT to misunderstand.');
      }
    }

    console.log('\n=== Next Steps ===');
    console.log('1. Fix the Phase 2 integrate prompt in orchestrated-cot-strategy.ts');
    console.log('2. Add proper context extraction in buildContext for Phase 2');
    console.log('3. Ensure opportunityCount and analysisInsights are passed from thinkResult');
    console.log('4. Test with this session to verify the fix works');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get sessionId from command line
const sessionId = process.argv[2] || 'd00361fc-4ccc-41c1-90a3-6f0daf40d39d';
testPhase2IntegrateFix(sessionId);