#!/usr/bin/env node

/**
 * Perplexity直接検索テスト
 * 目的：GPTが生成した検索クエリをPerplexityで直接実行し、品質を評価する
 */

import dotenv from 'dotenv';
import OpenAI from 'openai';

// 環境変数読み込み
dotenv.config({ path: ['.env.local', '.env'] });

// Perplexity APIクライアント（簡易実装）
class PerplexityClient {
  constructor() {
    this.apiKey = process.env.PERPLEXITY_API_KEY;
    this.baseUrl = 'https://api.perplexity.ai';
    this.model = 'llama-3.1-sonar-large-128k-online';
  }
  
  async searchWithContext(options) {
    const { query, systemPrompt, searchRecency = 'week' } = options;
    
    const requestBody = {
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ],
      temperature: 0.2,
      max_tokens: 3000,
      search_recency_filter: searchRecency,
      return_citations: true
    };
    
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Perplexity API error: ${response.status} - ${error}`);
    }
    
    return await response.json();
  }
}

async function testPerplexityDirectSearch() {
  console.log('🚀 Perplexity直接検索テストを開始します...\n');
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  
  // Phase 1 Think: GPTに検索クエリを生成させる
  console.log('📝 Phase 1 Think: 検索クエリ生成中...');
  
  const expertise = 'AIと働き方';
  const style = '解説';
  const platform = 'Twitter';
  
  // orchestrated-cot-strategy-v2.tsから完全なプロンプトを使用
  const phase1ThinkPrompt = `
# ユーザー設定
* 発信したい分野: ${expertise}
* コンテンツのスタイル: ${style}
* プラットフォーム: ${platform}

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
- プラットフォーム調整（${platform}文化に適合）

# 出力形式
必ず以下のJSON形式で出力してください：
{
  "analysisApproach": {
    "A_currentEvents": ["検索する現在の出来事のトピック"],
    "B_technology": ["テクノロジー関連のトピック"],
    "C_socialListening": ["ソーシャルリスニングのターゲット"],
    "D_viralPatterns": ["バイラルパターンの特徴"]
  },
  "queries": [
    {
      "category": "A/B/C/D",
      "topic": "${expertise}に関連する具体的なトピック",
      "query": "検索クエリ（英語）",
      "queryJa": "検索クエリ（日本語）",
      "intent": "何を探しているか",
      "viralPotential": {
        "controversy": "高/中/低",
        "emotion": "高/中/低",
        "relatability": "高/中/低",
        "shareability": "高/中/低",
        "timeSensitivity": "高/中/低",
        "platformFit": "高/中/低"
      }
    }
  ]
}

重要：
- ${expertise}に関連する最新の出来事やトレンドを捉える
- 各カテゴリ（A〜D）の視点を活用してクエリを生成
- 検索結果から**最低3つ以上、最大5つまでのトレンドトピック**を抽出できるようなクエリを設計`;
  
  const thinkStartTime = Date.now();
  const thinkResponse = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'あなたはバズるコンテンツ戦略家です。' },
      { role: 'user', content: phase1ThinkPrompt }
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' }
  });
  
  const searchQueries = JSON.parse(thinkResponse.choices[0].message.content);
  const thinkTime = Date.now() - thinkStartTime;
  
  console.log(`✅ 検索クエリ生成完了（${(thinkTime / 1000).toFixed(2)}秒）`);
  console.log(`   生成されたクエリ数: ${searchQueries.queries?.length || 0}\n`);
  
  // Phase 1 Execute: Perplexityで直接検索
  console.log('🔍 Phase 1 Execute: Perplexity検索実行中...');
  
  const perplexity = new PerplexityClient();
  const searchResults = [];
  
  // 最初の2つのクエリでテスト
  const testQueries = (searchQueries.queries || []).slice(0, 2);
  
  for (const [index, queryObj] of testQueries.entries()) {
    console.log(`\n📄 クエリ ${index + 1}/${testQueries.length}: ${queryObj.topic}`);
    console.log(`   カテゴリ: ${queryObj.category}`);
    console.log(`   意図: ${queryObj.intent}`);
    
    const executeStartTime = Date.now();
    
    try {
      // 自然言語の質問として展開
      const perplexityPrompt = `
「${expertise}」の分野でバイラルコンテンツを作成するために調査しています。

${queryObj.topic}について、以下の観点で最新の情報（過去7日以内）を詳しく教えてください：

検索の背景：
- カテゴリ: ${queryObj.category}（${getCategoryDescription(queryObj.category)}）
- 意図: ${queryObj.intent}
- バイラルポテンシャル: ${JSON.stringify(queryObj.viralPotential)}

特に以下の点に注目して、具体的な事例や数値を含めて教えてください：
1. なぜこれが今話題になっているのか（背景と文脈）
2. どのような感情的反応を引き起こしているか（SNSでの反応、議論の内容）
3. 議論や論争の具体的な内容（賛否両論の詳細）
4. ${expertise}の専門家として言及すべきポイント（独自の視点）
5. 関連するニュースソースのタイトルとURL（最低3つ）`;

      const response = await perplexity.searchWithContext({
        query: queryObj.query,
        systemPrompt: perplexityPrompt,
        searchRecency: 'week'
      });
      
      const executeTime = Date.now() - executeStartTime;
      const content = response.choices?.[0]?.message?.content || '';
      
      console.log(`   ✅ 検索完了（${(executeTime / 1000).toFixed(2)}秒）`);
      console.log(`   📝 応答の長さ: ${content.length}文字`);
      
      searchResults.push({
        query: queryObj,
        response: content,
        responseTime: executeTime
      });
      
      // サンプル表示
      console.log('\n   --- 分析結果サンプル ---');
      console.log(content.substring(0, 400) + '...\n');
      
    } catch (error) {
      console.error(`   ❌ エラー:`, error.message);
    }
    
    // API制限を考慮
    if (index < testQueries.length - 1) {
      console.log('   ⏳ 次のクエリまで2秒待機...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // 結果のサマリー
  console.log('\n📊 テスト結果サマリー:');
  console.log(`- テストしたクエリ数: ${testQueries.length}`);
  console.log(`- 成功した検索: ${searchResults.length}`);
  
  if (searchResults.length > 0) {
    const avgTime = searchResults.reduce((sum, r) => sum + r.responseTime, 0) / searchResults.length;
    console.log(`- 平均検索時間: ${(avgTime / 1000).toFixed(2)}秒`);
    
    const avgLength = searchResults.reduce((sum, r) => sum + r.response.length, 0) / searchResults.length;
    console.log(`- 平均応答長: ${Math.round(avgLength)}文字`);
  }
  
  console.log(`\n💡 評価:`);
  console.log(`- Perplexityは検索クエリから直接、詳細な分析を提供`);
  console.log(`- Google検索の中間ステップが不要`);
  console.log(`- より深い文脈と分析が可能`);
  
  // 結果を保存
  const fs = await import('fs');
  fs.writeFileSync(
    './perplexity-direct-search-results.json',
    JSON.stringify({
      timestamp: new Date().toISOString(),
      config: { expertise, style, platform },
      searchQueries: searchQueries,
      searchResults: searchResults.map(r => ({
        query: r.query,
        responseLength: r.response.length,
        responseTime: r.responseTime,
        sampleContent: r.response.substring(0, 500)
      }))
    }, null, 2)
  );
  
  console.log('\n💾 詳細な結果を perplexity-direct-search-results.json に保存しました');
}

// カテゴリの説明を取得
function getCategoryDescription(category) {
  const descriptions = {
    'A': '現在の出来事の分析 - 最新ニュース、有名人の事件、政治的展開',
    'B': 'テクノロジーの発表とドラマ - 企業論争、文化的瞬間、社会運動',
    'C': 'ソーシャルリスニング - SNSトレンド、ハッシュタグ、エンゲージメント',
    'D': 'バイラルパターン認識 - 論争レベル、感情の強さ、共感性'
  };
  return descriptions[category] || category;
}

// 実行
testPerplexityDirectSearch().catch(console.error);