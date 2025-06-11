const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

async function testPerplexityParsing() {
  // 最新のレポートを取得
  const report = await prisma.perplexityReport.findFirst({
    orderBy: { createdAt: 'desc' }
  });
  
  if (report) {
    console.log('=== 生の分析データ ===\n');
    console.log(report.rawAnalysis.substring(0, 500) + '...\n');
    
    // パース関数をテスト
    const parsed = parsePerplexityAnalysis(report.rawAnalysis);
    console.log('=== パース結果 ===');
    console.log('トレンド数:', parsed.trends.length);
    console.log('トレンド:', parsed.trends);
    console.log('\nインサイト数:', parsed.insights.length);
    console.log('インサイト:', parsed.insights);
  }
  
  await prisma.$disconnect();
}

// Perplexityの分析を構造化（route.tsと同じロジック）
function parsePerplexityAnalysis(analysis) {
  const lines = analysis.split('\n').filter(line => line.trim());
  
  const trends = [];
  const insights = [];
  let currentSection = '';
  
  for (const line of lines) {
    if (line.includes('トレンド') || line.includes('注目')) {
      currentSection = 'trends';
    } else if (line.includes('解釈') || line.includes('視点')) {
      currentSection = 'insights';
    } else if (line.includes('投稿') || line.includes('ツイート')) {
      currentSection = 'posts';
    }
    
    if (line.match(/^\d+\./) || line.includes('・')) {
      if (currentSection === 'trends') {
        trends.push(line.replace(/^\d+\.|\・/, '').trim());
      } else if (currentSection === 'insights') {
        insights.push(line.replace(/^\d+\.|\・/, '').trim());
      }
    }
  }
  
  return {
    trends: trends.slice(0, 5),
    insights: insights.slice(0, 5),
    rawText: analysis
  };
}

testPerplexityParsing();