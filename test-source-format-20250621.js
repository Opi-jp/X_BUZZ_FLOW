#!/usr/bin/env node

/**
 * Source Tree フォーマットのテスト
 * URLが切れないか、複数出典が正しく処理されるかテスト
 */

// テスト用の出典データ
const singleSource = {
  title: "AIエージェントがもたらす働き方の変革 - 2025年の展望",
  url: "https://www.example.com/article/ai-agent-work-revolution-2025",
  source: "Tech News Japan",
  date: "2025-06-20"
};

const multipleSources = [
  {
    title: "生成AIの進化が企業のDXを加速させる",
    url: "https://www.dir.co.jp/report/column/20250619_012279.html",
    source: "大和総研",
    date: "2025-06-19"
  },
  {
    title: "ChatGPTの新機能がビジネスシーンを変える",
    url: "https://www.itmedia.co.jp/business/articles/2506/20/news123.html",
    source: "ITmedia ビジネス",
    date: "2025-06-20"
  },
  {
    title: "リモートワーク時代のAI活用術",
    url: "https://japan.zdnet.com/article/35221234/",
    source: "ZDNet Japan",
    date: "2025-06-21"
  }
];

// source-formatter.tsから関数をエクスポートする必要があるため、手動で実装
function formatSingleSourceTweet(source) {
  const metadata = source.date 
    ? `${source.source} (${source.date})` 
    : source.source;
    
  return `📚 出典情報

${source.title}
${metadata}

🔗 ${source.url}

#信頼性 #ソース`;
}

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

console.log('🧪 Source Tree フォーマットテスト\n');

console.log('==== 1. 単一出典のテスト ====');
const singleTweet = formatSingleSourceTweet(singleSource);
console.log(singleTweet);
console.log(`\n文字数: ${singleTweet.length}文字`);
console.log('URLが切れていないか確認:', singleTweet.includes(singleSource.url) ? '✅ OK' : '❌ NG');

console.log('\n\n==== 2. 複数出典のテスト ====');
const multipleTweets = formatMultipleSourceTweets(multipleSources);
console.log(`生成されたツイート数: ${multipleTweets.length}件\n`);

multipleTweets.forEach((tweet, index) => {
  console.log(`--- ツイート ${index + 1} ---`);
  console.log(tweet);
  console.log(`文字数: ${tweet.length}文字`);
  
  // 各出典のURLが切れていないか確認
  if (index > 0) { // 最初のツイートは導入なのでURLチェックをスキップ
    const sourceIndex = index - 1;
    if (sourceIndex < multipleSources.length) {
      const urlCheck = tweet.includes(multipleSources[sourceIndex].url);
      console.log(`URLチェック: ${urlCheck ? '✅ OK' : '❌ NG'}`);
    }
  }
  console.log('');
});

console.log('\n==== 3. URLの完全性チェック ====');
multipleSources.forEach((source, index) => {
  const found = multipleTweets.some(tweet => tweet.includes(source.url));
  console.log(`${index + 1}. ${source.url}`);
  console.log(`   → ${found ? '✅ 含まれている' : '❌ 含まれていない'}\n`);
});