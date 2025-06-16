/**
 * Orchestrated Chain of Thought Strategy
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

// ヘルパー関数：セクション抽出
function extractSection(content: string, sectionName: string): string {
  const regex = new RegExp(`${sectionName}[：:：]?\\s*([^\\n]+(?:\\n(?!\\d+\\.|\\*)[^\\n]+)*)`, 'i')
  const match = content.match(regex)
  return match ? match[1].trim() : ''
}

// ヘルパー関数：ソース抽出
function extractSources(content: string): Array<{title: string, url: string, date?: string}> {
  const sources: Array<{title: string, url: string, date?: string}> = []
  
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
  
  return sources
}

// ヘルパー関数：日付抽出
function extractDates(content: string): Array<{date: string, context: string}> {
  const dates: Array<{date: string, context: string}> = []
  
  // 様々な日付形式に対応
  const datePatterns = [
    // 2025年6月14日、 2025/6/14、 2025-06-14
    /(\d{4})年?(\d{1,2})月(\d{1,2})日/g,
    /(\d{4})\/(\d{1,2})\/(\d{1,2})/g,
    /(\d{4})-(\d{2})-(\d{2})/g,
    // 6月14日、 6/14
    /(\d{1,2})月(\d{1,2})日/g,
    /(\d{1,2})\/(\d{1,2})/g,
    // 今日、昨日、明日、今週、先週
    /(今日|昨日|明日|今週|先週|今月|先月)/g,
    // June 14, 2025
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/gi
  ]
  
  datePatterns.forEach(pattern => {
    let match
    while ((match = pattern.exec(content)) !== null) {
      const startIndex = Math.max(0, match.index - 50)
      const endIndex = Math.min(content.length, match.index + match[0].length + 50)
      const context = content.substring(startIndex, endIndex)
      
      dates.push({
        date: match[0],
        context: context.replace(/\n/g, ' ').trim()
      })
    }
  })
  
  return dates
}

// フェーズ1: トレンド情報の収集（動的検索クエリ生成）
export const Phase1Strategy: OrchestratedPhase = {
  // Step 1: Think（検索クエリ生成）
  think: {
    prompt: `
# タスク  
ユーザーの入力した情報をもとに、下記の視点に基づいてPerplexityに投げる自然言語の質問を作成してください。

発信したい分野: {expertise}
コンテンツのスタイル: {style}
プラットフォーム: {platform}

A：現在の出来事の分析
- 最新ニュース
- 有名人の事件と世間の反応
- 議論が巻きおこるような政治的展開

B：テクノロジーの発表とテクノロジードラマ
- ビジネスニュースと企業論争
- 文化的瞬間と社会運動
- スポーツイベントと予想外の結果
- インターネットドラマとプラットフォーム論争

C：ソーシャルリスニング研究
- Twitterのトレンドトピックとハッシュタグの速度
- TikTokサウンドとチャレンジの出現
- Redditのホットな投稿とコメントの感情
- Googleトレンドの急上昇パターン
- YouTubeトレンド動画分析
- ニュース記事のコメント欄
- ソーシャルメディアのエンゲージメントパターン

D：バイラルパターン認識
バイラルが起きる可能性があるトピックを特定する:
- 論争レベル（強い意見を生み出す）
- 感情の強さ（怒り、喜び、驚き、憤慨）
- 共感性要因（多くの人に影響を与える）
- 共有可能性（人々が広めたいと思うこと）
- タイミングの敏感さ（関連性のウィンドウが狭い）
- プラットフォーム調整（{platform}文化に適合）

上記の内容をもとに、Perplexityに投げる質問を考えてください。

# 出力形式
必ず以下のJSON形式で出力してください：
{
  "searchStrategy": {
    "approach": "どのようなアプローチで情報を収集するか",
    "timeframeRationale": "なぜその時間範囲を選んだか（最新情報、過去との比較、周年など）",
    "expectedInsights": "どのような洞察を期待しているか"
  },
  "perplexityQuestions": [
    {
      "question": "Perplexityにそのまま送信する完全な質問文",
      "category": "A/B/C/D",
      "strategicIntent": "この質問で何を達成しようとしているか",
      "viralAngle": "どのようなバイラル要素を探しているか"
    }
  ]
}
`,
    expectedOutput: 'SearchStrategy',
    maxTokens: 2000,
    temperature: 0.7
  },

  // Step 2: 検索実行（Perplexity直接）
  execute: {
    action: 'performPerplexitySearch',
    handler: async (thinkResults: any, context?: any) => {
      // 新しい形式に対応
      const isNaturalLanguageFormat = thinkResults.perplexityQuestions !== undefined
      
      if (isNaturalLanguageFormat) {
        console.log('[Phase1Execute] Using natural language format')
        console.log('[Phase1Execute] Search strategy:', thinkResults.searchStrategy)
        console.log('[Phase1Execute] Questions:', thinkResults.perplexityQuestions.length)
      } else {
        console.log('[Phase1Execute] Using legacy format')
        console.log('[Phase1Execute] PERPLEXITY HANDLER CALLED - Starting Perplexity search with queries:', thinkResults.queries?.length || 0)
      }
      console.log('[Phase1Execute] Handler type: PERPLEXITY_DIRECT')
      console.log('[Phase1Execute] Context keys:', context ? Object.keys(context) : 'undefined')
      console.log('[Phase1Execute] UserConfig:', context?.userConfig)
      
      let perplexity
      try {
        perplexity = new PerplexityClient()
        console.log('[Phase1Execute] PerplexityClient created successfully')
      } catch (clientError) {
        console.error('[Phase1Execute] PerplexityClient creation failed:', clientError.message)
        throw new Error(`Perplexity client creation failed: ${clientError.message}`)
      }
      const searchResults = []
      const perplexityResponses = []
      // 必須パラメータの取得（より安全な取得方法）
      const expertise = context?.userConfig?.expertise || context?.expertise || 'AIと働き方'
      const platform = context?.userConfig?.platform || context?.platform || 'Twitter'
      
      // デバッグ用ログ（エラー前に情報を出力）
      console.log('[Phase1Execute] Context debug:', {
        hasContext: !!context,
        contextType: typeof context,
        contextKeys: context ? Object.keys(context) : 'context is null/undefined',
        userConfigKeys: context?.userConfig ? Object.keys(context.userConfig) : 'userConfig is null/undefined',
        expertise: expertise,
        platform: platform
      })
      
      console.log(`[Phase1Execute] Using expertise: ${expertise}, platform: ${platform}`)
      
      // 自然言語形式の場合
      if (isNaturalLanguageFormat) {
        console.log(`[Phase1Execute] Processing ${thinkResults.perplexityQuestions.length} questions`)
        
        for (const questionObj of thinkResults.perplexityQuestions) {
          try {
            console.log(`[Phase1Execute] Question: "${questionObj.question}"`)
            console.log(`[Phase1Execute] Strategic intent: ${questionObj.strategicIntent}`)
            
            // GPTが生成した完全な質問文をそのまま使用（タイムアウト対策付き）
            // デバッグモード: モックPerplexityを使用
            const useDebugMode = process.env.NODE_ENV === 'development' && context?.debugMode !== false
            
            const response = await Promise.race([
              useDebugMode 
                ? fetch('http://localhost:3000/api/debug/mock-perplexity', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      query: questionObj.question,
                      systemPrompt: `質問の意図を理解し、適切な情報を提供してください。必ずURLと日付を含めてください。`
                    })
                  }).then(res => res.json())
                : perplexity.searchWithContext({
                    query: questionObj.question,
                    systemPrompt: `質問の意図を理解し、適切な情報を提供してください。必ずURLと日付を含めてください。`
                  }),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Perplexity search timeout')), context?.perplexityTimeout || 120000)
              )
            ])
            
            const content = response.choices?.[0]?.message?.content || response
            const citations = response.citations || []
            const searchResultsFromAPI = response.search_results || []
            
            // 応答を保存
            perplexityResponses.push({
              question: questionObj.question,
              response: content,
              timestamp: new Date().toISOString(),
              citations: citations,
              searchResults: searchResultsFromAPI
            })
            
            // citationsとsearch_resultsを統合してソースを作成
            const combinedSources = searchResultsFromAPI.map(sr => ({
              title: sr.title,
              url: sr.url,
              date: sr.date
            }))
            
            searchResults.push({
              question: questionObj.question,
              category: questionObj.category,
              strategicIntent: questionObj.strategicIntent,
              viralAngle: questionObj.viralAngle,
              analysis: content,
              sources: combinedSources.length > 0 ? combinedSources : extractSources(content), // API結果優先、なければテキストから抽出
              citations: citations,
              rawResponse: content // 元の全文も保持
            })
            
            console.log(`[Phase1Execute] Analysis completed for category ${questionObj.category}`)
            
          } catch (error) {
            console.error(`[Phase1Execute] Error with question "${questionObj.question}":`, error)
            
            // タイムアウトエラーの場合はより簡潔な質問で再試行
            if (error.message?.includes('timeout')) {
              console.log(`[Phase1Execute] Retrying with shorter question...`)
              try {
                const shortQuery = `${questionObj.question.substring(0, 100)}...に関する最新情報とバイラル要素を教えてください`
                const retryResponse = await Promise.race([
                  perplexity.searchWithContext({
                    query: shortQuery,
                    systemPrompt: `質問の意図を理解し、適切な情報を提供してください。`
                  }),
                  new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Retry timeout')), context?.perplexityRetryTimeout || 60000)
                  )
                ])
                
                const retryContent = retryResponse.choices?.[0]?.message?.content || ''
                
                searchResults.push({
                  question: questionObj.question,
                  category: questionObj.category,
                  strategicIntent: questionObj.strategicIntent,
                  viralAngle: questionObj.viralAngle,
                  analysis: retryContent + ' (短縮版で取得)',
                  sources: extractSources(retryContent),
                  rawResponse: retryContent,
                  retried: true
                })
                
                perplexityResponses.push({
                  question: shortQuery,
                  response: retryContent,
                  timestamp: new Date().toISOString(),
                  originalQuestion: questionObj.question,
                  retried: true
                })
                
                console.log(`[Phase1Execute] Retry successful for category ${questionObj.category}`)
              } catch (retryError) {
                console.error(`[Phase1Execute] Retry failed:`, retryError)
                // 失敗してもプロセスは継続
              }
            }
          }
        }
      } else {
        // レガシー形式
        console.log(`[Phase1Execute] Processing ${thinkResults.queries?.length || 0} queries`)
        
        for (const queryObj of thinkResults.queries || []) {
          try {
            console.log(`[Phase1Execute] Processing query:`, JSON.stringify(queryObj, null, 2))
            console.log(`[Phase1Execute] Perplexity searching: "${queryObj.topic}" (${queryObj.category})`)
            
            // GPTが生成した質問をそのまま使用
            console.log(`[Phase1Execute] Calling Perplexity API...`)
            const response = await perplexity.searchWithContext({
              query: queryObj.query || queryObj.topic,
              systemPrompt: `質問の意図を理解し、適切な情報を提供してください。必ずURLと日付を含めてください。`
            })
            console.log(`[Phase1Execute] Perplexity API response received`)
            
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
              sources: extractSources(content),
              dates: extractDates(content), // 日付情報も抽出
              rawResponse: content // 元の全文も保持
            }
            
            searchResults.push(structuredResult)
            
            // Perplexityの生応答も保存
            perplexityResponses.push({
              query: queryObj.query,
              response: content,
              timestamp: new Date().toISOString()
            })
            console.log(`[Phase1Execute] Analysis completed for "${queryObj.topic}"`)
            
          } catch (error) {
            console.error(`[Phase1Execute] Perplexity search failed for: ${queryObj.topic}`)
            console.error(`[Phase1Execute] Error details:`, error)
            if (error instanceof Error) {
              console.error(`[Phase1Execute] Error message:`, error.message)
              console.error(`[Phase1Execute] Error stack:`, error.stack)
            }
            // エラーでも継続
          }
        }
      }
      
      console.log(`[Phase1Execute] Total search results: ${searchResults.length}`)
      
      return { 
        searchResults,
        perplexityResponses, // DB保存用
        totalResults: searchResults.length,
        searchMethod: isNaturalLanguageFormat ? 'natural_language' : 'perplexity_direct',
        searchDate: new Date().toISOString()
      }
    }
  },

  // Step 3: Integrate（結果分析）
  integrate: {
    prompt: `
# 収集した検索結果
{searchResults}

# タスク
上記の調査結果をもとに、バイラルパターン認識を行い、バズる可能性のあるトピックを特定してください。
各トピックには、そのトピックを裏付ける具体的な情報源（ニュースソース名とURL）を含めてください。

## D：バイラルパターン認識
バイラルが起きる可能性があるトピックを以下の観点で評価：
- 論争レベル（強い意見を生み出す）
- 感情の強さ（怒り、喜び、驚き、憤慨）
- 共感性要因（多くの人に影響を与える）
- 共有可能性（人々が広めたいと思うこと）
- タイミングの敏感さ（関連性のウィンドウが狭い）
- プラットフォーム調整（{platform}文化に適合）

# 出力形式
必ず以下のJSON形式で出力してください：
{
  "trendedTopics": [
    {
      "topicName": "バズる可能性のあるトピック",
      "category": "A/B/C/D",
      "summary": "トピックの概要",
      "currentStatus": "現在の状況（なぜ今話題なのか）",
      "viralElements": {
        "controversy": "高/中/低",
        "emotion": "高/中/低",
        "relatability": "高/中/低",
        "shareability": "高/中/低",
        "timeSensitivity": "高/中/低",
        "platformFit": "高/中/低"
      },
      "expertiseRelevance": "トピックと発信分野の関連性",
      "emotionalDrivers": ["感情的な反応を引き起こす要素"],
      "evidenceSources": [
        {
          "title": "ニュースソース名または記事タイトル",
          "url": "情報源のURL"
        }
      ],
      "nextSteps": "このトピックをどう活用するか"
    }
  ],
  "categoryInsights": {
    "A": "現在の出来事に関する洞察",
    "B": "テクノロジー・ビジネスに関する洞察",
    "C": "ソーシャルリスニングからの洞察",
    "D": "バイラルパターンの総合的な洞察"
  },
  "overallAnalysis": "全体的な分析とトレンドの方向性",
  "warnings": "注意すべき点やリスク",
  "topicCount": "特定したバズる機会の数（数値）"
}

重要：
- バイラルの可能性を冷静に評価（誇張しない）
- 具体的な証拠（記事からの引用）に基づく
- {platform}のユーザー文化を考慮した評価
- topicCountは実際に特定したバズるチャンスの数を入れる`,
    expectedOutput: 'TrendAnalysis',
    maxTokens: 4000,
    temperature: 0.5
  }  // integrateの終わり
}  // Phase1Strategyの終わり

// フェーズ2: 機会評価とコンセプト作成（旧Phase2とPhase3をマージ）
export const Phase2Strategy: OrchestratedPhase = {
  // Step 1: 機会分析とコンセプト作成
  think: {
    prompt: `
前フェーズで特定された機会：
{opportunities}

# 収集した情報源（Phase 1より）
{searchResults}

注意：各機会には具体的なevidenceSourcesが含まれています。コンセプト作成時には、これらの情報源から適切なものを選んでnewsSourceとsourceUrlに含めてください。

以下の観点で各機会を分析してください：

分析1：ウイルス速度指標
- 検索ボリュームの急増と成長率
- ソーシャルメンションの加速
- 複数プラットフォームの存在
- インフルエンサーの採用
- メディア報道の勢い

分析2：コンテンツアングル識別
実行可能なトレンドごとに、独自の角度を特定します：
- 反対派は世論に異議を唱える
- 専門家による内部視点の分析
- 個人的なつながりの物語
- 教育の内訳
- 次に何が起こるかを予測するコンテンツ
- 舞台裏の洞察
- 過去のイベントとの比較内容

## フェーズ3: バズるコンテンツのコンセプト作成

具体的で実行可能なコンテンツ コンセプトを作成します。

●コンテンツコンセプトフレームワーク
それぞれの機会について、以下を開発します
A：形式: [スレッド/ビデオ/投稿タイプ]
B：フック: 「[注目を集める具体的なオープナー]」
C：角度: [独自の視点や見方]

●コンテンツ概要:
トレンドにつながるオープニングフック
[物語を構築する3～5つのキーポイント]

以下の要素を使って、物語を構築するD（キーポイント）となる3～5つのキーポイントを開発してください：
- 予期せぬ洞察や啓示
- エンゲージメントを促進するCTA
- タイミング: 最大の効果を得るには [X] 時間以内に投稿してください
- ビジュアル: [具体的な画像/動画の説明]
- ハッシュタグ: [プラットフォームに最適化されたタグ]

この構造に従って 3 つのコンセプトを提供します。この際には、コンセプト作成のもととなったニュースソースとURLも必ず提示します。

重要：各コンセプトでは、A（形式）、B（フック）、C（角度）、D（物語を構築する3〜5つのキーポイント）を必ず含めてください。

# 出力形式
必ず以下のJSON形式で出力してください：
{
  "opportunityCount": "特定した機会の数",
  "analysisInsights": "機会分析から得られた主要な洞察",
  "concepts": [
    {
      "title": "コンセプトタイトル",
      "A": "形式（single/thread/video/carousel）",
      "B": "注目を集める具体的なオープナー",
      "C": "独自の視点や見方",
      "D": [
        "物語を構築するキーポイント1（予期せぬ洞察など）",
        "物語を構築するキーポイント2（エンゲージメント要素など）",
        "物語を構築するキーポイント3（CTA要素など）",
        "（必要に応じて4つ目）",
        "（必要に応じて5つ目）"
      ],
      "newsSource": "ニュースソース名",
      "sourceUrl": "ソースURL",
      "opportunity": "このコンセプトの基となった機会"
    }
  ],
  "nextStepMessage": "バズるコンテンツのコンセプトの概要は次のとおりです。「続行」と入力すると、各コンセプトに基づいたコンテンツ作成を開始します"
}
`,
    expectedOutput: 'OpportunityAnalysisAndConcepts',
    maxTokens: 4500,
    temperature: 0.7
  },

  // Step 2: 実行（パススルー）
  execute: {
    action: 'passThrough',
    handler: async (thinkResults: any) => {
      console.log('[Phase2Execute] Passing through analysis and concepts')
      return thinkResults
    }
  },

  // Step 3: 統合（結果をそのまま次のフェーズに渡す）
  integrate: {
    prompt: `
# 分析とコンセプト
{opportunityCount}
{analysisInsights}
{concepts}

# タスク
Phase 2の結果を確認し、次のフェーズに渡すための形式で出力してください。

# 出力形式
必ず以下のJSON形式で出力してください：
{
  "opportunityCount": "{opportunityCount}",
  "analysisInsights": "{analysisInsights}",
  "concepts": {concepts},
  "message": "【{opportunityCount}】件の機会を発見しました。コンテンツのコンセプトは以下です。"
}
`,
    expectedOutput: 'ConceptsReady',
    maxTokens: 1000,
    temperature: 0.3
  }
}

// フェーズ3: 実際のコンテンツ作成（旧Phase4）
export const Phase3Strategy: OrchestratedPhase = {
  // Step 1: パススルー（INTEGRATEでコンテンツ生成）
  think: {
    prompt: `
# タスク
このステップはパススルーです。次のINTEGRATEステップでコンテンツを生成します。

# 出力形式
必ず以下のJSON形式で出力してください：
{
  "ready": true
}
`,
    expectedOutput: 'Ready',
    maxTokens: 100,
    temperature: 0.3
  },

  // Step 2: 実行（パススルー）
  execute: {
    action: 'passThrough',
    handler: async (thinkResults: any) => {
      console.log('[Phase4Execute] Passing through content strategy')
      return thinkResults
    }
  },

  // Step 3: 完全なコンテンツ生成
  integrate: {
    prompt: `
# あなたの役割
あなたは、新たなトレンドを特定し、流行の波がピークに達する前にその波に乗るコンテンツのコンセプトを作成するバズるコンテンツ戦略家です。
{platform}で多くのエンゲージメントを獲得できる魅力的なコンテンツを作成することが得意です。

# 前フェーズで作成された3つのコンセプト

【コンセプト】
{concepts}

# タスク
上記の3つのコンセプト全てに基づいて、{platform}にすぐにコピー＆ペースト可能な完全なコンテンツを作成してください。
各コンセプトのA、B、C、Dを効果的に使って、魅力的な投稿を作成してください。

## 各コンセプトの要素（A、B、C、D）を効果的に使う方法
- **A（形式）**: 指定された形式（thread/video/carousel）に適した構成にする
- **B（フック）**: これを冒頭に使用して注目を集める（多少アレンジしても良いが、本質は維持）
- **C（角度/独自の視点）**: この視点を明確に本文全体に反映させ、その角度から一貫して語る
- **D（キーポイント）**: 5つ全てのポイントを効果的に活用し、以下のように展開する：
  - 具体例や洞察は詳しく説明
  - CTAは必ず含める
  - ビジュアル説明を視覚的説明として含める
  - ハッシュタグを投稿に含める
- **newsSource**と**sourceUrl**: 信頼性のある情報源として必ず含める

## 重要な要件
- **必ずA、B、C、Dの全要素を効果的に使用すること**
- C（独自の視点）は単に言及するのではなく、その視点から語るスタンスで全体を構成すること
- D（キーポイント）の5つの要素は全て何らかの形で投稿に反映させること
- すべてのテキスト、書式、改行、絵文字、ハッシュタグを含める
- 完成させてすぐに投稿できるように準備する
- 人間による文体・トーンの微調整は前提とする

# 出力形式
必ず以下の形式で、3つ全てのコンセプトのコンテンツを出力してください：

コンセプト1: [トレンドトピック] - 完全なコンテンツ
[Xにすぐにコピー＆ペースト可能な完全なコンテンツを作成してください]
[すべてのテキスト、書式、改行、絵文字、ハッシュタグを含める]
[完成させてすぐに投稿できるように準備する]
視覚的説明: [必要な画像/ビデオの詳細な説明]
投稿に関する注意事項: [具体的なタイミングと最適化のヒント]

コンセプト2: [トレンドトピック] - 完全なコンテンツ
[Xにすぐにコピー＆ペースト可能な完全なコンテンツを作成してください]
[すべてのテキスト、書式、改行、絵文字、ハッシュタグを含める]
[完成させてすぐに投稿できるように準備する]
視覚的説明: [必要な画像/ビデオの詳細な説明]
投稿に関する注意事項: [具体的なタイミングと最適化のヒント]

コンセプト3: [トレンドトピック] - 完全なコンテンツ
[Xにすぐにコピー＆ペースト可能な完全なコンテンツを作成してください]
[すべてのテキスト、書式、改行、絵文字、ハッシュタグを含める]
[完成させてすぐに投稿できるように準備する]
視覚的説明: [必要な画像/ビデオの詳細な説明]
投稿に関する注意事項: [具体的なタイミングと最適化のヒント]

重要：
- 人間による文体・トーンの微調整は前提とする
- コピペ即投稿可能な完成度で出力する
- 各コンセプトのA（形式）、B（フック）、C（角度）、D（キーポイント）を活用する

# JSON出力形式
必ず以下のJSON形式でも出力してください：
{
  "contents": [
    {
      "conceptNumber": 1,
      "title": "コンセプト1のタイトル",
      "mainPost": "完全な投稿文（改行、絵文字、ハッシュタグ含む）",
      "hashtags": ["ハッシュタグ1", "ハッシュタグ2"],
      "visualDescription": "必要な画像/動画の詳細な説明",
      "postingNotes": "具体的なタイミングと最適化のヒント",
      "newsSource": "ニュースソース名",
      "sourceUrl": "ソースURL"
    },
    {
      "conceptNumber": 2,
      "title": "コンセプト2のタイトル",
      "mainPost": "完全な投稿文（改行、絵文字、ハッシュタグ含む）",
      "hashtags": ["ハッシュタグ1", "ハッシュタグ2"],
      "visualDescription": "必要な画像/動画の詳細な説明",
      "postingNotes": "具体的なタイミングと最適化のヒント",
      "newsSource": "ニュースソース名",
      "sourceUrl": "ソースURL"
    },
    {
      "conceptNumber": 3,
      "title": "コンセプト3のタイトル",
      "mainPost": "完全な投稿文（改行、絵文字、ハッシュタグ含む）",
      "hashtags": ["ハッシュタグ1", "ハッシュタグ2"],
      "visualDescription": "必要な画像/動画の詳細な説明",
      "postingNotes": "具体的なタイミングと最適化のヒント",
      "newsSource": "ニュースソース名",
      "sourceUrl": "ソースURL"
    }
  ]
}
`,
    expectedOutput: 'CompleteContent',
    maxTokens: 4000,
    temperature: 0.8
  }
}

// フェーズ4: 実行戦略（旧Phase5）
export const Phase4Strategy: OrchestratedPhase = {
  // Step 1: 戦略立案
  think: {
    prompt: `
# ユーザー設定
* コンテンツのスタイル: {style}
* プラットフォーム: {platform}

# 作成された3つのコンテンツ
{contents}

## フェーズ5: 実行戦略
実装ガイダンスを提供します。

実行タイムライン
- 即時（2～4時間）：コンテンツ作成、ビジュアル準備、プラットフォームのセットアップ
- 投稿期間（4～24時間）: 最適なタイミング、リアルタイム監視、対応戦略
- フォローアップ（24～48時間）：増幅戦術、フォローアップコンテンツ、パフォーマンス分析

●最適化技術
- リアルタイム調整のためのエンゲージメントの監視
- 関連するバズるコンテンツに関する戦略的なコメント
- 複数プラットフォーム共有で最大限のリーチを実現
- 知名度を高めるためのインフルエンサーとのエンゲージメント

●リスクアセスメント
- 論争リスクとブランドの整合性
- 競争飽和分析
- プラットフォームアルゴリズムの互換性

●成功指標
- エンゲージメント率とベースライン
- シェア速度とバイラル係数
- クロスプラットフォームパフォーマンス
- フォロワーの増加と視聴者の質

# タスク
3つの生成されたコンテンツを参照しながら、上記の観点で実行戦略を考えてください。

# 出力形式
必ず以下のJSON形式で出力してください：
{
  "executionTimeline": {
    "immediate": {
      "timeframe": "2-4時間",
      "tasks": ["コンテンツ作成", "ビジュアル準備", "プラットフォームのセットアップ"]
    },
    "posting": {
      "timeframe": "4-24時間",
      "optimalTime": "最適な投稿時刻",
      "monitoringPlan": "リアルタイム監視計画"
    },
    "followUp": {
      "timeframe": "24-48時間",
      "amplificationTactics": ["増幅戦術"],
      "followUpContent": ["フォローアップコンテンツ案"]
    }
  },
  "optimizationTechniques": [
    "リアルタイム調整のためのエンゲージメントの監視",
    "関連するバズるコンテンツに関する戦略的なコメント",
    "複数プラットフォーム共有で最大限のリーチを実現",
    "知名度を高めるためのインフルエンサーとのエンゲージメント"
  ],
  "riskAssessment": {
    "controversyRisk": "論争リスクとブランドの整合性",
    "competitionSaturation": "競争飽和分析",
    "platformCompatibility": "プラットフォームアルゴリズムの互換性"
  },
  "successMetrics": {
    "engagementRate": "エンゲージメント率とベースライン",
    "shareVelocity": "シェア速度とバイラル係数",
    "crossPlatformPerformance": "クロスプラットフォームパフォーマンス",
    "followerGrowth": "フォロワーの増加と視聴者の質"
  }
}
`,
    expectedOutput: 'ExecutionStrategy',
    maxTokens: 2500,
    temperature: 0.6
  },

  // Step 2: 実行（パススルー）
  execute: {
    action: 'passThrough',
    handler: async (thinkResults: any) => {
      console.log('[Phase5Execute] Passing through execution strategy')
      return thinkResults
    }
  },

  // Step 3: 最終統合とKPI設定
  integrate: {
    prompt: `
# 実行戦略
{executionTimeline}

# タスク
実行戦略を最終化し、リスクアセスメントと成功指標を設定してください。

# 出力形式
必ず以下のJSON形式で出力してください：
{
  "finalExecutionPlan": {
    "summary": "実行計画の要約",
    "criticalSuccessFactors": ["成功の鍵となる要素"],
    "bestTimeToPost": ["最適な投稿時刻候補"],
    "followUpStrategy": "フォローアップ戦略"
  },
  "riskAssessment": {
    "controversyRisk": "論争リスクとブランドの整合性",
    "competitionSaturation": "競争飽和分析",
    "platformCompatibility": "プラットフォームアルゴリズムの互換性"
  },
  "kpis": {
    "engagementRate": {
      "baseline": "ベースライン",
      "target": "目標",
      "stretch": "ストレッチ目標"
    },
    "viralCoefficient": {
      "shareVelocity": "シェア速度目標",
      "crossPlatform": "クロスプラットフォーム目標"
    },
    "measurementPlan": "測定計画"
  },
  "completionMessage": "Chain of Thought分析が完了しました。すべてのフェーズが正常に実行され、投稿準備が整いました。"
}
`,
    expectedOutput: 'FinalExecutionPlan',
    maxTokens: 2000,
    temperature: 0.5
  }
}

// Chain of Thoughtオーケストレーター
// フェーズ5: 実行戦略（仕様書参照）
export const Phase5Strategy: OrchestratedPhase = {
  think: {
    prompt: `
# 作成されたコンテンツ
{contents}

# タスク
上記のコンテンツをもとに、投稿の実行戦略を立ててください。

必ず以下のJSON形式で出力してください：
{
  "executionPlan": {
    "bestTimeToPost": ["時間帯1", "時間帯2"],
    "postingFrequency": "推奨頻度",
    "engagementStrategy": "エンゲージメント戦略"
  },
  "kpis": {
    "impressions": "目標インプレッション数",
    "engagement": "目標エンゲージメント率",
    "shares": "目標シェア数"
  },
  "followUpActions": [
    "フォローアップアクション1",
    "フォローアップアクション2"
  ]
}
`,
    expectedOutput: 'ExecutionStrategy',
    maxTokens: 2000
  },
  
  execute: {
    action: 'skip',
    handler: async () => ({ skipped: true })
  },
  
  integrate: {
    prompt: `
# 実行戦略
{executionPlan}

# KPI
{kpis}

# タスク
最終的な実行計画をまとめてください。

必ず以下のJSON形式で出力してください：
{
  "finalExecutionPlan": {
    "immediateActions": ["今すぐ実行すべきアクション"],
    "scheduledActions": ["スケジュールすべきアクション"],
    "monitoringPlan": "モニタリング計画"
  },
  "successMetrics": {
    "shortTerm": "短期的な成功指標",
    "longTerm": "長期的な成功指標"
  },
  "riskMitigation": "リスク軽減策",
  "optimizationTechniques": ["最適化手法1", "最適化手法2"]
}
`,
    expectedOutput: 'FinalStrategy',
    maxTokens: 2000
  }
}

export class ChainOfThoughtOrchestrator {
  private openai: any

  constructor(openaiClient: any) {
    this.openai = openaiClient
  }

  async executePhase(strategy: OrchestratedPhase, context: any) {
    const results: any = {}
    
    // Think
    if (strategy.think) {
      console.log('[Orchestrator] Starting THINK phase')
      const thinkPrompt = this.interpolatePrompt(strategy.think.prompt, context)
      
      const thinkResponse = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'あなたは、新たなトレンドを特定し、流行の波がピークに達する前にその波に乗るコンテンツのコンセプトを作成するバズるコンテンツ戦略家です。'
          },
          { role: 'user', content: thinkPrompt }
        ],
        max_tokens: strategy.think.maxTokens,
        temperature: strategy.think.temperature || 0.7,
        response_format: { type: 'json_object' }
      })
      
      results.think = JSON.parse(thinkResponse.choices[0].message.content || '{}')
      console.log('[Orchestrator] THINK phase completed')
    }
    
    // Execute
    if (strategy.execute) {
      console.log('[Orchestrator] Starting EXECUTE phase')
      results.execute = await strategy.execute.handler(results.think, context)
      console.log('[Orchestrator] EXECUTE phase completed')
    }
    
    // Integrate
    if (strategy.integrate) {
      console.log('[Orchestrator] Starting INTEGRATE phase')
      const integrateContext = {
        ...context,
        searchResults: results.execute
      }
      const integratePrompt = this.interpolatePrompt(strategy.integrate.prompt, integrateContext)
      
      const integrateResponse = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'あなたは、新たなトレンドを特定し、流行の波がピークに達する前にその波に乗るコンテンツのコンセプトを作成するバズるコンテンツ戦略家です。'
          },
          { role: 'user', content: integratePrompt }
        ],
        max_tokens: strategy.integrate.maxTokens,
        temperature: strategy.integrate.temperature || 0.5,
        response_format: { type: 'json_object' }
      })
      
      results.integrate = JSON.parse(integrateResponse.choices[0].message.content || '{}')
      console.log('[Orchestrator] INTEGRATE phase completed')
    }
    
    return results
  }
  
  private interpolatePrompt(template: string, context: any): string {
    return template.replace(/{(\w+)}/g, (match, key) => {
      const value = context[key]
      if (value === undefined) {
        return match
      }
      if (typeof value === 'object') {
        return JSON.stringify(value, null, 2)
      }
      return value.toString()
    })
  }
}