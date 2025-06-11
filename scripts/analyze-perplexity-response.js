const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

async function analyzePerplexityResponse() {
  const report = await prisma.perplexityReport.findFirst({
    orderBy: { createdAt: 'desc' }
  });
  
  if (report) {
    console.log('=== 分析データの構造を確認 ===\n');
    
    // 行ごとに分析
    const lines = report.rawAnalysis.split('\n');
    console.log('総行数:', lines.length);
    
    // 主要なセクションを探す
    const sections = [];
    lines.forEach((line, index) => {
      if (line.includes('###')) {
        sections.push({ index, line: line.trim() });
      }
    });
    
    console.log('\n=== セクション一覧 ===');
    sections.forEach(s => console.log(`行${s.index}: ${s.line}`));
    
    // トレンドっぽい部分を探す
    console.log('\n=== トレンドらしきもの ===');
    lines.forEach((line, index) => {
      if (line.match(/^\d+\.\s*\*\*.*\*\*/) || line.match(/^####\s*\d+\./)) {
        console.log(`行${index}: ${line.trim()}`);
      }
    });
    
    // 独自視点を探す
    console.log('\n=== 独自視点らしきもの ===');
    lines.forEach((line, index) => {
      if (line.includes('独自') || line.includes('視点') || line.includes('逆張り')) {
        console.log(`行${index}: ${line.trim()}`);
        // 次の数行も表示
        for (let i = 1; i <= 3 && index + i < lines.length; i++) {
          if (lines[index + i].trim()) {
            console.log(`  +${i}: ${lines[index + i].trim()}`);
          }
        }
      }
    });
    
    // 最適なパース方法を提案
    console.log('\n=== パース方法の提案 ===');
    console.log('1. "#### 1. **XXX**" 形式でトレンドを抽出');
    console.log('2. "**独自解釈**:" の後の箇条書きを視点として抽出');
    console.log('3. "**逆張り視点**:" の後の内容も含める');
  }
  
  await prisma.$disconnect();
}

analyzePerplexityResponse();