const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

async function fixPerplexityReports() {
  console.log('=== 既存のPerplexityレポートを修正 ===\n');
  
  // すべてのレポートを取得
  const reports = await prisma.perplexityReport.findMany({
    orderBy: { createdAt: 'desc' }
  });
  
  console.log(`${reports.length}件のレポートを処理します\n`);
  
  for (const report of reports) {
    console.log(`レポート ${report.id} を処理中...`);
    
    // 改善されたパース関数でデータを再解析
    const parsed = parsePerplexityAnalysis(report.rawAnalysis);
    
    // personalAnglesを生成
    const personalAngles = generatePersonalAngles(parsed);
    
    // レポートを更新
    await prisma.perplexityReport.update({
      where: { id: report.id },
      data: {
        trends: parsed.trends,
        insights: parsed.insights,
        personalAngles: personalAngles
      }
    });
    
    console.log(`- トレンド: ${parsed.trends.length}件`);
    console.log(`- インサイト: ${parsed.insights.length}件`);
    console.log(`- パーソナル視点: ${personalAngles.length}件\n`);
  }
  
  console.log('修正完了！');
  await prisma.$disconnect();
}

// 改善されたパース関数（route.tsと同じロジック）
function parsePerplexityAnalysis(analysis) {
  const trends = [];
  const insights = [];
  const lines = analysis.split('\n');
  
  // トレンドの抽出（"#### 1. **XXX**" 形式）
  lines.forEach(line => {
    const trendMatch = line.match(/^####\s*\d+\.\s*\*\*(.+?)\*\*/);
    if (trendMatch) {
      trends.push(trendMatch[1]);
    }
  });
  
  // 独自解釈と逆張り視点の抽出
  let isInsightSection = false;
  lines.forEach((line, index) => {
    // セクションの開始を検出
    if (line.includes('**独自解釈**:') || line.includes('**逆張り視点**:')) {
      isInsightSection = true;
      return;
    }
    
    // セクションの終了を検出
    if (isInsightSection && line.trim() === '') {
      isInsightSection = false;
      return;
    }
    
    // インサイトの抽出
    if (isInsightSection && line.trim().startsWith('-')) {
      const insight = line.replace(/^-\s*/, '').trim();
      if (insight.length > 10) { // 短すぎるものを除外
        insights.push(insight);
      }
    }
  });
  
  return {
    trends: trends.slice(0, 5),
    insights: insights.slice(0, 5),
    rawText: analysis
  };
}

// パーソナル視点の生成
function generatePersonalAngles(parsed) {
  const angles = [];
  
  // トレンドに基づいて視点を生成
  if (parsed.trends.some(t => t.includes('AI') || t.includes('生成AI'))) {
    angles.push({
      type: 'creative-paradox',
      angle: '効率化の流れに逆らって「非効率の美学」を語る',
      hook: '23年の映像制作で学んだ「回り道が新しい発見を生む」経験',
      postTemplate: 'みんなが効率化を語る中、あえて「無駄な手作業」の価値を語りたい'
    });
  }
  
  if (parsed.trends.some(t => t.includes('新た') || t.includes('創出'))) {
    angles.push({
      type: 'future-past-bridge',
      angle: '最新技術と1990年代のデジャヴを語る',
      hook: 'CG黎明期にも同じことを言われた。歴史は繰り返すのか？',
      postTemplate: '今の○○を見ていると、1990年代の△△を思い出す。あの時も...'
    });
  }
  
  // インサイトから追加の視点を生成
  if (parsed.insights.some(i => i.includes('50代') || i.includes('セカンドキャリア'))) {
    angles.push({
      type: 'age-advantage',
      angle: '若者優位に対して経験者の価値を主張',
      hook: '50代だからこそ見える長期視点の重要性',
      postTemplate: 'Z世代の発想は素晴らしいが、50代の視点も捨てたものではない'
    });
  }
  
  return angles;
}

fixPerplexityReports();