/**
 * Orchestrated Chain of Thought Strategy
 * 
 * 各フェーズを「思考」「実行」「統合」の3段階に分解
 * オリジナルのChatGPTプロンプトを忠実に実装
 */

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
  handler: (input: any) => Promise<any>
}

// フェーズ1: トレンド情報の収集（動的検索クエリ生成）
export const Phase1Strategy: OrchestratedPhase = {
  // Step 1: 検索クエリ生成
  think: {
    prompt: `
# 🧭 ステップ0：テーマと役割の把握
* 発信したい分野: {expertise}
* 目標: 流行の波がピークに達する前に、その兆しを捉える
* 立場: バズるコンテンツ戦略家（戦略視点・感情視点・構造視点の3層で観察）

# 🔍 ステップ1：検索クエリの設計

## 1-1. テーマ「{expertise}」の意味を解体する
まず、このテーマを以下の観点で細分化してください：
- 技術的側面（最新ツール、手法、革新）
- 社会的側面（影響、変化、議論）
- 制度的側面（規制、ポリシー、業界動向）

## 1-2. バズるコンテンツ戦略家として語彙を設計
戦略視点・感情視点・構造視点の3層で観察し、以下の意図別キーワードを組み合わせてください：
- 最新性: latest, 2025, trends, report, newest, update
- 信頼性: 調査, white paper, study, research, expert
- バズ性: shock, change, explosion, controversy, debate

## 1-3. クエリ構成式
[{expertise}関連語] + [影響分野] + [速報性/影響性ワード]

# ユーザー設定
* プラットフォーム: {platform}
* スタイル: {style}

# 出力形式
必ず以下のJSON形式で出力してください：
{
  "themeAnalysis": {
    "技術": ["サブテーマ1", "サブテーマ2"],
    "社会": ["サブテーマ1", "サブテーマ2"],
    "制度": ["サブテーマ1", "サブテーマ2"]
  },
  "queries": [
    {
      "category": "技術/社会/制度",
      "subtheme": "具体的なサブテーマ",
      "query": "検索クエリ（英語推奨）",
      "queryJa": "検索クエリ（日本語版）",
      "intent": "何を探しているか",
      "expectedInsight": "期待される洞察",
      "buzzPotential": "高/中/低"
    }
  ]
}

重要：
- {expertise}の専門性を深く理解した上で検索クエリを設計
- 英語と日本語の両方でクエリを生成（グローバルと国内の視点）
- バズの兆しを捉えるため、感情トリガーとなる語彙を含める
- 5-7個の高品質な検索クエリを生成（量より質を重視）`,
    expectedOutput: 'SearchQueries',
    maxTokens: 2000,
    temperature: 0.7
  },

  // Step 2: Web検索実行
  execute: {
    action: 'performWebSearch',
    handler: async (searchQueries: any) => {
      console.log('[Phase1Execute] Starting web search with queries:', searchQueries.queries?.length || 0)
      
      // Google Custom Search APIを使用した検索
      const { googleSearch } = await import('./google-search')
      
      const searchResults = []
      for (const queryObj of searchQueries.queries || []) {
        try {
          console.log(`[Phase1Execute] Searching: "${queryObj.query}" (${queryObj.category})`)
          
          // 最新情報を取得するため、7日以内に限定
          const results = await googleSearch.searchNews(queryObj.query, 7)
          
          console.log(`[Phase1Execute] Found ${results.length} results for "${queryObj.query}"`)
          
          searchResults.push({
            query: queryObj.query,
            category: queryObj.category,
            intent: queryObj.intent,
            expertAngle: queryObj.expertAngle,
            results: results.slice(0, 5).map(item => ({
              title: item.title,
              url: item.link,
              snippet: item.snippet,
              source: item.displayLink
            }))
          })
        } catch (error) {
          console.error(`[Phase1Execute] Search failed for query: ${queryObj.query}`, error)
          // エラーでも継続（空の結果を追加）
          searchResults.push({
            query: queryObj.query,
            category: queryObj.category,
            intent: queryObj.intent,
            expertAngle: queryObj.expertAngle,
            results: []
          })
        }
      }
      
      console.log(`[Phase1Execute] Total search results collected: ${searchResults.length}`)
      return { searchResults }
    }
  },

  // Step 3: 統合・分析
  integrate: {
    prompt: `
# 🧠 ステップ3：GPTによる分析と機会特定

## 役割設定
あなたは、バズるコンテンツ戦略家です。
* 発信したい分野: {expertise}
* プラットフォーム: {platform}  
* スタイル: {style}

## 🧾 ステップ2で収集した検索結果
{searchResults}

## 分析タスク

### 3-1. トピック抽出と構造化
検索結果から、バズの兆しとなるトピックを抽出してください。
各トピックは以下の要素を含めてください：

**【トピック名】**
- 要約：核心を50文字以内で
- 出典1：記事タイトル（必ずURL付き）
- 出典2：記事タイトル（必ずURL付き）※複数ソースで裏付け
- バズ要素：（感情トリガー／議論性／共感性）
- 専門家視点：{expertise}の観点から見た独自の切り口

### 3-2. バイラルパターン認識（6軸評価）
各トピックを以下の6軸で評価（0-1のスコア）：
1. **論争レベル** - 強い意見を生み出すか
2. **感情の強さ** - 驚き・焦燥・期待・憤慨を引き起こすか
3. **共感性要因** - 多くの人に「自分ごと」と感じさせるか
4. **共有可能性** - 「これは広めたい」と思わせるか
5. **タイミングの敏感さ** - 今このタイミングだからこそ価値があるか
6. **{platform}適合度** - プラットフォームの文化に合っているか

### 3-3. 感情トリガーの抽出
スニペット中の以下の感情語を特に注目：
- 驚き系：「衝撃」「予想外」「まさか」
- 焦燥系：「急速に」「加速」「取り残される」
- 期待系：「革新」「新時代」「可能性」
- 議論系：「賛否」「議論」「波紋」

## 出力形式
必ず以下のJSON形式で出力してください：
{
  "extractedTopics": [
    {
      "topicName": "具体的なトピック名",
      "summary": "核心を捉えた50文字以内の要約",
      "sources": [
        {"title": "記事タイトル", "url": "必須：完全なURL"},
        {"title": "記事タイトル", "url": "必須：完全なURL"}
      ],
      "buzzElements": {
        "emotionalTrigger": "具体的な感情トリガー",
        "controversyLevel": "高/中/低",
        "relatabilityFactor": "共感ポイント"
      },
      "expertPerspective": "{expertise}の専門家としての独自解釈",
      "viralScores": {
        "controversy": 0.0-1.0,
        "emotion": 0.0-1.0,
        "relatability": 0.0-1.0,
        "shareability": 0.0-1.0,
        "timeSensitivity": 0.0-1.0,
        "platformFit": 0.0-1.0
      },
      "overallScore": 0.0-1.0,
      "reasoning": "このトピックがバズる理由"
    }
  ],
  "topOpportunities": [
    // overallScoreが高い順に最大5件
  ],
  "opportunityCount": 数値,
  "analysisInsights": "全体を通じて見えてきたトレンドや傾向",
  "nextStepMessage": "トレンド分析に基づき、今後48時間以内に[X]件のバズるチャンスが出現すると特定しました。"
}

## 🚨 注意点
- 引用元は必ずURL付きで記載する（ファクトチェック可能性のため）
- URLがない情報源は使用しない
- 感情語は具体的に引用する
- {expertise}の文脈を常に意識する`,
    expectedOutput: 'TrendAnalysis',
    maxTokens: 4000,
    temperature: 0.5
  }
}

