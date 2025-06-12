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
    
    const headers = {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }

    // セッション情報を取得（エラー時はモックデータを使用）
    let session = null
    let config = {
      config: {
        expertise: 'AI × 働き方',
        platform: 'Twitter',
        style: '解説 × エンタメ',
        model: 'gpt-4o'
      }
    }
    
    try {
      session = await prisma.gptAnalysis.findUnique({
        where: { id: sessionId }
      })
      
      if (session) {
        config = session.metadata as any
      }
    } catch (dbError) {
      console.warn('Database connection error, using mock config:', dbError instanceof Error ? dbError.message : 'Unknown error')
    }
    
    console.log('=== Chain of Thought: Complete Viral Analysis Flow ===')
    console.log('Session ID:', sessionId)
    console.log('Config:', config.config)

    const startTime = Date.now()

    // 全機能を統合したFunction Definitions
    const functions = [
      {
        name: 'search_viral_trends',
        description: 'Web検索でバイラル機会を特定する',
        parameters: {
          type: 'object',
          properties: {
            search_queries: { 
              type: 'array', 
              items: { type: 'string' },
              description: '検索クエリ一覧'
            },
            discovered_opportunities: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  topic: { type: 'string' },
                  source_url: { type: 'string' },
                  viral_potential: { type: 'number' },
                  urgency: { type: 'string' },
                  insight: { type: 'string' }
                }
              }
            }
          },
          required: ['search_queries', 'discovered_opportunities']
        }
      },
      {
        name: 'analyze_viral_opportunities',
        description: '発見した機会を6軸で詳細分析する',
        parameters: {
          type: 'object',
          properties: {
            analyzed_opportunities: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  topic: { type: 'string' },
                  controversy_level: { type: 'number' },
                  emotion_intensity: { type: 'number' },
                  relatability_factor: { type: 'number' },
                  shareability: { type: 'number' },
                  timing_sensitivity: { type: 'number' },
                  platform_alignment: { type: 'number' },
                  viral_velocity: { type: 'string' },
                  content_angle: { type: 'string' },
                  target_emotion: { type: 'string' },
                  engagement_prediction: { type: 'number' }
                }
              }
            },
            best_opportunity: { type: 'string' },
            recommended_timeline: { type: 'string' }
          },
          required: ['analyzed_opportunities', 'best_opportunity', 'recommended_timeline']
        }
      },
      {
        name: 'create_content_concepts',
        description: '最適な機会から3つのコンテンツコンセプトを生成',
        parameters: {
          type: 'object',
          properties: {
            concepts: {
              type: 'array',
              maxItems: 3,
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  hook: { type: 'string' },
                  angle: { type: 'string' },
                  format: { type: 'string' },
                  content_outline: {
                    type: 'object',
                    properties: {
                      opening_hook: { type: 'string' },
                      key_points: { type: 'array', items: { type: 'string' } },
                      unexpected_insight: { type: 'string' },
                      cta: { type: 'string' }
                    }
                  },
                  timing: { type: 'string' },
                  hashtags: { type: 'array', items: { type: 'string' } },
                  confidence_score: { type: 'number' }
                }
              }
            },
            recommended_concept: { type: 'string' }
          },
          required: ['concepts', 'recommended_concept']
        }
      },
      {
        name: 'generate_complete_content',
        description: '選択されたコンセプトから投稿準備完了のコンテンツを生成',
        parameters: {
          type: 'object',
          properties: {
            complete_posts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  concept_title: { type: 'string' },
                  platform: { type: 'string' },
                  format: { type: 'string' },
                  content: { type: 'string' },
                  visual_description: { type: 'string' },
                  posting_notes: { type: 'string' },
                  optimal_timing: { type: 'string' },
                  hashtags: { type: 'array', items: { type: 'string' } }
                }
              }
            },
            execution_strategy: {
              type: 'object',
              properties: {
                immediate_actions: { type: 'array', items: { type: 'string' } },
                posting_timeline: { type: 'string' },
                optimization_tips: { type: 'array', items: { type: 'string' } },
                risk_mitigation: { type: 'array', items: { type: 'string' } }
              }
            }
          },
          required: ['complete_posts', 'execution_strategy']
        }
      }
    ]

    // Chain of Thought プロンプト構築
    const cotPrompt = buildIntegratedChainOfThoughtPrompt(config.config)

    // GPT-4o + Responses API with Chain of Thought
    const response = await openai.responses.create({
      model: 'gpt-4o',
      input: cotPrompt,
      tools: [
        { type: 'web_search' as any }
      ],
      instructions: `
あなたは、新たなトレンドを特定し、流行の波がピークに達する前にその波に乗るコンテンツのコンセプトを作成するバズるコンテンツ戦略家です。

以下のChain of Thought（思考の連鎖）に従って、段階的に分析と生成を実行してください：

**思考フェーズ1: トレンド発見**
- web_searchツールを使用してリアルタイムの情報を収集
- search_viral_trendsを呼び出してバイラル機会を特定

**思考フェーズ2: 機会分析** 
- 発見した機会を6軸で詳細分析
- analyze_viral_opportunitiesを呼び出して最適な機会を選択

**思考フェーズ3: コンセプト生成**
- 選択した機会から3つのコンセプトを設計
- create_content_conceptsを呼び出してコンセプトを構造化

**思考フェーズ4: 完全コンテンツ作成**
- 最高のコンセプトから投稿準備完了のコンテンツを生成
- generate_complete_contentを呼び出して実行戦略まで提供

各フェーズの結果を次のフェーズに活用し、一貫した思考の流れを維持してください。
      ` as any
    })

    const duration = Date.now() - startTime
    console.log('Chain of Thought API call duration:', duration, 'ms')

    // レスポンスの解析
    let chainResult = {
      phase1_trends: null,
      phase2_analysis: null,
      phase3_concepts: null,
      phase4_content: null,
      thinking_process: response.output_text || '',
      tool_calls: []
    }

    // Tool callsの処理（Web検索とFunction calls）
    if (response.tool_calls) {
      chainResult.tool_calls = response.tool_calls
      console.log('Tool calls executed:', response.tool_calls.length)
    }

    // 結果をデータベースに保存（エラー時はスキップ）
    if (session) {
      try {
        await prisma.gptAnalysis.update({
          where: { id: sessionId },
          data: {
            response: {
              ...(session.response as any || {}),
              chainOfThought: chainResult
            },
            tokens: (session.tokens || 0) + 2000, // 概算
            duration: (session.duration || 0) + duration,
            metadata: {
              ...(session.metadata as any || {}),
              currentStep: 'chain-complete',
              chainOfThoughtCompletedAt: new Date().toISOString(),
              usedChainOfThought: true,
              integratedFlow: true
            }
          }
        })
      } catch (dbError) {
        console.warn('Failed to save Chain of Thought results:', dbError instanceof Error ? dbError.message : 'Unknown error')
      }
    }

    // 最終コンテンツを下書きとして保存
    let draftsCreated = 0
    if (chainResult.phase4_content?.complete_posts) {
      const drafts = await Promise.all(
        chainResult.phase4_content.complete_posts.map(async (post: any, index: number) => {
          return await prisma.contentDraft.create({
            data: {
              analysisId: sessionId,
              conceptType: post.format || 'single',
              category: post.concept_title,
              title: post.concept_title,
              content: post.content,
              explanation: post.posting_notes || '',
              buzzFactors: [],
              targetAudience: '',
              estimatedEngagement: {},
              hashtags: post.hashtags || [],
              metadata: {
                conceptNumber: index + 1,
                platform: post.platform,
                format: post.format,
                visualDescription: post.visual_description,
                optimalTiming: post.optimal_timing,
                executionStrategy: chainResult.phase4_content.execution_strategy,
                chainOfThoughtGenerated: true
              }
            }
          })
        })
      )
      draftsCreated = drafts.length
    }

    return NextResponse.json({
      success: true,
      sessionId,
      method: 'Chain of Thought + Responses API + Function Calling',
      response: chainResult,
      draftsCreated,
      metrics: {
        duration,
        toolCallsExecuted: chainResult.tool_calls.length,
        phasesCompleted: 4,
        trendsDiscovered: chainResult.phase1_trends?.discovered_opportunities?.length || 0,
        conceptsGenerated: chainResult.phase3_concepts?.concepts?.length || 0,
        postsCreated: chainResult.phase4_content?.complete_posts?.length || 0
      },
      execution: {
        readyToPost: chainResult.phase4_content?.complete_posts?.length > 0,
        recommendedAction: chainResult.phase4_content?.execution_strategy?.immediate_actions?.[0] || '投稿準備を開始してください',
        timeline: chainResult.phase4_content?.execution_strategy?.posting_timeline || '2-4時間以内'
      }
    }, { headers })

  } catch (error) {
    console.error('Chain of Thought error:', error)
    
    return NextResponse.json(
      { 
        error: 'Chain of Thought 分析でエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function buildIntegratedChainOfThoughtPrompt(config: any) {
  const currentDateJST = new Date().toLocaleDateString('ja-JP', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    timeZone: 'Asia/Tokyo'
  })

  return `**統合Chain of Thought: バイラルコンテンツ完全自動生成**

現在時刻: ${currentDateJST}

**あなたの設定:**
- 専門分野: ${config.expertise}
- プラットフォーム: ${config.platform}
- スタイル: ${config.style}

**Chain of Thought 実行指示:**

この分析を通じて、以下の4つのフェーズを順次実行し、各フェーズの結果を次のフェーズに活用してください：

🔍 **フェーズ1: リアルタイムトレンド発見**
Web検索を実行して現在のバイラル機会を発見し、search_viral_trendsを呼び出してください。
検索対象:
- "${config.expertise} 最新ニュース ${currentDateJST}"
- "AI技術 論争 ${currentDateJST}"
- "働き方改革 話題 ${currentDateJST}"
- "テクノロジー トレンド ${currentDateJST}"

🧠 **フェーズ2: 6軸バイラル分析**
フェーズ1で発見した機会を詳細分析し、analyze_viral_opportunitiesを呼び出してください。
評価軸: 論争・感情・共感・共有・タイミング・プラットフォーム適合性

💡 **フェーズ3: 戦略的コンセプト設計**
フェーズ2の最高評価機会から3つのコンセプトを生成し、create_content_conceptsを呼び出してください。
要件: ${config.expertise}の専門性を活かした独自角度、${config.platform}最適化

✨ **フェーズ4: 投稿準備完了コンテンツ生成**
フェーズ3の最優秀コンセプトから実際の投稿コンテンツを作成し、generate_complete_contentを呼び出してください。
出力: コピー&ペースト可能な完成投稿、実行戦略、タイミング指示

**重要:** 各フェーズの結果は次のフェーズの入力として使用し、一貫した思考の流れを維持してください。最終的に48時間以内に実行可能な、バズる可能性が最も高い投稿を完成させてください。`
}