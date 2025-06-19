#!/usr/bin/env node

// Perplexity APIを直接テスト
const Perplexity = require('perplexity-sdk');

async function testPerplexity() {
  console.log('🔍 Perplexity SDK テスト開始\n');
  
  try {
    // SDKの初期化を確認
    console.log('Perplexity SDK:', Perplexity);
    console.log('typeof Perplexity:', typeof Perplexity);
    
    // コンストラクタを確認
    if (Perplexity.default) {
      console.log('Using Perplexity.default');
      const client = new Perplexity.default({ apiKey: process.env.PERPLEXITY_API_KEY });
      console.log('Client created:', client);
    } else if (typeof Perplexity === 'function') {
      console.log('Using Perplexity as constructor');
      const client = new Perplexity(process.env.PERPLEXITY_API_KEY);
      console.log('Client created:', client);
    } else {
      console.log('Perplexity structure:', Object.keys(Perplexity));
    }
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error('Stack:', error.stack);
  }
}

testPerplexity();