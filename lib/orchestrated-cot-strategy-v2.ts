/**
 * Orchestrated Chain of Thought Strategy V2
 * 
 * Perplexity直接検索版（Google検索を削除）
 * オリジナルのChatGPTプロンプトを忠実に実装
 * 
 * 参照: /docs/chain-of-thought-specification.md
 */

import { PerplexityClient } from './perplexity'

export interface OrchestratedPhase {
  think: LLMPhase      // LLMが計画を立てる
  execute: AppPhase    // アプリが実行する
  integrate: LLMPhase  // LLMが結果を統合する
}

export interface LLMPhase {
  prompt: string
  expectedOutput: any
  maxTokens: number
  temperature?: number
}

export interface AppPhase {
  action: string
  handler: (input: any, context?: any) => Promise<any>
}

// カテゴリの説明を取得
function getCategoryDescription(category: string): string {
  const descriptions: Record<string, string> = {
    'A': '現在の出来事の分析 - 最新ニュース、有名人の事件、政治的展開',
    'B': 'テクノロジーの発表とドラマ - 企業論争、文化的瞬間、社会運動',
    'C': 'ソーシャルリスニング - SNSトレンド、ハッシュタグ、エンゲージメント',
    'D': 'バイラルパターン認識 - 論争レベル、感情の強さ、共感性'
  }
  return descriptions[category] || category
}

