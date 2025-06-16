// Step 1: GPTにクエリを生成させる
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generateSearchQueries() {
  console.log('=== GPT検索クエリ生成テスト ===\n');
  
  const prompt = `
# ユーザー設定
* 発信したい分野: AIと働き方
* コンテンツのスタイル: 洞察的
* プラットフォーム: Twitter

# タスク
ユーザーの入力した情報をもとに、下記の視点に基づいてWEB検索のためのクエリを生成してください。

## A：現在の出来事の分析
- 最新ニュース
- 有名人の事件と世間の反応
- 議論が巻きおこるような政治的展開

## B：テクノロジーの発表とテクノロジードラマ
- ビジネスニュースと企業論争
- 文化的瞬間と社会運動
- スポーツイベントと予想外の結果
- インターネットドラマとプラットフォーム論争

## C：ソーシャルリスニング研究
- Twitterのトレンドトピックとハッシュタグの速度
- TikTokサウンドとチャレンジの出現
- Redditのホットな投稿とコメントの感情
- Googleトレンドの急上昇パターン
- YouTubeトレンド動画分析
- ニュース記事のコメント欄
- ソーシャルメディアのエンゲージメントパターン

## D：バイラルパターン認識
バイラルが起きる可能性があるトピックを特定する:
- 論争レベル（強い意見を生み出す）
- 感情の強さ（怒り、喜び、驚き、憤慨）
- 共感性要因（多くの人に影響を与える）
- 共有可能性（人々が広めたいと思うこと）
- タイミングの敏感さ（関連性のウィンドウが狭い）
- プラットフォーム調整（Twitter文化に適合）

# 出力形式
必ず以下のJSON形式で出力してください：
{
  "queries": [
    {
      "category": "A/B/C/D",
      "topic": "AIと働き方に関連する具体的なトピック",
      "query": "検索クエリ（英語）",
      "queryJa": "検索クエリ（日本語）",
      "intent": "何を探しているか"
    }
  ]
}

重要：
- AIと働き方に関連する最新の出来事やトレンドを捉える
- 各カテゴリ（A〜D）の視点を活用してクエリを生成
- 検索結果から**最低3つ以上、最大5つまでのトレンドトピック**を抽出できるようなクエリを設計
`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { 
          role: 'system', 
          content: 'あなたは、新たなトレンドを特定し、流行の波がピークに達する前にその波に乗るコンテンツのコンセプトを作成するバズるコンテンツ戦略家です。' 
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');
    
    console.log('生成されたクエリ数:', result.queries?.length || 0);
    console.log('\n=== 生成されたクエリ ===');
    
    result.queries?.forEach((q, i) => {
      console.log(`\n${i + 1}. カテゴリ ${q.category}: ${q.topic}`);
      console.log(`   英語: ${q.query}`);
      console.log(`   日本語: ${q.queryJa}`);
      console.log(`   意図: ${q.intent}`);
    });
    
    // 結果をファイルに保存（次のステップで使用）
    const fs = await import('fs/promises');
    await fs.writeFile(
      'generated-queries.json', 
      JSON.stringify(result, null, 2)
    );
    console.log('\n✅ クエリを generated-queries.json に保存しました');
    
  } catch (error) {
    console.error('エラー:', error);
  }
}

generateSearchQueries();