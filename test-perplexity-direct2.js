// Perplexityクライアントを直接テスト
const { PerplexityClient } = require('./lib/perplexity');

async function testPerplexityDirect() {
  const client = new PerplexityClient();
  
  try {
    console.log('🔍 Perplexity APIを直接テスト\n');
    
    const result = await client.searchWithContext(
      'AIと働き方の未来について最新のトレンドと議論を教えてください',
      ''
    );
    
    console.log('✅ レスポンス受信');
    console.log('Type:', typeof result);
    console.log('Keys:', Object.keys(result));
    
    if (result.choices && result.choices[0]) {
      const content = result.choices[0].message?.content;
      console.log('\n📝 コンテンツ:');
      console.log(content?.substring(0, 200) + '...');
      
      // JSON抽出をテスト
      const jsonMatch = content?.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        console.log('\n🔍 JSON部分を検出');
        const jsonStr = jsonMatch[1];
        console.log('JSON長さ:', jsonStr.length);
        
        try {
          const parsed = JSON.parse(jsonStr);
          console.log('✅ JSONパース成功');
          console.log('トピック数:', parsed.topics?.length || 0);
        } catch (parseErr) {
          console.error('❌ JSONパースエラー:', parseErr.message);
          console.log('問題のある位置:', jsonStr.substring(parseErr.position - 20, parseErr.position + 20));
        }
      }
    }
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error('Stack:', error.stack);
  }
}

testPerplexityDirect();