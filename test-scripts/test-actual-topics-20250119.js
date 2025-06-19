#!/usr/bin/env node

/**
 * 実際のtopicsデータでパーサーをテスト
 */

const fs = require('fs');
const { PerplexityResponseParser } = require('../lib/parsers/perplexity-response-parser');

// 実際のtopicsデータを読み込み
const topicsData = fs.readFileSync('/tmp/perplexity-topics.txt', 'utf-8');

console.log('📋 実際のtopicsデータでテスト');
console.log('データ長:', topicsData.length);
console.log('最初の200文字:', topicsData.substring(0, 200));
console.log('\n');

try {
  const topics = PerplexityResponseParser.parseTopics(topicsData);
  console.log('✅ パース成功！');
  console.log('トピック数:', topics.length);
} catch (error) {
  console.error('❌ パースエラー:', error.message);
  
  // 正規表現のマッチを確認
  const codeBlockRegex = /```\s*(?:json)?\s*\n([\s\S]*?)\n```/g;
  const matches = topicsData.match(codeBlockRegex);
  console.log('\n🔍 正規表現マッチ結果:');
  console.log('マッチ数:', matches ? matches.length : 0);
  
  if (matches) {
    matches.forEach((match, i) => {
      console.log(`\nマッチ ${i + 1}:`);
      console.log(match.substring(0, 100) + '...');
    });
  }
}