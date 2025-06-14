import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    
    // Vercelタイムアウト対策: レスポンスヘッダー設定
    const headers = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    }

    // セッション情報を取得
    const session = await prisma.gptAnalysis.findUnique({
      where: { id: sessionId }
    })

    if (!session) {
      return NextResponse.json(
        { error: 'セッションが見つかりません' },
        { status: 404, headers }
      )
    }

    const config = session.metadata as any
    const sessionData = session.response as any

    if (!sessionData?.step4) {
      return NextResponse.json(
        { error: 'Step 4のデータが見つかりません。まずStep 4を実行してください。' },
        { status: 400, headers }
      )
    }

    console.log('=== Step 5: Execution Strategy with Function Calling ===')
    console.log('Session ID:', sessionId)
    console.log('Ready contents:', sessionData.step4?.complete_contents?.length || 0)

    const startTime = Date.now()

    // Function Definition for execution strategy
    const createExecutionStrategyFunction = {
      name: 'create_execution_strategy',
      description: '生成されたコンテンツの実行戦略とKPIを策定',
      parameters: {
        type: 'object',
        properties: {
          immediate_actions: {
            type: 'object',
            properties: {
              pre_launch_checklist: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    task: { type: 'string', description: 'タスク内容' },
                    priority: { type: 'string', description: '優先度（high/medium/low）' },
                    estimated_time: { type: 'string', description: '所要時間' }
                  },
                  required: ['task', 'priority', 'estimated_time']
                }
              },
              content_finalization: {
                type: 'array',
                items: { type: 'string' },
                description: '最終調整項目'
              },
              platform_preparation: {
                type: 'object',
                properties: {
                  profile_optimization: { type: 'array', items: { type: 'string' } },
                  scheduling_setup: { type: 'string', description: 'スケジューリング設定' },
                  monitoring_tools: { type: 'array', items: { type: 'string' } }
                },
                required: ['profile_optimization', 'scheduling_setup', 'monitoring_tools']
              }
            },
            required: ['pre_launch_checklist', 'content_finalization', 'platform_preparation']
          },
          posting_strategy: {
            type: 'object',
            properties: {
              posting_schedule: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    content_index: { type: 'number', description: 'コンテンツインデックス' },
                    optimal_datetime: { type: 'string', description: '最適投稿日時' },
                    reason: { type: 'string', description: '理由' },
                    expected_performance: {
                      type: 'object',
                      properties: {
                        impressions: { type: 'string', description: '予想インプレッション' },
                        engagement_rate: { type: 'string', description: '予想エンゲージメント率' },
                        viral_probability: { type: 'number', description: 'バイラル確率（0-1）' }
                      },
                      required: ['impressions', 'engagement_rate', 'viral_probability']
                    }
                  },
                  required: ['content_index', 'optimal_datetime', 'reason', 'expected_performance']
                }
              },
              engagement_tactics: {
                type: 'object',
                properties: {
                  first_hour_actions: { type: 'array', items: { type: 'string' } },
                  community_engagement: { type: 'array', items: { type: 'string' } },
                  influencer_outreach: { type: 'array', items: { type: 'string' } }
                },
                required: ['first_hour_actions', 'community_engagement', 'influencer_outreach']
              },
              cross_promotion: {
                type: 'array',
                items: { type: 'string' },
                description: 'クロスプロモーション戦略'
              }
            },
            required: ['posting_schedule', 'engagement_tactics', 'cross_promotion']
          },
          monitoring_plan: {
            type: 'object',
            properties: {
              key_metrics: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    metric_name: { type: 'string', description: 'メトリクス名' },
                    target_value: { type: 'string', description: '目標値' },
                    measurement_timing: { type: 'string', description: '測定タイミング' }
                  },
                  required: ['metric_name', 'target_value', 'measurement_timing']
                }
              },
              response_protocols: {
                type: 'object',
                properties: {
                  positive_momentum: { type: 'array', items: { type: 'string' } },
                  negative_feedback: { type: 'array', items: { type: 'string' } },
                  viral_moment: { type: 'array', items: { type: 'string' } }
                },
                required: ['positive_momentum', 'negative_feedback', 'viral_moment']
              },
              pivot_criteria: {
                type: 'array',
                items: { type: 'string' },
                description: 'ピボット判断基準'
              }
            },
            required: ['key_metrics', 'response_protocols', 'pivot_criteria']
          },
          follow_up_strategy: {
            type: 'object',
            properties: {
              content_amplification: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    timing: { type: 'string', description: 'タイミング' },
                    action: { type: 'string', description: 'アクション' },
                    expected_impact: { type: 'string', description: '期待効果' }
                  },
                  required: ['timing', 'action', 'expected_impact']
                }
              },
              secondary_content: {
                type: 'array',
                items: { type: 'string' },
                description: '二次コンテンツ案'
              },
              long_term_value: {
                type: 'object',
                properties: {
                  content_repurposing: { type: 'array', items: { type: 'string' } },
                  learning_extraction: { type: 'array', items: { type: 'string' } },
                  community_building: { type: 'array', items: { type: 'string' } }
                },
                required: ['content_repurposing', 'learning_extraction', 'community_building']
              }
            },
            required: ['content_amplification', 'secondary_content', 'long_term_value']
          },
          success_criteria: {
            type: 'object',
            properties: {
              minimum_goals: {
                type: 'object',
                properties: {
                  impressions: { type: 'string' },
                  engagement_rate: { type: 'string' },
                  follower_growth: { type: 'string' }
                },
                required: ['impressions', 'engagement_rate', 'follower_growth']
              },
              stretch_goals: {
                type: 'object',
                properties: {
                  viral_reach: { type: 'string' },
                  media_coverage: { type: 'string' },
                  business_impact: { type: 'string' }
                },
                required: ['viral_reach', 'media_coverage', 'business_impact']
              },
              timeline: { type: 'string', description: '評価期間' }
            },
            required: ['minimum_goals', 'stretch_goals', 'timeline']
          }
        },
        required: ['immediate_actions', 'posting_strategy', 'monitoring_plan', 'follow_up_strategy', 'success_criteria']
      }
    }

    // Chain of Thought プロンプト構築
    const cotPrompt = buildExecutionStrategyPrompt(config.config, sessionData)

    // GPT-4o Function Calling実行
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `あなたは、新たなトレンドを特定し、流行の波がピークに達する前にその波に乗るコンテンツのコンセプトを作成するバズるコンテンツ戦略家です。

## フェーズ4: 実行戦略

実装ガイダンスを提供します。

実行タイムライン
- 即時（2～4時間）：コンテンツ作成、ビジュアル準備、プラットフォームのセットアップ
- 投稿期間（4～24時間）: 最適なタイミング、リアルタイム監視、対応戦略
- フォローアップ（24～48時間）：増幅戦術、フォローアップコンテンツ、パフォーマンス分析

最適化技術
- リアルタイム調整のためのエンゲージメントの監視
- 関連するバズるコンテンツに関する戦略的なコメント
- 複数プラットフォーム共有で最大限のリーチを実現
- 知名度を高めるためのインフルエンサーとのエンゲージメント

必ずcreate_execution_strategy関数を呼び出して、詳細な実行戦略を返してください。`
        },
        {
          role: 'user',
          content: cotPrompt
        }
      ],
      functions: [createExecutionStrategyFunction],
      function_call: { name: 'create_execution_strategy' },
      temperature: 0.7,
      max_tokens: 4000
    })

    const duration = Date.now() - startTime
    console.log('Step 5 duration:', duration, 'ms')

    // Function Callingの結果を取得
    const functionCall = response.choices[0]?.message?.function_call
    let strategyResult = null

    if (functionCall && functionCall.name === 'create_execution_strategy') {
      try {
        strategyResult = JSON.parse(functionCall.arguments)
        console.log('Execution strategy created successfully')
      } catch (e) {
        console.error('Failed to parse execution strategy:', e)
        return NextResponse.json(
          { error: '実行戦略の解析に失敗しました' },
          { status: 500, headers }
        )
      }
    } else {
      return NextResponse.json(
        { error: '実行戦略Function Callingが実行されませんでした' },
        { status: 500, headers }
      )
    }

    // 結果をデータベースに保存
    const currentResponse = session.response as Record<string, any> || {}
    const currentMetadata = session.metadata as Record<string, any> || {}
    
    await prisma.gptAnalysis.update({
      where: { id: sessionId },
      data: {
        response: {
          ...currentResponse,
          step5: strategyResult
        },
        tokens: (session.tokens || 0) + (response.usage?.total_tokens || 0),
        duration: (session.duration || 0) + duration,
        metadata: {
          ...currentMetadata,
          currentStep: 5,
          step5CompletedAt: new Date().toISOString(),
          analysisComplete: true,
          usedFunctionCalling: true
        }
      }
    })

    // サマリー情報の生成
    const totalDuration = currentMetadata.step1Duration + 
                         currentMetadata.step2Duration + 
                         currentMetadata.step3Duration + 
                         duration
    
    const summary = {
      analysisComplete: true,
      totalSteps: 5,
      totalDuration: `${Math.round(totalDuration / 1000)}秒`,
      totalTokens: (session.tokens || 0) + (response.usage?.total_tokens || 0),
      readyContents: sessionData.step4?.complete_contents?.length || 0,
      nextActions: strategyResult.immediate_actions?.pre_launch_checklist?.map((item: any) => item.task) || [],
      estimatedReach: sessionData.step4?.content_summary?.estimated_reach || 'N/A',
      launchReadiness: '100%'
    }

    return NextResponse.json({
      success: true,
      sessionId,
      step: 5,
      method: 'Chain of Thought + Function Calling',
      response: strategyResult,
      metrics: {
        duration,
        tokensUsed: response.usage?.total_tokens || 0
      },
      summary,
      message: '🎉 5段階の分析が完了しました！実行戦略に基づいて、バイラルコンテンツの投稿準備が整いました。'
    }, { headers })

  } catch (error) {
    console.error('Step 5 execution strategy error:', error)
    
    return NextResponse.json(
      { 
        error: 'Step 5 実行戦略でエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function buildExecutionStrategyPrompt(config: any, sessionData: any) {
  const step3Concepts = sessionData.step3?.concepts || []
  const step4Contents = sessionData.step4?.complete_contents || []
  const currentDateJST = new Date()
  const formattedDate = currentDateJST.toLocaleDateString('ja-JP', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    timeZone: 'Asia/Tokyo'
  })
  
  const expertise = config.expertise
  const platform = config.platform
  const style = config.style

  // 今後48時間の最適投稿時間を計算
  const optimalTimes = []
  for (let i = 0; i < 3; i++) {
    const date = new Date(currentDateJST)
    date.setHours(date.getHours() + (i * 16) + 4) // 4時間後、20時間後、36時間後
    optimalTimes.push(date.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }))
  }

  return `**Chain of Thought: バイラル実行戦略の策定**

設定情報:
- 専門分野: ${expertise}
- プラットフォーム: ${platform}
- スタイル: ${style}
- 現在時刻: ${currentDateJST.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}

**生成されたコンテンツの概要:**
${step4Contents.map((content: any, index: number) => `
コンテンツ${index + 1}: ${content.topic}
- 単発投稿: ${content.content_variations?.single_post?.character_count}文字
- スレッド: ${content.content_variations?.thread_posts?.length}投稿
- 最適時間: ${content.posting_optimization?.best_time}
- ビジュアル: ${content.visual_guide?.image_type}
`).join('\n')}

**予想される投稿時間候補:**
${optimalTimes.map((time, index) => `${index + 1}. ${time}`).join('\n')}

**Chain of Thought 戦略策定手順:**

🚀 **思考ステップ1: 即時行動計画**
投稿前2-4時間で実施すべきタスク：
- プロフィール最適化（${expertise}の専門性を強調）
- ビジュアル素材の準備
- モニタリングツールの設定
- エンゲージメント初動メンバーへの連絡

📅 **思考ステップ2: 投稿スケジュール**
${platform}の特性と${expertise}コミュニティの活動時間を考慮：
- 各コンテンツの最適投稿時間
- 投稿間隔（最低4時間）
- 曜日と時間帯の戦略的選択

📊 **思考ステップ3: KPIとモニタリング**
${expertise}分野での成功指標：
- 初動1時間のエンゲージメント率
- 6時間後のリーチ拡大
- 24時間後のフォロワー増加
- 48時間後の総合評価

🔄 **思考ステップ4: フォローアップ戦略**
勢いを維持し、長期的価値を創出：
- ポジティブな反応への対応
- 二次コンテンツの準備
- 学習の抽出と次回への活用

**重要な考慮事項:**
- ${expertise}コミュニティの特性と行動パターン
- ${platform}のアルゴリズム最新動向（2025年6月）
- ${style}を維持しながらのエンゲージメント最大化
- リスク管理と迅速な対応体制

各コンテンツを最大限に活用するための包括的な実行戦略を策定してください。`
}