// フェーズ1: トレンド情報の収集（Perplexity直接検索）
export const Phase1Strategy: OrchestratedPhase = {
  // Step 1: 検索クエリ生成（変更なし）
  think: {
    prompt: `
# ユーザー設定
* 発信したい分野: {expertise}
* コンテンツのスタイル: {style}
* プラットフォーム: {platform}

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
- プラットフォーム調整（{platform}文化に適合）

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
      "topic": "{expertise}に関連する具体的なトピック",
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
- {expertise}に関連する最新の出来事やトレンドを捉える
- 各カテゴリ（A〜D）の視点を活用してクエリを生成
- 検索結果から**最低3つ以上、最大5つまでのトレンドトピック**を抽出できるようなクエリを設計`,
    expectedOutput: 'SearchQueries',
    maxTokens: 2000,
    temperature: 0.7
  },

  // Step 2: Perplexity直接検索（Google検索を完全に削除）
  execute: {
    action: 'performPerplexitySearch',
    handler: async (searchQueries: any, context?: any) => {
      console.log('[Phase1Execute] Starting Perplexity search with queries:', searchQueries.queries?.length || 0)
      
      const perplexity = new PerplexityClient()
      const searchResults = []
      const expertise = context?.userConfig?.expertise || '指定なし'
      const platform = context?.userConfig?.platform || 'Twitter'
      
      // 各クエリに対してPerplexityで詳細な調査を実行
      for (const queryObj of searchQueries.queries || []) {
        try {
          console.log(`[Phase1Execute] Perplexity searching: "${queryObj.topic}" (${queryObj.category})`)
          
          // GPTが生成した検索意図を自然言語の質問に展開
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
5. 関連するニュースソースのタイトルとURL（最低3つ）

プラットフォーム「${platform}」でバズる可能性が高い要素を特に詳しく分析してください。`

          const response = await perplexity.searchWithContext({
            query: queryObj.query,
            systemPrompt: perplexityPrompt,
            searchRecency: 'week'
          })
          
          const content = response.choices?.[0]?.message?.content || ''
          
          // Perplexityの応答を構造化
          const structuredResult = {
            category: queryObj.category,
            topic: queryObj.topic,
            query: queryObj.query,
            queryJa: queryObj.queryJa,
            intent: queryObj.intent,
            viralPotential: queryObj.viralPotential,
            analysis: content,
            // 以下は簡易的な抽出（実際にはより高度な解析が必要）
            summary: extractSection(content, '話題になっている理由') || 
                    extractSection(content, '背景') || 
                    content.substring(0, 300),
            emotionalReaction: extractSection(content, '感情的反応') || 
                              extractSection(content, 'SNSでの反応') || '',
            controversy: extractSection(content, '議論') || 
                        extractSection(content, '論争') || '',
            expertAngle: extractSection(content, '専門家として') || 
                        extractSection(content, '独自の視点') || '',
            sources: extractSources(content)
          }
          
          searchResults.push(structuredResult)
          console.log(`[Phase1Execute] Analysis completed for "${queryObj.topic}"`)
          
        } catch (error) {
          console.error(`[Phase1Execute] Perplexity search failed for: ${queryObj.topic}`, error)
          // エラーでも継続
        }
      }
      
      console.log(`[Phase1Execute] Total search results: ${searchResults.length}`)
      
      return { 
        searchResults,
        totalResults: searchResults.length,
        searchMethod: 'perplexity_direct'
      }
    }
  },

  // Step 3: 統合・分析（変更なし）
  integrate: {
    prompt: `
# ユーザー設定
* 発信したい分野: {expertise}
* コンテンツのスタイル: {style}
* プラットフォーム: {platform}

# 収集した検索結果
{searchResults}

# タスク
上記の調査結果をもとに、バイラルパターン認識を行い、バズる可能性のあるトピックを特定してください。

## D：バイラルパターン認識
バイラルが起きる可能性があるトピックを以下の観点で評価：
- 論争レベル（強い意見を生み出す）
- 感情の強さ（怒り、喜び、驚き、憤慨）
- 共感性要因（多くの人に影響を与える）
- 共有可能性（人々が広めたいと思うこと）
- タイミングの敏感さ（関連性のウィンドウが狭い）
- プラットフォーム調整（{platform}文化に適合）

各検索結果から、{expertise}に関連し、かつバイラルの可能性が高いトピックを抽出してください。

推定バズ時間帯については、トピックの性質、{platform}のユーザー行動パターン、話題の緊急性などを総合的に考慮して判断してください。

## 出力形式
必ず以下のJSON形式で出力してください：
{
  "viralOpportunities": [
    // 最低3つ以上、最大5つまでのトレンドトピックを含める
    {
      "topicName": "【具体的なトピック名】",
      "summary": "トレンドのポイント説明（何がなぜ注目されているか）",
      "sources": [
        {"title": "記事タイトル1", "url": "URL1"},
        {"title": "記事タイトル2", "url": "URL2"}
      ],
      "estimatedBuzzTiming": "例）48時間以内／夜20〜23時がベスト",
      "buzzElements": {
        "emotion": "感情（怒り/喜び/驚き/悲しみなど具体的に）",
        "controversy": "議論性（賛否両論/炎上リスク/建設的議論など）",
        "relatability": "共感性（どんな人が共感するか/なぜ共感するか）"
      },
      "expertAngle": "{expertise}の視点から見た独自の切り口",
      "viralScore": 0.0-1.0,
      "reasoning": "このトピックがバズる総合的な理由"
    }
  ],
  "topOpportunities": [
    // viralScoreが高い順に上位3-5件を抽出
    {
      "topicName": "トピック名",
      "viralScore": 0.0-1.0,
      "keyHook": "注目を集める核心的なフック",
      "estimatedBuzzTiming": "最適な投稿タイミング"
    }
  ],
  "opportunityCount": 数値,
  "analysisInsights": "全体を通じて見えてきたトレンドの傾向",
  "nextStepMessage": "トレンド分析に基づき、今後48時間以内に[X]件のバズるチャンスが出現すると特定しました。コンテンツのコンセプトについては「続行」と入力してください。"
}

重要：
- {expertise}に関連するトピックのみを抽出
- バイラルの可能性を冷静に評価（誇張しない）
- 具体的な証拠（記事からの引用）に基づく
- {platform}のユーザー文化を考慮した評価
- opportunityCountは実際に特定したバズるチャンスの数を入れる`,
    expectedOutput: 'TrendAnalysis',
    maxTokens: 4000,
    temperature: 0.5
  }
}

// ヘルパー関数：セクション抽出
function extractSection(content: string, sectionName: string): string {
  const regex = new RegExp(`${sectionName}[：:：]?\\s*([^\\n]+(?:\\n(?!\\d+\\.|\\*)[^\\n]+)*)`, 'i')
  const match = content.match(regex)
  return match ? match[1].trim() : ''
}

// ヘルパー関数：ソース抽出
function extractSources(content: string): Array<{title: string, url: string}> {
  const sources: Array<{title: string, url: string}> = []
  
  // URL形式のパターン
  const urlRegex = /https?:\/\/[^\s]+/g
  const urls = content.match(urlRegex) || []
  
  // タイトル付きリンクのパターン（例：[タイトル](URL)）
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g
  let match
  while ((match = linkRegex.exec(content)) !== null) {
    sources.push({ title: match[1], url: match[2] })
  }
  
  // タイトルが見つからないURLも追加
  urls.forEach(url => {
    if (!sources.some(s => s.url === url)) {
      sources.push({ title: 'ソース', url })
    }
  })
  
  return sources.slice(0, 5) // 最大5個まで
}

// Phase 2以降も同様に実装...（仕様書に従って）