const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

async function checkPerplexityReports() {
  console.log('=== Perplexityレポート確認 ===\n');
  
  const reports = await prisma.perplexityReport.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  
  console.log('レポート数:', reports.length);
  
  reports.forEach((report, index) => {
    console.log(`\n--- レポート ${index + 1} ---`);
    console.log('ID:', report.id);
    console.log('作成日時:', report.createdAt);
    console.log('Focus:', report.focus);
    console.log('バズ予測:', report.buzzPrediction);
    console.log('トレンド数:', report.trends.length);
    console.log('パーソナル視点数:', report.personalAngles?.length || 0);
    console.log('推奨アクション:', report.recommendations?.immediateAction?.length || 0);
    
    // 最初のレポートの詳細を表示
    if (index === 0) {
      console.log('\n詳細情報:');
      console.log('トレンド:', report.trends.slice(0, 3));
      console.log('パーソナル視点:', report.personalAngles?.slice(0, 2));
      console.log('分析テキスト長:', report.rawAnalysis?.length || 0);
    }
  });
  
  await prisma.$disconnect();
}

checkPerplexityReports();