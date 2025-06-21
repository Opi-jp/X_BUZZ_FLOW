#!/usr/bin/env node

/**
 * 複数出典のSource Tree生成テスト
 * 3件以上の出典がある場合の動作確認
 */

// formatMultipleSourceTweetsのロジックを再現
function formatMultipleSourceTweets(sources) {
  const tweets = [];
  
  // 最初のツイートは導入
  tweets.push(`📚 出典情報（${sources.length}件）

以下、今回の分析で参照した情報源です。

#信頼性 #ソース`);
  
  // 各出典を個別のツイートに
  sources.forEach((source, index) => {
    const metadata = source.date 
      ? `${source.source} (${source.date})` 
      : source.source;
      
    const tweet = `【出典 ${index + 1}/${sources.length}】

${source.title}
${metadata}

🔗 ${source.url}`;
    
    tweets.push(tweet);
  });
  
  return tweets;
}

// 3件の出典でテスト
const testSources = [
  {
    title: "AIエージェントが変える企業の業務効率化",
    url: "https://www.itmedia.co.jp/business/articles/2506/21/news001.html",
    source: "ITmedia",
    date: "2025-06-21"
  },
  {
    title: "ChatGPT新機能で加速するビジネス革新",
    url: "https://japan.zdnet.com/article/35221999/",
    source: "ZDNet Japan",
    date: "2025-06-20"
  },
  {
    title: "生成AIがもたらす働き方の未来",
    url: "https://www.dir.co.jp/report/column/20250619_012279.html",
    source: "大和総研",
    date: "2025-06-19"
  }
];

console.log('🧪 複数出典のSource Tree生成テスト\n');

const tweets = formatMultipleSourceTweets(testSources);

console.log(`📊 生成されたツイート数: ${tweets.length}件\n`);

tweets.forEach((tweet, index) => {
  console.log(`━━━ ツイート ${index + 1} ━━━`);
  console.log(tweet);
  console.log(`\n文字数: ${tweet.length}文字`);
  
  // URLチェック
  if (index > 0) { // 最初は導入なのでスキップ
    const sourceIndex = index - 1;
    if (sourceIndex < testSources.length) {
      const expectedUrl = testSources[sourceIndex].url;
      const contains = tweet.includes(expectedUrl);
      console.log(`URL完全性: ${contains ? '✅ OK' : '❌ NG'}`);
    }
  }
  console.log('');
});

console.log('==== まとめ ====');
console.log('1. 導入ツイート（出典数を明示）');
console.log('2-4. 各出典の個別ツイート');
console.log('\nこれにより、複数の出典がある場合でも各URLが完全に表示されます。');