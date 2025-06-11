const fs = require('fs');

// テスト結果の分析
const testResults = {
  'AI×クリエイティブ（シンプル）': {
    relevanceScore: 0.3,
    issues: [
      '概念的な議論が多い',
      '実践例が少ない',
      'AI一般論が多い'
    ],
    goodExamples: []
  },
  'AI×クリエイティブ（詳細）': {
    relevanceScore: 0.4,
    issues: [
      'まだ概念的な内容が多い',
      'クリエイティブ分野以外も混入',
      '実際の活用例が不足'
    ],
    goodExamples: []
  },
  'ChatGPT/Claude活用': {
    relevanceScore: 0.5,
    issues: [
      '使い方の一般論が多い',
      '具体的な成果が不明確',
      'ビジネス活用が少ない'
    ],
    goodExamples: []
  }
};

// 改善されたクエリ案
const improvedQueries = [
  {
    name: '【自動】AI実践成果報告',
    query: '(ChatGPT OR Claude) (作った OR 作成した OR 完成した OR できた) (サイト OR アプリ OR ツール OR システム)',
    rationale: '実際に何かを作った報告に焦点',
    expectedRelevance: 0.8
  },
  {
    name: '【自動】AI効率化実例',
    query: '(AI OR ChatGPT) (時間短縮 OR 効率化 OR 自動化) (時間 OR 分 OR 秒) (かかった OR 短縮)',
    rationale: '具体的な数値を含む効率化事例',
    expectedRelevance: 0.7
  },
  {
    name: '【自動】AI収益化事例',
    query: '(ChatGPT OR Claude OR AI) (売上 OR 収益 OR 稼いだ OR 円 OR 万円)',
    rationale: '実際の収益を報告している投稿',
    expectedRelevance: 0.9
  },
  {
    name: '【手動】映像×AI活用',
    query: '(AI OR 生成AI) (映像 OR 動画 OR プロジェクションマッピング OR VFX)',
    rationale: 'ユーザーの専門分野に特化',
    expectedRelevance: 0.6
  },
  {
    name: '【手動】クリエイティブディレクター×AI',
    query: '(クリエイティブディレクター OR CD) (AI OR ChatGPT)',
    rationale: '同じ職種の人の活用例',
    expectedRelevance: 0.7
  }
];

// 分析レポート生成
const report = {
  summary: '現在のクエリは概念的な議論を多く拾ってしまい、実践例が少ない',
  recommendations: [
    '「作った」「完成した」など成果を示す動詞を含める',
    '具体的な数値（時間、金額）を含むクエリを使用',
    'ユーザーの専門分野（映像制作）に特化したクエリも用意',
    '自動化用は汎用的に、手動用は専門的に分ける'
  ],
  improvedQueries
};

// レポートを保存
fs.writeFileSync('kaito-analysis-report.json', JSON.stringify(report, null, 2));

console.log('=== Kaito API 分析レポート ===\n');
console.log(`要約: ${report.summary}\n`);
console.log('推奨事項:');
report.recommendations.forEach(rec => {
  console.log(`- ${rec}`);
});
console.log('\n改善されたクエリ案:');
improvedQueries.forEach(q => {
  console.log(`\n${q.name}`);
  console.log(`クエリ: ${q.query}`);
  console.log(`理由: ${q.rationale}`);
  console.log(`予想関連性: ${q.expectedRelevance * 100}%`);
});