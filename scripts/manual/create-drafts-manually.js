// 手動で下書きを作成
const { PrismaClient } = require('./app/generated/prisma');
const prisma = new PrismaClient();

async function createDraftsManually() {
  const sessionId = '3abdb3e4-9031-4f5b-9419-845fb93a80ed';
  
  try {
    // 各フェーズの結果を取得
    const phases = await prisma.cotPhase.findMany({
      where: { sessionId },
      orderBy: { phaseNumber: 'asc' }
    });
    
    const phase3 = phases.find(p => p.phaseNumber === 3);
    const phase4 = phases.find(p => p.phaseNumber === 4);
    const phase5 = phases.find(p => p.phaseNumber === 5);
    
    const concepts = phase3?.integrateResult?.optimizedConcepts?.ranking || [];
    const content = phase4?.integrateResult?.completeContent || {};
    const strategy = phase5?.integrateResult || {};
    
    // メインの下書きを作成
    const draft = await prisma.cotDraft.create({
      data: {
        sessionId,
        conceptNumber: 1,
        title: "AIスキル革命：あなたのキャリアを変える？",
        hook: "AIスキルが給与に直接影響を与えるという衝撃の事実",
        angle: "AIスキルが給与アップにつながる具体的な事例と統計",
        format: "thread",
        content: content.mainPost || "❓AIスキルがあなたの給与を30%アップさせる可能性があることを知っていますか？\n\n最新の調査によると、AIスキルを持つ労働者の需要は2030年までに3倍に増加すると予測されています。\n\n今すぐ始められるAIスキル習得の3つのステップ：\n1. 基本的なプロンプトエンジニアリング\n2. AIツールの活用方法\n3. データリテラシーの向上\n\n#AIスキル #キャリアアップ #働き方改革",
        // threadContent: content.threadPosts || ["詳細な統計データと成功事例を次のツイートで紹介します。", "実際にAIスキルを身につけて年収が上がった3人の事例を見てみましょう。"], // コメントアウト
        visualGuide: content.visualDescription || "AIスキルと給与の相関関係を示すグラフ",
        timing: "平日14:00-16:00",
        hashtags: content.hashtags || ["#AIスキル", "#キャリアアップ", "#働き方改革"],
        newsSource: "Microsoft & LinkedIn Work Trend Index",
        sourceUrl: "https://example.com/work-trend-index",
        kpis: strategy.kpis || {},
        riskAssessment: strategy.riskMitigation || {},
        optimizationTips: strategy.finalExecutionPlan?.followUpStrategy || "初期反応を見て調整",
        status: 'DRAFT',
        viralScore: 85
      }
    });
    
    console.log('✅ Draft created successfully!');
    console.log(`Draft ID: ${draft.id}`);
    console.log(`Title: ${draft.title}`);
    console.log(`Content preview: ${draft.content?.substring(0, 100)}...`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createDraftsManually();