// フェーズ2の例：バズる機会評価
export const Phase2Strategy: OrchestratedPhase = {
  // Step 1: 評価基準の生成
  think: {
    prompt: `
前フェーズで特定された機会：
{opportunities}

これらの機会を評価するための具体的な基準と、
調査すべきデータポイントを生成してください。

# 出力形式
必ず以下のJSON形式で出力してください：
{
  "evaluationCriteria": [
    {
      "criterion": "検索ボリュームの急上昇",
      "dataPoints": ["Google Trends", "Twitter検索数"],
      "threshold": "24時間で200%以上の増加"
    }
  ],
  "analysisQueries": [
    "具体的な調査クエリ"
  ]
}
`,
    expectedOutput: 'EvaluationPlan',
    maxTokens: 1000
  },

  // Step 2: データ収集
  execute: {
    action: 'collectMetrics',
    handler: async (_plan) => {
      // TODO: 実際のメトリクス収集を実装
      // Google Trends API
      // Twitter Analytics
      // Reddit API
      // などからデータ収集
      return {
        metrics: {
          searchVolume: {
            "AIとホワイトカラー職の自動化": { trend: "急上昇", change: "+250%" },
            "AIと人間の協働": { trend: "安定", change: "+15%" }
          },
          socialMentions: {
            "AIとホワイトカラー職の自動化": { count: 15000, sentiment: "mixed" },
            "AIと人間の協働": { count: 8000, sentiment: "positive" }
          },
          sentimentAnalysis: {
            overall: "concern_and_curiosity"
          }
        }
      }
    }
  },

  // Step 3: 総合評価
  integrate: {
    prompt: `
評価基準：
{evaluationCriteria}

収集したメトリクス：
{metrics}

これらのデータに基づいて、各機会のバズポテンシャルを評価し、
最も可能性の高い機会を特定してください。

# 出力形式
必ず以下のJSON形式で出力してください：
{
  "evaluatedOpportunities": [
    {
      "opportunityName": "機会の名前",
      "finalScore": 0.0-1.0の数値,
      "analysis": {
        "strengths": ["強み1", "強み2"],
        "weaknesses": ["弱み1", "弱み2"],
        "timing": "なぜ今なのか",
        "audienceReaction": "予想される反応"
      },
      "recommendation": "推奨/保留/却下"
    }
  ],
  "selectedOpportunities": [
    {
      "name": "選ばれた機会名",
      "reason": "選択理由",
      "priority": 1-3の優先順位
    }
  ],
  "insights": "総合的な洞察"
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

# タスク
各機会に対して、異なる角度（アングル）を設定してください。
実行可能なトレンドごとに、独自の角度を特定します：
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

# ユーザー設定
* 専門分野: {expertise}
* スタイル: {style}
* プラットフォーム: {platform}

# タスク
3つの具体的で実行可能なコンテンツコンセプトを作成してください。

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
      "structure": [
        "[1] 具体的な投稿内容1",
        "[2] 具体的な投稿内容2",
        "[3] 具体的な投稿内容3",
        "[4] オチ・締めの内容"
      ],
      "visual": "ビジュアル案（例：Claudeとの実際のやりとり画面・黒背景Terminal風）",
      "timing": "投稿タイミングと理由（例：夜 - エモいエンタメ＋実録系が伸びやすい）",
      "hashtags": ["#関連タグ1", "#関連タグ2", "#関連タグ3"],
      "expectedReaction": "期待される反応（共感/議論/シェアなど）"
    }
  ],
  "summary": "3つのコンセプトの簡潔な説明",
  "nextMessage": "バズるコンテンツのコンセプトの概要は次のとおりです。「続行」と入力すると、各コンセプトに基づいたコンテンツ作成を開始します"
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

    // Step 2: Execute
    const executeResult = await phase.execute.handler(thinkResult)

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
export async function runOrchestratedCoT(sessionId: string, llmClient: any) {
  const orchestrator = new ChainOfThoughtOrchestrator(llmClient)
  
  // 初期コンテキスト
  const context = {
    userConfig: { 
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