// APIテストスクリプト
const baseUrl = 'http://localhost:3000/api';

async function testAPI() {
  console.log('🧪 BuzzFlow API テスト開始\n');

  // 1. バズ投稿一覧取得
  console.log('1️⃣ バズ投稿一覧取得');
  try {
    const res = await fetch(`${baseUrl}/buzz-posts`);
    const data = await res.json();
    console.log('✅ 成功:', data);
  } catch (error) {
    console.log('❌ エラー:', error.message);
  }

  // 2. バズ投稿作成
  console.log('\n2️⃣ バズ投稿作成');
  try {
    const res = await fetch(`${baseUrl}/buzz-posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postId: `test${Date.now()}`,
        content: 'これはテスト投稿です。APIのテストのために作成しました。',
        authorUsername: 'testuser',
        authorId: 'user123',
        likesCount: 1500,
        retweetsCount: 300,
        repliesCount: 50,
        impressionsCount: 10000,
        postedAt: new Date().toISOString(),
        url: 'https://twitter.com/testuser/status/test123456789',
        theme: 'テスト',
        language: 'ja',
        mediaUrls: [],
        hashtags: ['テスト', 'API'],
      }),
    });
    const data = await res.json();
    console.log('✅ 成功:', data);
  } catch (error) {
    console.log('❌ エラー:', error.message);
  }

  // 3. AIパターン作成
  console.log('\n3️⃣ AIパターン作成');
  try {
    const res = await fetch(`${baseUrl}/ai-patterns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '異常値導入型',
        description: '日常的な話題に異常な数値を導入してインパクトを与えるパターン',
        promptTemplate: '以下の投稿を参考に、異常な数値や状況を含む投稿を生成してください：\\n\\n{{content}}',
        exampleOutput: '朝起きたら枕元に現金300万円が置いてあった。',
      }),
    });
    const data = await res.json();
    console.log('✅ 成功:', data);
  } catch (error) {
    console.log('❌ エラー:', error.message);
  }

  // 4. AI文案生成（Claude API）
  console.log('\n4️⃣ AI文案生成');
  try {
    const res = await fetch(`${baseUrl}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customPrompt: 'バズりそうな日常系の投稿を1つ生成してください。140文字以内で。',
      }),
    });
    const data = await res.json();
    console.log('✅ 成功:', data);
  } catch (error) {
    console.log('❌ エラー:', error.message);
  }

  console.log('\n✨ テスト完了');
}

// 実行
testAPI();