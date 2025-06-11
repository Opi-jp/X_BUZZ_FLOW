// シンプルな収集テスト
require('dotenv').config({ path: '.env.local' });

async function testSimpleCollect() {
  try {
    console.log('Testing simple collection...');
    
    const requestBody = {
      query: 'AI 効率化',  // シンプルなクエリ
      minLikes: 100,
      minRetweets: 10,
      maxItems: 5
    };
    
    console.log('Request:', requestBody);
    
    const response = await fetch('http://localhost:3000/api/collect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Result:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testSimpleCollect();