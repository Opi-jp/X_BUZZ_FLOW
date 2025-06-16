/**
 * エレガントなChain of Thoughtフロー
 * 
 * 4つのAPI呼び出しで完結：
 * 1. GPT: 検索クエリを考える（Phase 1 THINK）
 * 2. Perplexity: 検索結果を返す（Phase 1 EXECUTE）
 * 3. GPT: トレンド分析とコンセプト生成（Phase 1 INTEGRATE + Phase 2-3）
 * 4. GPT: コンテンツ生成と戦略策定（Phase 4-5）
 */

import { prisma } from './prisma'
import { callGPT } from './openai'
import { searchWithPerplexity } from './perplexity'
import { orchestratedStrategy } from './orchestrated-cot-strategy'

export interface CotFlowConfig {
  sessionId: string
  theme: string  // 発信したいテーマ
  style: string
  platform: string
}

export class ElegantCotFlow {
  constructor(private config: CotFlowConfig) {}

  /**
   * Step 1: GPTが検索クエリを考える
   */
  async step1_generateQueries(): Promise<any> {
    console.log('[FLOW] Step 1: Generating search queries...')
    
    const prompt = orchestratedStrategy.phase1.think({
      theme: this.config.theme,
      style: this.config.style,
      platform: this.config.platform
    })

    const response = await callGPT(prompt)
    
    // 結果を保存
    await this.savePhaseResult(1, 'THINK', response)
    
    return response
  }

  /**
   * Step 2: Perplexityが検索結果を返す
   */
  async step2_searchWithPerplexity(queries: any): Promise<any> {
    console.log('[FLOW] Step 2: Searching with Perplexity...')
    
    const searchResults = await searchWithPerplexity(queries)
    
    // 結果を保存
    await this.savePhaseResult(1, 'EXECUTE', searchResults)
    
    return searchResults
  }

  /**
   * Step 3: GPTがトレンド分析とコンセプト生成
   * Phase 1 INTEGRATE + Phase 2 + Phase 3を一度に処理
   */
  async step3_analyzeAndGenerateConcepts(searchResults: any): Promise<any> {
    console.log('[FLOW] Step 3: Analyzing trends and generating concepts...')
    
    // 統合プロンプト：トレンド分析から3つのコンセプト生成まで
    const prompt = `
あなたは、新たなトレンドを特定し、流行の波がピークに達する前にその波に乗るコンテンツのコンセプトを作成するバズるコンテンツ戦略家です。

以下の検索結果を分析し、以下の3つのタスクを実行してください：

1. **トレンド分析**: バイラルの可能性が高いトピックを2-3個特定
2. **機会評価**: 各トピックのバイラルポテンシャルを評価
3. **コンセプト生成**: 最も有望な機会から3つの異なるコンセプトを作成

# 検索結果
${JSON.stringify(searchResults, null, 2)}

# 設定
- 発信したいテーマ: ${this.config.theme}
- プラットフォーム: ${this.config.platform}
- スタイル: ${this.config.style}

# 出力形式
必ず以下のJSON形式で出力してください：
{
  "trendedTopics": [
    {
      "topic": "トピック名",
      "whyTrending": "なぜ話題になっているか",
      "viralPotential": "high/medium/low",
      "emotionalHooks": ["感情的フック1", "感情的フック2"],
      "controversy": "議論や論争の要素",
      "freshAngle": "新しい視点"
    }
  ],
  "selectedOpportunity": {
    "topic": "選ばれたトピック",
    "rationale": "選択理由"
  },
  "concepts": [
    {
      "number": 1,
      "format": "thread/single/carousel",
      "hook": "オープニングフック",
      "angle": "独自の視点",
      "keyPoints": ["ポイント1", "ポイント2", "ポイント3", "CTA", "ビジュアル説明"]
    }
  ]
}
`

    const response = await callGPT(prompt)
    
    // Phase 1 INTEGRATE として保存
    await this.savePhaseResult(1, 'INTEGRATE', {
      trendedTopics: response.trendedTopics,
      overallAnalysis: response.selectedOpportunity
    })
    
    // Phase 2の結果として保存（評価部分）
    await this.savePhaseResult(2, 'INTEGRATE', {
      evaluatedOpportunities: response.trendedTopics,
      selectedOpportunities: [response.selectedOpportunity]
    })
    
    // Phase 3の結果として保存（コンセプト部分）
    await this.savePhaseResult(3, 'INTEGRATE', {
      concepts: response.concepts
    })
    
    return response
  }

