#!/usr/bin/env node

/**
 * コンテンツ生成のマトリクス分析
 * どれくらいの数が生成されるかを分析
 */

console.log('📊 コンテンツ生成マトリクス分析\n');

// 設定値
const config = {
  perplexity: {
    topicsPerRun: 2  // collect-topics.txtより
  },
  gpt: {
    conceptsPerTopic: 3  // generate-concepts.txtより（A、B、C）
  },
  claude: {
    charactersAvailable: ['cardi-dare', 'default'],  // 利用可能なキャラクター
    postsPerConcept: 1  // 各コンセプトごとに1投稿
  }
};

// 計算
const totalTopics = config.perplexity.topicsPerRun;
const totalConcepts = totalTopics * config.gpt.conceptsPerTopic;
const maxPosts = totalConcepts * config.claude.charactersAvailable.length;

console.log('=== 各フェーズの生成数 ===\n');

console.log(`1️⃣ Perplexity（トピック収集）`);
console.log(`   生成数: ${totalTopics}トピック`);
console.log('');

console.log(`2️⃣ GPT（コンセプト生成）`);
console.log(`   入力: ${totalTopics}トピック`);
console.log(`   生成数: ${totalTopics}トピック × ${config.gpt.conceptsPerTopic}コンセプト = ${totalConcepts}コンセプト`);
console.log('');

console.log(`3️⃣ Claude（投稿生成）`);
console.log(`   入力: ユーザーが選択したコンセプト（最大${totalConcepts}個）`);
console.log(`   キャラクター数: ${config.claude.charactersAvailable.length}`);
console.log(`   最大生成数: ${totalConcepts}コンセプト × ${config.claude.charactersAvailable.length}キャラクター = ${maxPosts}投稿`);
console.log('');

console.log('=== 問題点の分析 ===\n');

console.log('🚨 ボトルネック:');
console.log(`- GPT後に${totalConcepts}個のコンセプトから選択が必要`);
console.log(`- 全部選択すると最大${maxPosts}個の投稿が生成される`);
console.log(`- UIでの表示・選択が困難`);
console.log('');

console.log('=== 推奨する解決策 ===\n');

console.log('1. スコアリングによる自動フィルタリング');
console.log('   - viralScoreが高い順に上位3-4個を推奨');
console.log('   - ユーザーは推奨から選択（全表示も可能）');
console.log('');

console.log('2. 段階的な選択フロー');
console.log('   - Step 1: トピック確認（2個）→ 興味のあるトピックのみ進む');
console.log('   - Step 2: 選択したトピックのコンセプト確認（3個ずつ）');
console.log('   - Step 3: 選択したコンセプトでキャラクター選択');
console.log('');

console.log('3. プリセット選択');
console.log('   - 「バズ重視」: viralScore上位3つを自動選択');
console.log('   - 「バランス重視」: 各トピックから1つずつ選択');
console.log('   - 「カスタム」: 全て手動選択');
console.log('');

console.log('=== UI実装の提案 ===\n');

console.log('📱 トピック選択画面:');
console.log('   □ トピック1: タイトル（要約プレビュー）');
console.log('   □ トピック2: タイトル（要約プレビュー）');
console.log('   [選択したトピックで続行]');
console.log('');

console.log('💡 コンセプト選択画面:');
console.log('   トピック1のコンセプト（3個）');
console.log('   ⭐ コンセプトA [Score: 8.5] - 推奨');
console.log('   ○ コンセプトB [Score: 7.2]');
console.log('   ○ コンセプトC [Score: 6.8]');
console.log('');

console.log('🎭 キャラクター選択画面:');
console.log('   選択されたコンセプト × キャラクター');
console.log('   最終的な投稿数を確認して実行');