// 最小限のPerplexityテスト
const { PerplexityClient } = require('./lib/perplexity');
const fs = require('fs');

async function test() {
  const client = new PerplexityClient();
  
  try {
    const result = await client.searchWithContext(
      'AIツールの最新ニュース',
      '簡潔に1つのトピックをJSON形式で返してください'
    );
    
    console.log('Response type:', typeof result);
    console.log('Has choices:', !!result.choices);
    
    if (result.choices?.[0]?.message?.content) {
      const content = result.choices[0].message.content;
      console.log('\nContent length:', content.length);
      console.log('First 200 chars:', content.substring(0, 200));
      
      // ファイルに保存
      fs.writeFileSync('test-perplexity-raw.txt', content);
      console.log('\nSaved to test-perplexity-raw.txt');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();