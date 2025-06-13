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
    const step3Data = (session.response as any)?.step3

    if (!step3Data) {
      return NextResponse.json(
        { error: 'Step 3のデータが見つかりません。まずStep 3を実行してください。' },
        { status: 400, headers }
      )
    }

    console.log('=== Step 4: Complete Content Generation with Function Calling ===')
    console.log('Session ID:', sessionId)
    console.log('Available concepts:', step3Data.concepts?.length || 0)

    const startTime = Date.now()

    // Function Definition for complete content generation
    const generateCompleteContentFunction = {
      name: 'generate_complete_content',
      description: '各コンセプトの完全な投稿可能コンテンツを生成',
      parameters: {
        type: 'object',
        properties: {
          complete_contents: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                concept_index: { type: 'number', description: 'コンセプトのインデックス（0-2）' },
                topic: { type: 'string', description: 'トピック名' },
                content_variations: {
                  type: 'object',
                  properties: {
                    single_post: {
                      type: 'object',
                      properties: {
                        text: { type: 'string', description: '完全な投稿テキスト（140文字以内）' },
                        hashtags: { type: 'array', items: { type: 'string' }, description: 'ハッシュタグ' },
                        character_count: { type: 'number', description: '文字数' }
                      },
                      required: ['text', 'hashtags', 'character_count']
                    },
                    thread_posts: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          post_number: { type: 'number', description: '投稿番号（1-5）' },
                          text: { type: 'string', description: '投稿テキスト' },
                          character_count: { type: 'number', description: '文字数' }
                        },
                        required: ['post_number', 'text', 'character_count']
                      }
                    }
                  },
                  required: ['single_post', 'thread_posts']
                },
                visual_guide: {
                  type: 'object',
                  properties: {
                    description: { type: 'string', description: 'ビジュアル要素の説明' },
                    image_type: { type: 'string', description: '画像タイプ（infographic/photo/illustration）' },
                    key_elements: { type: 'array', items: { type: 'string' }, description: '重要な視覚要素' }
                  },
                  required: ['description', 'image_type', 'key_elements']
                },
                posting_optimization: {
                  type: 'object',
                  properties: {
                    best_time: { type: 'string', description: '最適な投稿時間（例: 18:00-20:00）' },
                    engagement_hooks: { type: 'array', items: { type: 'string' }, description: 'エンゲージメントを高める要素' },
                    first_comment: { type: 'string', description: '最初のコメント案' }
                  },
                  required: ['best_time', 'engagement_hooks', 'first_comment']
                }
              },
              required: ['concept_index', 'topic', 'content_variations', 'visual_guide', 'posting_optimization']
            }
          },
          platform_specific_tips: {
            type: 'object',
            properties: {
              twitter_algorithm: { type: 'array', items: { type: 'string' }, description: 'Twitterアルゴリズム最適化のヒント' },
              trending_elements: { type: 'array', items: { type: 'string' }, description: 'トレンド要素の活用方法' },
              engagement_strategy: { type: 'string', description: 'エンゲージメント戦略' }
            },
            required: ['twitter_algorithm', 'trending_elements', 'engagement_strategy']
          },
          content_summary: {
            type: 'object',
            properties: {
              total_posts_ready: { type: 'number', description: '投稿準備完了数' },
              estimated_reach: { type: 'string', description: '予想リーチ' },
              confidence_score: { type: 'number', description: '成功確信度（0-1）' }
            },
            required: ['total_posts_ready', 'estimated_reach', 'confidence_score']
          }
        },
        required: ['complete_contents', 'platform_specific_tips', 'content_summary']
      }
    }

    // Chain of Thought プロンプト構築
    const cotPrompt = buildContentGenerationPrompt(config.config, step3Data)

    // GPT-4o Function Calling実行
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `あなたは、新たなトレンドを特定し、流行の波がピークに達する前にその波に乗るコンテンツのコンセプトを作成するバズるコンテンツ戦略家です。

## フェーズ3B: コンテンツ作成の完了

ユーザーが「続行」と入力した後、各コンセプトの完全な投稿可能なコンテンツを作成します。

完全なコンテンツ配信
3 つの概念ごとに以下を提供します。

[プラットフォームに表示されるとおりに、コピー＆ペースト可能な完全なコンテンツを作成してください]
[すべてのテキスト、書式、改行、絵文字、ハッシュタグを含める]
[完成させてすぐに投稿できるように準備する]

必ずgenerate_complete_content関数を呼び出して、構造化されたコンテンツを返してください。`
        },
        {
          role: 'user',
          content: cotPrompt
        }
      ],
      functions: [generateCompleteContentFunction],
      function_call: { name: 'generate_complete_content' },
      temperature: 0.8,
      max_tokens: 4000
    })

    const duration = Date.now() - startTime
    console.log('Step 4 duration:', duration, 'ms')

    // Function Callingの結果を取得
    const functionCall = response.choices[0]?.message?.function_call
    let contentResult = null

    if (functionCall && functionCall.name === 'generate_complete_content') {
      try {
        contentResult = JSON.parse(functionCall.arguments)
        console.log('Generated complete contents:', contentResult.complete_contents?.length || 0)
      } catch (e) {
        console.error('Failed to parse content generation result:', e)
        return NextResponse.json(
          { error: 'コンテンツ生成結果の解析に失敗しました' },
          { status: 500, headers }
        )
      }
    } else {
      return NextResponse.json(
        { error: 'コンテンツ生成Function Callingが実行されませんでした' },
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
          step4: contentResult
        },
        tokens: (session.tokens || 0) + (response.usage?.total_tokens || 0),
        duration: (session.duration || 0) + duration,
        metadata: {
          ...currentMetadata,
          currentStep: 4,
          step4CompletedAt: new Date().toISOString(),
          usedFunctionCalling: true
        }
      }
    })

    // 既存のContentDraftを更新（もし存在すれば）
    const drafts = await prisma.contentDraft.findMany({
      where: { analysisId: sessionId }
    })

    if (drafts.length > 0 && contentResult.complete_contents) {
      await Promise.all(
        contentResult.complete_contents.map(async (content: any) => {
          const draft = drafts[content.concept_index]
          if (draft) {
            await prisma.contentDraft.update({
              where: { id: draft.id },
              data: {
                content: content.content_variations.single_post.text,
                editedContent: content.content_variations.single_post.text,
                hashtags: content.content_variations.single_post.hashtags,
                metadata: {
                  ...(draft.metadata as any || {}),
                  step4_content: content,
                  visual_guide: content.visual_guide,
                  posting_optimization: content.posting_optimization
                }
              }
            })
          }
        })
      )
    }

    return NextResponse.json({
      success: true,
      sessionId,
      step: 4,
      method: 'Chain of Thought + Function Calling',
      response: contentResult,
      metrics: {
        duration,
        tokensUsed: response.usage?.total_tokens || 0,
        contentsGenerated: contentResult.complete_contents?.length || 0
      },
      nextStep: {
        step: 5,
        url: `/api/viral/gpt-session/${sessionId}/step5`,
        description: '実行戦略・KPI設定',
        message: `${contentResult.complete_contents?.length || 0}個の完全なコンテンツを生成しました。実行戦略の策定に進みます。`
      }
    }, { headers })

  } catch (error) {
    console.error('Step 4 content generation error:', error)
    
    return NextResponse.json(
      { 
        error: 'Step 4 コンテンツ生成でエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function buildContentGenerationPrompt(config: any, step3Data: any) {
  const concepts = step3Data.concepts || []
  const currentDateJST = new Date().toLocaleDateString('ja-JP', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    timeZone: 'Asia/Tokyo'
  })
  
  const expertise = config?.expertise || 'AI × 働き方'
  const platform = config?.platform || 'Twitter'
  const style = config?.style || '洞察的'

  return `**Chain of Thought: 完全なバイラルコンテンツ生成**

設定情報:
- 専門分野: ${expertise}
- プラットフォーム: ${platform}
- スタイル: ${style}
- 現在時刻: ${currentDateJST}

**Step 3で生成されたコンセプト:**
${concepts.map((concept: any, index: number) => `
${index + 1}. ${concept.topic}
   - タイトル: ${concept.title}
   - フック: ${concept.hook}
   - アングル: ${concept.angle}
   - ターゲット: ${concept.target_audience}
   - タイミング: ${concept.timing}
   - 信頼スコア: ${concept.confidence_score}
`).join('\n')}

**Chain of Thought 実装手順:**

🎯 **思考ステップ1: コンテンツ変換**
各コンセプトを${platform}の制約に合わせて完全なコンテンツに変換：
- 単発投稿版（140文字以内）
- スレッド版（2-5投稿）

📱 **思考ステップ2: プラットフォーム最適化**
${platform}のアルゴリズムとユーザー行動に最適化：
- 最初の20文字で注目を集める
- 適切な改行と空白の使用
- エンゲージメントを促す要素

🎨 **思考ステップ3: ビジュアル設計**
各コンテンツに最適なビジュアル要素：
- 画像タイプの選択
- 重要な視覚要素の特定
- ${expertise}の専門性を視覚化

⏰ **思考ステップ4: 投稿最適化**
最大のインパクトを得るための詳細：
- 最適な投稿時間帯
- 初回コメントの準備
- エンゲージメントフック

**重要な制約:**
- 日本語での140文字制限を厳守
- ${expertise}の専門性を明確に示す
- ${style}のトーンを一貫して維持
- 即座にコピー&ペースト可能な形式

各コンセプトについて、完全に仕上がった投稿可能なコンテンツを生成してください。`
}