  /**
   * Step 4: GPTがコンテンツ生成と戦略策定
   * Phase 4 + Phase 5を一度に処理
   */
  async step4_generateContentAndStrategy(concepts: any): Promise<any> {
    console.log('[FLOW] Step 4: Generating content and strategy...')
    
    const prompt = `
あなたは、新たなトレンドを特定し、流行の波がピークに達する前にその波に乗るコンテンツのコンセプトを作成するバズるコンテンツ戦略家です。

以下の3つのコンセプトから、完全なコンテンツと実行戦略を作成してください。

# コンセプト
${JSON.stringify(concepts, null, 2)}

# 設定
- スタイル: ${this.config.style}
- プラットフォーム: ${this.config.platform}

# タスク
1. 各コンセプトを物語性のある完全な投稿文に展開
2. 各コンテンツの投稿戦略とKPIを設定

重要：単なる情報伝達ではなく、読者の感情を動かし、共感を生み、シェアしたくなる物語として構成してください。

# 出力形式
必ず以下のJSON形式で出力してください：
{
  "contents": [
    {
      "conceptNumber": 1,
      "title": "投稿タイトル",
      "mainPost": "完全な投稿文（改行、絵文字、ハッシュタグ含む）",
      "hashtags": ["ハッシュタグ1", "ハッシュタグ2"],
      "visualDescription": "必要な画像/動画の説明",
      "postingNotes": "投稿タイミングと最適化のヒント",
      "strategy": {
        "optimalTiming": "最適な投稿時間",
        "audienceTargeting": "ターゲットオーディエンス",
        "engagementTactics": "エンゲージメント向上策",
        "kpis": {
          "impressions": "目標インプレッション",
          "engagementRate": "目標エンゲージメント率",
          "shares": "目標シェア数"
        }
      }
    }
  ]
}
`

    const response = await callGPT(prompt)
    
    // Phase 4の結果として保存
    await this.savePhaseResult(4, 'INTEGRATE', {
      contents: response.contents.map(c => ({
        conceptNumber: c.conceptNumber,
        title: c.title,
        mainPost: c.mainPost,
        hashtags: c.hashtags,
        visualDescription: c.visualDescription,
        postingNotes: c.postingNotes
      }))
    })
    
    // Phase 5の結果として保存
    await this.savePhaseResult(5, 'INTEGRATE', {
      executionPlans: response.contents.map(c => ({
        contentNumber: c.conceptNumber,
        strategy: c.strategy
      }))
    })
    
    return response
  }

  /**
   * 完全なフローを実行
   */
  async execute(): Promise<void> {
    try {
      // Step 1: 検索クエリ生成
      const queries = await this.step1_generateQueries()
      
      // Step 2: Perplexity検索
      const searchResults = await this.step2_searchWithPerplexity(queries)
      
      // Step 3: 分析とコンセプト生成
      const analysisAndConcepts = await this.step3_analyzeAndGenerateConcepts(searchResults)
      
      // Step 4: コンテンツと戦略生成
      const contentAndStrategy = await this.step4_generateContentAndStrategy(analysisAndConcepts.concepts)
      
      // 下書き作成
      await this.createDrafts(contentAndStrategy.contents)
      
      // セッション完了
      await prisma.cotSession.update({
        where: { id: this.config.sessionId },
        data: {
          status: 'COMPLETED',
          currentPhase: 5,
          currentStep: 'INTEGRATE'
        }
      })
      
      console.log('[FLOW] Completed successfully!')
      
    } catch (error) {
      console.error('[FLOW] Error:', error)
      
      await prisma.cotSession.update({
        where: { id: this.config.sessionId },
        data: {
          status: 'FAILED',
          lastError: error instanceof Error ? error.message : 'Unknown error'
        }
      })
      
      throw error
    }
  }

  /**
   * フェーズ結果を保存
   */
  private async savePhaseResult(
    phase: number,
    step: 'THINK' | 'EXECUTE' | 'INTEGRATE',
    result: any
  ): Promise<void> {
    const columnMap = {
      THINK: 'thinkResult',
      EXECUTE: 'executeResult',
      INTEGRATE: 'integrateResult'
    }
    
    await prisma.cotPhase.upsert({
      where: {
        sessionId_phase: {
          sessionId: this.config.sessionId,
          phase
        }
      },
      update: {
        [columnMap[step]]: result,
        updatedAt: new Date()
      },
      create: {
        sessionId: this.config.sessionId,
        phase,
        [columnMap[step]]: result
      }
    })

    await prisma.cotSession.update({
      where: { id: this.config.sessionId },
      data: {
        currentPhase: phase,
        currentStep: step,
        status: step === 'THINK' ? 'THINKING' : 
                step === 'EXECUTE' ? 'EXECUTING' : 'INTEGRATING'
      }
    })
  }

  /**
   * 下書きを作成
   */
  private async createDrafts(contents: any[]): Promise<void> {
    for (const content of contents) {
      await prisma.cotDraft.create({
        data: {
          sessionId: this.config.sessionId,
          conceptNumber: content.conceptNumber,
          title: content.title,
          content: content.mainPost,
          hashtags: content.hashtags,
          visualDescription: content.visualDescription,
          postingNotes: content.postingNotes,
          status: 'DRAFT'
        }
      })
    }
  }
}

/**
 * セッションを実行する簡潔な関数
 */
export async function runElegantCotFlow(sessionId: string): Promise<void> {
  const session = await prisma.cotSession.findUnique({
    where: { id: sessionId }
  })
  
  if (!session) {
    throw new Error('Session not found')
  }
  
  const flow = new ElegantCotFlow({
    sessionId,
    theme: session.theme,
    style: session.style,
    platform: session.platform
  })
  
  await flow.execute()
}