require('dotenv').config({ path: '.env.local' });
const { PerplexityClient } = require('./lib/perplexity.ts');

async function testPerplexityResponse() {
  try {
    const perplexity = new PerplexityClient();
    
    console.log('Perplexity APIテスト開始...');
    
    const response = await perplexity.searchWithContext({
      query: "最近のAI技術の進歩について教えてください",
      systemPrompt: "あなたはAI技術の専門家です。"
    });
    
    console.log('\n=== 完全なレスポンス構造 ===');
    console.log(JSON.stringify(response, null, 2));
    
    // citationsフィールドを探す
    console.log('\n=== レスポンスのキー ===');
    console.log(Object.keys(response));
    
    if (response.citations) {
      console.log('\n=== Citations ===');
      console.log(JSON.stringify(response.citations, null, 2));
    }
    
  } catch (error) {
    console.error('エラー:', error);
  }
}

testPerplexityResponse();