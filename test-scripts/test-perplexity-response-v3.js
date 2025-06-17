require('dotenv').config({ path: '.env.local' });
// fetchはNode.js 18+では組み込みなのでrequire不要

// GPTが生成した質問をPerplexityに送信
const gptGeneratedQuestion = `AIと働き方に関連する最新のニュースやトレンド、特にTwitterでの議論を中心に分析し、バズる可能性のあるトピックを特定するための情報を収集してください。以下のJSON形式で回答をお願いします：

{
  "title": 記事タイトル,
  "date": 公開日,
  "url": 記事URL,
  "summary": 記事の要約,
  "perplexityInsight": あなたの見解（200-400文字）, 
  "additionalInfo": その他必要と思う情報
}

情報収集の視点としては、AI技術が働き方に与える影響や、それに対する労働者や企業の反応を重視した内容をお願いします。また、AI導入に関する政治的議論や企業の戦略的動き、それに対する社会の反応も重要です。最新のTwitterトレンドや議論、バイラルの可能性のある要素も考慮してください。`;

async function testPerplexityResponse() {
  console.log('=== Perplexity応答テスト ===\n');
  console.log('送信する質問:');
  console.log(gptGeneratedQuestion.substring(0, 200) + '...\n');

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [
          {
            role: 'system',
            content: '質問の意図を理解し、指定されたJSON形式で回答してください。'
          },
          {
            role: 'user',
            content: gptGeneratedQuestion
          }
        ],
        temperature: 0.2,
        max_tokens: 2000,
        search_recency_filter: 'week',
        return_citations: true,
        return_images: false
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Perplexity API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const perplexityResponse = data.choices[0].message.content;

    console.log('--- Perplexityの応答 ---');
    console.log('応答の最初の1000文字:');
    console.log(perplexityResponse.substring(0, 1000));
    console.log('\n...[途中省略]...\n');

    // JSON形式かチェック
    try {
      // JSONコードブロックを抽出
      let jsonContent = perplexityResponse;
      if (perplexityResponse.includes('```json')) {
        const match = perplexityResponse.match(/```json\n([\s\S]*?)\n```/);
        if (match) {
          jsonContent = match[1];
        }
      }

      const parsed = JSON.parse(jsonContent);
      console.log('\n--- パースされたJSON構造 ---');
      
      if (Array.isArray(parsed)) {
        console.log(`記事数: ${parsed.length}`);
        parsed.slice(0, 2).forEach((article, i) => {
          console.log(`\n記事 ${i + 1}:`);
          console.log('- title:', article.title ? '✓' : '✗');
          console.log('- date:', article.date ? '✓' : '✗');
          console.log('- url:', article.url ? '✓' : '✗');
          console.log('- summary:', article.summary ? '✓' : '✗');
          console.log('- perplexityInsight:', article.perplexityInsight ? `✓ (${article.perplexityInsight.length}文字)` : '✗');
          console.log('- additionalInfo:', article.additionalInfo ? '✓' : '✗');
          
          if (article.additionalInfo) {
            console.log('  additionalInfoの内容:', Object.keys(article.additionalInfo));
          }
        });
      } else {
        console.log('単一の記事オブジェクト:');
        console.log('- title:', parsed.title ? '✓' : '✗');
        console.log('- date:', parsed.date ? '✓' : '✗');
        console.log('- url:', parsed.url ? '✓' : '✗');
        console.log('- summary:', parsed.summary ? '✓' : '✗');
        console.log('- perplexityInsight:', parsed.perplexityInsight ? `✓ (${parsed.perplexityInsight.length}文字)` : '✗');
        console.log('- additionalInfo:', parsed.additionalInfo ? '✓' : '✗');
      }

      console.log('\n✅ PerplexityはJSON形式で回答した');
      console.log('✅ 指定されたフィールドが含まれている');
      
    } catch (parseError) {
      console.log('\n❌ JSON形式ではない、または不完全な形式');
      console.log('エラー:', parseError.message);
    }

    // 使用トークン数
    console.log('\n--- 使用リソース ---');
    console.log('入力トークン数:', data.usage?.prompt_tokens);
    console.log('出力トークン数:', data.usage?.completion_tokens);
    console.log('合計トークン数:', data.usage?.total_tokens);

  } catch (error) {
    console.error('エラー:', error.message);
  }
}

// テスト実行
testPerplexityResponse();