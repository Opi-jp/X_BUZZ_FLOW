const dotenv = require('dotenv');
dotenv.config();

const prompt = `【AIと働き方】について【Twitter】において【エンターテイメント】で発信するためのバズるコンテンツを作成したいです。

以下の視点でトレンド情報を収集・分析し、直近でバズリそうなトピックを3つ特定してください。その際には判断の元となったニュースソースのURLを明記してください。ニュースソースは複数でも構いません。なお、ニュースソースは48時間以内のものを使用してください。

A：現在の出来事の分析
- AIと働き方に関する最新ニュース（特に感情的な反応を引き起こしているもの）
- この分野での有名人の発言や事件と、それに対する世間の強い反応
- AIと労働に関する政治的議論で意見が分かれているもの

B：テクノロジーの発表とテクノロジードラマ
- AI導入を巡る企業の対立や論争
- AIによる働き方の変化に関する文化的な衝突や社会運動
- 予想外の展開や驚きを生んだ事例
- インターネット上で話題になっているドラマチックな出来事

C：ソーシャルリスニング研究
- Twitterで急速に広がっているAIと働き方のトレンドやハッシュタグ
- TikTokで話題のAI関連のサウンドやチャレンジ
- Redditで感情的な議論が起きている投稿
- 急上昇しているGoogleトレンド
- バズっているYouTube動画
- ニュース記事のコメント欄で熱い議論になっているトピック

D：バイラルパターン認識
特に以下の要素を含むトピックを重点的に探してください：
- 強い意見の対立がある（賛成派vs反対派）
- 感情を強く刺激する（怒り、喜び、驚き、憤慨）
- 多くの人が共感できる体験談
- 思わずシェアしたくなる驚きの事実
- 今すぐ知らないと損するタイムリーな話題
- Twitter文化に合った面白さやミーム性

なお、出力は下記のJSON形式で出力してください。

{
  "TOPIC": "トピックのタイトル",
  "perplexityAnalysis": "なぜこれがバズる可能性があるのか、感情的な要素や対立構造を含めて分析（200文字）",
  "url": "記事のURL",
  "date": "公開日",
  "summary": "記事要約（200文字）"
}`;

async function testPerplexity() {
  try {
    console.log('Perplexity APIを直接呼び出します...');
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [
          {
            role: 'system',
            content: '質問の意図を理解し、適切な情報を提供してください。必ずURLと日付を含めてください。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.7,
        top_p: 0.9
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('\n=== Perplexityの回答 ===\n');
      console.log(data.choices[0].message.content);
      
      // citationsがある場合は表示
      if (data.citations && data.citations.length > 0) {
        console.log('\n=== Citations ===');
        data.citations.forEach((citation, index) => {
          console.log(`${index + 1}. ${citation}`);
        });
      }
      
      // search_resultsがある場合は表示
      if (data.search_results && data.search_results.length > 0) {
        console.log('\n=== Search Results ===');
        data.search_results.forEach((result, index) => {
          console.log(`${index + 1}. ${result.title}`);
          console.log(`   URL: ${result.url}`);
          if (result.date) console.log(`   Date: ${result.date}`);
          console.log('');
        });
      }
      
      // 応答時間を表示
      console.log('\n応答文字数:', data.choices[0].message.content.length);
    } else {
      console.error('エラー:', data);
    }
    
  } catch (error) {
    console.error('エラー:', error.message);
  }
}

testPerplexity();
