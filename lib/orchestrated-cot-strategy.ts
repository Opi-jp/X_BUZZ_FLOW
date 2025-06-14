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

// フェーズ1: トレンド情報の収集（動的検索クエリ生成）
export const Phase1Strategy: OrchestratedPhase = {
  // Step 1: 検索クエリ生成
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
      console.log('[Phase1Execute] PERPLEXITY HANDLER CALLED - Starting Perplexity search with queries:', searchQueries.queries?.length || 0)
      console.log('[Phase1Execute] Handler type: PERPLEXITY_DIRECT')
      
      try {
        const perplexity = new PerplexityClient()
        console.log('[Phase1Execute] PerplexityClient created successfully')
      } catch (clientError) {
        console.error('[Phase1Execute] PerplexityClient creation failed:', clientError.message)
        throw new Error(`Perplexity client creation failed: ${clientError.message}`)
      }
      
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

  // Step 3: 統合・分析
  integrate: {
    prompt: `
# ユーザー設定
* 発信したい分野: {expertise}
* コンテンツのスタイル: {style}
* プラットフォーム: {platform}

# 収集した検索結果
{searchResults}

# 収集した情報の分類視点

### A：現在の出来事の分析
- 最新ニュース
- 有名人の事件と世間の反応
- 議論が巻きおこるような政治的展開

### B：テクノロジーの発表とテクノロジードラマ
- ビジネスニュースと企業論争
- 文化的瞬間と社会運動
- スポーツイベントと予想外の結果
- インターネットドラマとプラットフォーム論争

### C：ソーシャルリスニング研究
- Twitterのトレンドトピックとハッシュタグの速度
- TikTokサウンドとチャレンジの出現
- Redditのホットな投稿とコメントの感情
- Googleトレンドの急上昇パターン
- YouTubeトレンド動画分析
- ニュース記事のコメント欄
- ソーシャルメディアのエンゲージメントパターン

### D：バイラルパターン認識の視点
各トピックについて、以下の要素を識別：
- 論争レベル（強い意見を生み出す）
- 感情の強さ（怒り、喜び、驚き、憤慨）
- 共感性要因（多くの人に影響を与える）
- 共有可能性（人々が広めたいと思うこと）
- タイミングの敏感さ（関連性のウィンドウが狭い）
- プラットフォーム調整（{platform}文化に適合）

## 出力形式
必ず以下のJSON形式で出力してください：
{
  "trendedTopics": [
    {
      "topicName": "【具体的なトピック名】",
      "category": "A/B/C（どのカテゴリから発見されたか）",
      "summary": "トピックの概要（何が起きているか）",
      "sources": [
        {"title": "記事タイトル1", "url": "URL1"},
        {"title": "記事タイトル2", "url": "URL2"}
      ],
      "currentStatus": "現在の状況（速報/進行中/議論継続中など）",
      "viralElements": {
        "controversy": "高/中/低 - 理由",
        "emotion": "高/中/低 - 主な感情",
        "relatability": "高/中/低 - 対象層",
        "shareability": "高/中/低 - 共有動機",
        "timeSensitivity": "高/中/低 - 期限",
        "platformFit": "高/中/低 - {platform}での適合性"
      },
      "expertiseRelevance": "{expertise}との関連性の説明"
    }
  ],
  "categoryInsights": {
    "A_currentEvents": "現在の出来事から見えるトレンド",
    "B_technology": "テクノロジー・ビジネス関連のトレンド",
    "C_socialListening": "ソーシャルメディアから見えるトレンド",
    "D_viralPatterns": "バイラルパターンの全体的な傾向"
  },
  "topicCount": 数値,
  "collectionSummary": "収集した情報の全体的な要約",
  "nextStepMessage": "情報収集が完了しました。{topicCount}件のトレンドトピックを特定しました。これらの評価と優先順位付けを行うには「次へ進む」ボタンをクリックしてください。"
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

// フェーズ2：バズる機会評価
export const Phase2Strategy: OrchestratedPhase = {
  // Step 1: ウイルス速度指標とコンテンツアングル識別
  think: {
    prompt: `
# ユーザー設定
* 発信したい分野: {expertise}
* コンテンツのスタイル: {style}
* プラットフォーム: {platform}

# Phase 1で特定されたトレンドトピック
{trendedTopics}

# Phase 1で収集した詳細な分析データ
{searchResults}

# 評価の観点

## A：ウイルス速度指標
- 検索ボリュームの急増と成長率
- ソーシャルメンションの加速
- 複数プラットフォームの存在
- インフルエンサーの採用
- メディア報道の勢い

## B：コンテンツアングル
- 反対派は世論に異議を唱える
- 専門家による内部視点の分析
- 個人的なつながりの物語
- 教育の内訳
- 次に何が起こるかを予測するコンテンツ
- 舞台裏の洞察
- 過去のイベントとの比較内容

# 出力形式
必ず以下のJSON形式で出力してください：
{
  "evaluatedOpportunities": [
    {
      "topicName": "トピック名",
      "viralVelocityScore": 0.0-1.0,
      "velocityMetrics": {
        "searchGrowth": "急増/増加中/安定/減少",
        "socialAcceleration": "高速/中速/低速",
        "platformPresence": "複数/限定的/単一",
        "influencerAdoption": "多数/一部/なし",
        "mediamomentum": "強い/中程度/弱い"
      },
      "contentAngles": [
        {
          "angle": "反対派の視点/専門家分析/個人的物語など",
          "description": "このアングルの具体的な内容",
          "targetAudience": "想定読者層",
          "expectedReaction": "期待される反応"
        }
      ],
      "overallScore": 0.0-1.0,
      "reasoning": "総合的な評価理由"
    }
  ],
  "topOpportunities": [
    {
      "topicName": "トピック名",
      "score": 0.0-1.0,
      "bestAngle": "最も効果的なアングル",
      "keyReason": "選ばれた理由"
    }
  ],
  "analysisInsights": "全体的な分析から見えた洞察"
}
`,
    expectedOutput: 'OpportunityEvaluation',
    maxTokens: 3000,
    temperature: 0.6
  },

  // Step 2: メトリクス分析（Phase 1の結果を活用）
  execute: {
    action: 'analyzeMetrics',
    handler: async (evaluationPlan: any, context?: any) => {
      // Phase 1で収集した情報を基に、メトリクスを分析
      const phase1Result = context?.phase1Result || context?.trendedTopics || []
      
      console.log(`[Phase2Execute] Analyzing metrics for ${phase1Result.length} topics`)
      
      // 各トピックのviralElementsから速度指標を推定
      const metricsAnalysis = phase1Result.map((topic: any) => {
        const elements = topic.viralElements || {}
        
        return {
          topicName: topic.topicName,
          velocityIndicators: {
            // Phase 1の情報から推定
            searchGrowth: elements.timeSensitivity === '高' ? '急増' : 
                         elements.timeSensitivity === '中' ? '増加中' : '安定',
            socialAcceleration: elements.shareability === '高' ? '高速' :
                               elements.shareability === '中' ? '中速' : '低速',
            platformPresence: elements.platformFit === '高' ? '複数' : '限定的',
            // これらは実際のAPIがあれば詳細に取得可能
            influencerAdoption: '評価中',
            mediaMomentum: '評価中'
          },
          rawElements: elements,
          sources: topic.sources || []
        }
      })
      
      return {
        metricsAnalysis,
        analysisMethod: 'phase1_derived',
        note: '実際のAPI統合時により詳細なメトリクスを取得可能'
      }
    }
  },

  // Step 3: 総合評価とアングル統合
  integrate: {
    prompt: `
# ユーザー設定
* 発信したい分野: {expertise}
* コンテンツのスタイル: {style}
* プラットフォーム: {platform}

# Phase 2 Thinkで評価した機会
{evaluatedOpportunities}

# Phase 2 Executeで分析したメトリクス
{metricsAnalysis}

# 統合評価の観点
1. ウイルス速度指標の総合評価
2. 最も効果的なコンテンツアングルの選定
3. {expertise}と{platform}に最適な機会の特定

# 出力形式
必ず以下のJSON形式で出力してください：
{
  "finalEvaluation": [
    {
      "topicName": "トピック名",
      "finalScore": 0.0-1.0,
      "viralVelocity": {
        "score": 0.0-1.0,
        "summary": "速度指標の総合評価"
      },
      "bestAngle": {
        "type": "選ばれたアングル",
        "description": "具体的な内容",
        "whyEffective": "なぜこのアングルが効果的か"
      },
      "timing": {
        "urgency": "高/中/低",
        "optimalWindow": "今後48時間以内/1週間以内など",
        "reason": "タイミングの根拠"
      },
      "recommendation": "強く推奨/推奨/保留"
    }
  ],
  "selectedOpportunities": [
    {
      "topicName": "選ばれたトピック名",
      "score": 0.0-1.0,
      "angle": "採用するアングル",
      "priority": 1-3
    }
  ],
  "evaluationSummary": "全体的な評価サマリー",
  "nextStepMessage": "機会評価が完了しました。上位{X}件の機会を特定しました。これらのコンセプト作成に進むには「次へ進む」ボタンをクリックしてください。"
}
`,
    expectedOutput: 'OpportunityEvaluation',
    maxTokens: 2000
  }
}

// フェーズ3: バズるコンテンツのコンセプト作成
export const Phase3Strategy: OrchestratedPhase = {
  // Step 1: コンセプトの方向性決定
  think: {
    prompt: `
# 選ばれた機会
{selectedOpportunities}

# ユーザー設定
* 専門分野: {expertise}
* スタイル: {style}
* プラットフォーム: {platform}

# コンテンツアングルの種類
- 反対派は世論に異議を唱える
- 専門家による内部視点の分析
- 個人的なつながりの物語
- 教育の内訳
- 次に何が起こるかを予測するコンテンツ
- 舞台裏の洞察
- 過去のイベントとの比較内容

# 出力形式
必ず以下のJSON形式で出力してください：
{
  "directions": [
    {
      "opportunity": "機会の名前",
      "angles": [
        {
          "type": "エンタメ風実況/専門家解説/個人体験談など",
          "description": "なぜこの角度が効果的か",
          "targetEmotion": "狙う感情（共感/驚き/学び/議論など）"
        }
      ]
    }
  ]
}`,
    expectedOutput: 'ConceptDirections',
    maxTokens: 2000,
    temperature: 0.8
  },

  // Step 2: 参考事例の収集（現状はスキップ）
  execute: {
    action: 'findReferences',
    handler: async (directions) => {
      // 将来的に実装：類似の成功事例を検索
      return {
        platformTrends: {
          Twitter: ["スレッド形式", "エモい実録系", "専門知識×日常"],
          TikTok: ["30秒解説", "ビフォーアフター", "検証系"],
          Instagram: ["カルーセル", "インフォグラフィック", "ストーリーズ連載"]
        }
      }
    }
  },

  // Step 3: 具体的なコンセプト生成
  integrate: {
    prompt: `
# アプローチ
{directions}

# プラットフォーム特性
{platformTrends}

# Phase 1で収集した記事情報
{phase1Result}

# ユーザー設定
* 専門分野: {expertise}
* スタイル: {style}
* プラットフォーム: {platform}

# コンテンツコンセプトフレームワーク
それぞれの機会について、以下を開発します
A：形式: [スレッド/ビデオ/投稿タイプ]
B：フック: 「[注目を集める具体的なオープナー]」
C：角度: [独自の視点や見方]

# コンテンツ概要:
トレンドにつながるオープニングフック
[物語を構築する3～5つのキーポイント]
-予期せぬ洞察や啓示
-エンゲージメントを促進するCTA
-タイミング: 最大の効果を得るには [X] 時間以内に投稿してください
-ビジュアル: [具体的な画像/動画の説明]
-ハッシュタグ: [最適化されたタグ]

# 出力形式
必ず以下のJSON形式で出力してください：
{
  "concepts": [
    {
      "number": 1,
      "title": "コンセプトタイトル（例：Claudeとの会話が、後輩より役に立った瞬間）",
      "opportunity": "元となった機会",
      "platform": "{platform}",
      "format": "スレッド/単発投稿/動画など",
      "hook": "注目を集める具体的なオープナー（例：後輩よりClaudeのほうが"気が利く"と感じた瞬間があった）",
      "angle": "独自の視点（例：AIとの協業現場をエンタメ風に実況）",
      "structure": {
        "keyPoints": [
          "物語を構築するキーポイント1",
          "物語を構築するキーポイント2", 
          "物語を構築するキーポイント3"
        ],
        "unexpectedInsight": "予期せぬ洞察や啓示",
        "engagementCTA": "エンゲージメントを促進するCTA"
      },
      "visual": "ビジュアル案（例：Claudeとの実際のやりとり画面・黒背景Terminal風）",
      "timing": "投稿タイミングと理由（例：夜 - エモいエンタメ＋実録系が伸びやすい）",
      "hashtags": ["#関連タグ1", "#関連タグ2", "#関連タグ3"],
      "expectedReaction": "期待される反応（共感/議論/シェアなど）",
      "newsSource": "コンセプト作成のもととなったニュースソース",
      "sourceUrl": "ソースのURL"
    }
  ],
  "summary": "3つのコンセプトの簡潔な説明",
  "nextMessage": "バズるコンテンツのコンセプトの概要は次のとおりです。「次へ進む」ボタンをクリックすると、各コンセプトに基づいたコンテンツ作成を開始します"
}

重要：
- 各コンセプトは具体的で、すぐに実行可能なレベルまで詳細化する
- {expertise}の専門性を活かしつつ、一般の人にも伝わる内容にする
- {platform}の文化や形式に最適化する
- フックは必ず「続きを読みたくなる」ものにする`,
    expectedOutput: 'ContentConcepts',
    maxTokens: 4000,
    temperature: 0.7
  }
}

// フェーズ4: 実際のコンテンツ作成
export const Phase4Strategy: OrchestratedPhase = {
  // Step 1: コンテンツの詳細設計
  think: {
    prompt: `
# 選ばれたコンセプト
{concepts}

# ユーザー設定
* 専門分野: {expertise}
* スタイル: {style}
* プラットフォーム: {platform}


# 出力形式
必ず以下のJSON形式で出力してください：
{
  "selectedConceptIndex": 0-2の数値（最も効果的なコンセプトのインデックス）,
  "reasoning": "このコンセプトを選んだ理由",
  "contentStructure": {
    "openingHook": "最初の1文（絶対に続きを読みたくなる文）",
    "mainMessage": "核となるメッセージ",
    "supportingPoints": ["ポイント1", "ポイント2", "ポイント3"],
    "emotionalTriggers": ["感情トリガー1", "感情トリガー2"],
    "callToAction": "読者に促したい行動"
  },
  "visualElements": {
    "primaryVisual": "メインビジュアルの説明",
    "supportingVisuals": ["サポートビジュアル1", "サポートビジュアル2"]
  }
}`,
    expectedOutput: 'ContentDesign',
    maxTokens: 2000,
    temperature: 0.6
  },

  // Step 2: プラットフォーム最適化
  execute: {
    action: 'optimizeForPlatform',
    handler: async (design, context?: any) => {
      // Phase 3の結果から選択されたコンセプトを取得
      const selectedIndex = design.selectedConceptIndex || 0
      
      // contextから platform を取得（designに含まれていない場合）
      const platform = context?.platform || 'Twitter'
      
      // プラットフォーム特有の制限やベストプラクティスを適用
      const platformConstraints = {
        Twitter: {
          maxLength: 280,
          threadSupport: true,
          mediaTypes: ['画像', 'GIF', '動画（2分20秒まで）'],
          bestPractices: ['スレッド形式', '視覚的要素', 'リプライ誘導']
        },
        Instagram: {
          formats: ['フィード投稿', 'リール', 'ストーリーズ'],
          captionLength: 2200,
          hashtagLimit: 30,
          bestPractices: ['カルーセル活用', 'ビジュアル重視']
        },
        TikTok: {
          videoLength: { min: 15, max: 180 },
          captionLength: 2200,
          bestPractices: ['フック重視', '最初の3秒が勝負']
        },
        LinkedIn: {
          maxLength: 3000,
          mediaTypes: ['画像', '動画', 'ドキュメント'],
          bestPractices: ['専門性重視', 'インサイト共有', 'ビジネス価値']
        }
      }
      
      return {
        selectedConceptIndex: selectedIndex,
        platform: platform,
        constraints: platformConstraints[platform] || platformConstraints.Twitter,
        optimizationTips: ['文字数調整', 'ビジュアル追加', 'エンゲージメント要素']
      }
    }
  },

  // Step 3: 最終コンテンツ生成
  integrate: {
    prompt: `
# コンテンツ設計
{contentStructure}

# プラットフォーム制約
{constraints}

# 最適化ヒント
{optimizationTips}

# Phase 3で生成されたコンセプト一覧
{concepts}

# 選ばれたコンセプト（インデックス: {selectedConceptIndex}）
※上記のコンセプト一覧から選ばれたものを使用してください

# コンテンツ作成指示
コンセプト{selectedConceptIndex + 1}: [トレンドトピック] - 完全なコンテンツ
[{platform}にすぐにコピー＆ペースト可能な完全なコンテンツを作成してください]
[すべてのテキスト、書式、改行、絵文字、ハッシュタグを含める]
[完成させてすぐに投稿できるように準備する]
視覚的説明: [必要な画像/ビデオの詳細な説明]
投稿に関する注意事項: [具体的なタイミングと最適化のヒント]

# 出力形式
必ず以下のJSON形式で出力してください：
{
  "mainPost": "メイン投稿の完全なテキスト",
  "threadPosts": ["スレッド2", "スレッド3", "スレッド4"],  // Twitterの場合
  "hashtags": ["ハッシュタグ1", "ハッシュタグ2", "ハッシュタグ3"],
  "alternativeVersions": [
    {
      "version": "A",
      "hook": "別バージョンのフック",
      "reasoning": "このバージョンの狙い"
    }
  ],
  "visualDescription": "推奨される画像・動画の詳細な説明",
  "postingNote": "投稿時の注意点（絵文字の使用、改行位置など）",
  "expectedEngagement": {
    "likes": "予想いいね数の範囲",
    "shares": "予想シェア数の範囲",
    "comments": "予想コメントタイプ"
  }
}

重要：
- {platform}の文字数制限を厳守
- フックは必ず「スクロールを止めさせる」強さにする
- {expertise}の専門性と{style}のトーンを保つ
- 感情に訴える要素を必ず含める`,
    expectedOutput: 'FinalContent',
    maxTokens: 4000,
    temperature: 0.7
  }
}

// フェーズ5: 投稿戦略と実行計画
export const Phase5Strategy: OrchestratedPhase = {
  // Step 1: タイミング分析
  think: {
    prompt: `
# 作成されたコンテンツ
{mainPost}

# トピック分析
{phase1Result}

# プラットフォーム
{platform}


# 出力形式
必ず以下のJSON形式で出力してください：
{
  "timingAnalysis": {
    "bestDays": ["曜日1", "曜日2"],
    "bestHours": ["時間帯1", "時間帯2", "時間帯3"],
    "reasoning": "このタイミングが最適な理由",
    "avoidTimes": ["避けるべき時間帯"]
  },
  "competitionAnalysis": {
    "expectedCompetitors": ["競合トピック1", "競合トピック2"],
    "differentiationStrategy": "差別化のポイント"
  },
  "engagementStrategy": {
    "firstHourActions": ["最初の1時間でやること"],
    "followUpPosts": ["フォローアップ投稿案"],
    "communityEngagement": "コミュニティとの関わり方"
  }
}`,
    expectedOutput: 'TimingStrategy',
    maxTokens: 2000,
    temperature: 0.6
  },

  // Step 2: KPI設定
  execute: {
    action: 'setKPIs',
    handler: async (strategy) => {
      // 過去のパフォーマンスデータに基づくKPI設定
      // 実際にはDBから類似投稿のパフォーマンスを取得
      return {
        benchmarks: {
          averageLikes: 500,
          averageShares: 50,
          averageComments: 30,
          viralThreshold: { likes: 5000, shares: 500 }
        },
        historicalData: {
          similarTopics: [
            { topic: "AI活用", avgEngagement: 1200 },
            { topic: "働き方改革", avgEngagement: 800 }
          ]
        }
      }
    }
  },

  // Step 3: 実行計画策定
  integrate: {
    prompt: `
# タイミング戦略
{timingAnalysis}

# ベンチマーク
{benchmarks}

# 過去データ
{historicalData}

# コンテンツ
{mainPost}


# 出力形式
必ず以下のJSON形式で出力してください：
{
  "executionPlan": {
    "immediateActions": [
      {
        "time": "投稿時",
        "action": "具体的なアクション",
        "purpose": "目的"
      },
      {
        "time": "投稿後30分",
        "action": "具体的なアクション",
        "purpose": "目的"
      }
    ],
    "scheduleFollowUps": [
      {
        "timing": "投稿後2時間",
        "content": "フォローアップ投稿案",
        "trigger": "実行条件（エンゲージメント数など）"
      }
    ]
  },
  "kpis": {
    "targets": {
      "1hour": { "impressions": "目標数", "engagement": "目標数" },
      "6hours": { "impressions": "目標数", "engagement": "目標数" },
      "24hours": { "impressions": "目標数", "engagement": "目標数" }
    },
    "successCriteria": "成功と判断する基準",
    "pivotStrategy": "目標未達時の対応策"
  },
  "monitoringPlan": {
    "checkpoints": ["30分後", "2時間後", "6時間後", "24時間後"],
    "metricsToTrack": ["インプレッション", "エンゲージメント率", "シェア率"],
    "alertThresholds": {
      "lowEngagement": "アラートを出す基準",
      "viralPotential": "バズ認定基準"
    }
  },
  "bestTimeToPost": ["具体的な投稿推奨時刻1", "具体的な投稿推奨時刻2"],
  "expectedEngagement": "このコンテンツの予想パフォーマンス",
  "followUpStrategy": "投稿後のフォローアップ戦略の要約"
}`,
    expectedOutput: 'ExecutionPlan',
    maxTokens: 3000,
    temperature: 0.5
  }
}

// Orchestratorクラス
export class ChainOfThoughtOrchestrator {
  private llm: any
  private appHandlers: Map<string, Function>

  constructor(llm: any) {
    this.llm = llm
    this.appHandlers = new Map()
  }

  async executePhase(
    phase: OrchestratedPhase, 
    context: any
  ): Promise<any> {
    // Step 1: Think
    const thinkResult = await this.llm.complete({
      prompt: this.interpolate(phase.think.prompt, context),
      maxTokens: phase.think.maxTokens
    })

    // Step 2: Execute (contextを渡す)
    const executeResult = await phase.execute.handler(thinkResult, context)

    // Step 3: Integrate
    const integrateResult = await this.llm.complete({
      prompt: this.interpolate(phase.integrate.prompt, {
        ...context,
        ...thinkResult,
        ...executeResult
      }),
      maxTokens: phase.integrate.maxTokens
    })

    return {
      thinking: thinkResult,
      execution: executeResult,
      integration: integrateResult,
      summary: this.extractSummary(integrateResult)
    }
  }

  private interpolate(template: string, data: any): string {
    return template.replace(/{(\w+)}/g, (match, key) => {
      return data[key] || match
    })
  }

  private extractSummary(result: any): string {
    // 結果から次のフェーズに必要な要約を抽出
    return ''
  }
}

// 使用例
export async function runOrchestratedCoT(sessionId: string, llmClient: any, userConfig?: any) {
  const orchestrator = new ChainOfThoughtOrchestrator(llmClient)
  
  // 初期コンテキスト
  const context = {
    userConfig: userConfig || { 
      expertise: 'AI × 働き方', 
      style: '解説',
      platform: 'Twitter'
    }
  }

  // Phase 1実行
  const phase1Result = await orchestrator.executePhase(
    Phase1Strategy, 
    context
  )
  
  // Phase 2実行（Phase1の結果を引き継ぐ）
  const phase2Context = {
    ...context,
    opportunities: phase1Result.integration.viralPatterns?.topOpportunities || []
  }
  
  const phase2Result = await orchestrator.executePhase(
    Phase2Strategy,
    phase2Context
  )

  // 全体の結果を返す
  return {
    phase1: phase1Result,
    phase2: phase2Result
  }
}