// Perplexity初期化の問題を特定
const { default: Perplexity } = require('perplexity-sdk');

console.log('環境変数チェック:');
console.log('PERPLEXITY_API_KEY exists:', !!process.env.PERPLEXITY_API_KEY);
console.log('Key length:', process.env.PERPLEXITY_API_KEY?.length || 0);

try {
  console.log('\n初期化テスト:');
  const client = new Perplexity({
    apiKey: process.env.PERPLEXITY_API_KEY
  });
  console.log('✅ クライアント作成成功');
  console.log('Client type:', typeof client);
  console.log('Client methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(client)));
} catch (error) {
  console.error('❌ 初期化エラー:', error.message);
  console.error('Stack:', error.stack);
}