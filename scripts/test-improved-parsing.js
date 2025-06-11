const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

async function testImprovedParsing() {
  // 最新のレポートを取得
  const report = await prisma.perplexityReport.findFirst({
    orderBy: { createdAt: 'desc' }
  });
  
  if (report) {
    console.log('=== 生の分析データ（最初の1000文字） ===\n');
    console.log(report.rawAnalysis.substring(0, 1000));
    console.log('\n...\n');
    
    // 改善されたパース関数をテスト
    const parsed = parsePerplexityAnalysisImproved(report.rawAnalysis);
    console.log('=== 改善されたパース結果 ===');
    console.log('トレンド数:', parsed.trends.length);
    console.log('トレンド:', parsed.trends);
    console.log('\nインサイト数:', parsed.insights.length);
    console.log('インサイト:', parsed.insights.slice(0, 2));
  }
  
  await prisma.$disconnect();
}

// 改善されたパース関数
function parsePerplexityAnalysisImproved(analysis) {
  const trends = [];
  const insights = [];
  const rpTargets = [];
  
  // 改善されたパースロジック
  const sections = analysis.split(/###|####/).filter(s => s.trim());
  
  sections.forEach(section => {
    const lines = section.split('\n').filter(line => line.trim());
    if (lines.length === 0) return;
    
    const title = lines[0].toLowerCase();
    
    // トレンドの抽出
    if (title.includes('トレンド') || title.includes('注目')) {
      // タイトル付きのトレンドを抽出
      lines.forEach(line => {
        if (line.match(/^\d+\./)) {
          const trendMatch = line.match(/\*\*(.+?)\*\*/);
          if (trendMatch) {
            trends.push(trendMatch[1]);
          } else {
            // タイトルがない場合は全体を使用
            trends.push(line.replace(/^\d+\.\s*/, '').trim());
          }
        }
      });
    }
    
    // 解釈・視点の抽出
    if (title.includes('解釈') || title.includes('視点') || title.includes('独自')) {
      lines.forEach(line => {
        if (line.startsWith('-') || line.startsWith('・')) {
          insights.push(line.replace(/^-|^・\s*/, '').trim());
        }
      });
    }
    
    // 逆張り視点の抽出
    if (title.includes('逆張り') || title.includes('投稿')) {
      lines.forEach(line => {
        if (line.startsWith('-') || line.startsWith('・')) {
          insights.push(line.replace(/^-|^・\s*/, '').trim());
        }
      });
    }
  });
  
  return {
    trends: trends.slice(0, 5),
    insights: insights.slice(0, 5),
    rawText: analysis
  };
}

testImprovedParsing();