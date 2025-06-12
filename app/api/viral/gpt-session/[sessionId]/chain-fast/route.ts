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
    
    console.log('=== Chain Fast Mode: Optimized for Vercel ===')
    console.log('Session ID:', sessionId)
    console.log('Target: Complete in < 10 seconds')

    const overallStartTime = Date.now()

    // 単一のプロンプトで全フェーズを実行（JSON出力）
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `あなたは、新たなトレンドを特定し、流行の波がピークに達する前にその波に乗るコンテンツのコンセプトを作成するバズるコンテンツ戦略家です。

専門分野「${config.config.expertise}」で、${config.config.platform}向けのバズるコンテンツを高速生成してください。`
        },
        {
          role: 'user',
          content: `現在の${config.config.expertise}に関するトレンドから、48時間以内にバズる可能性が最も高い投稿を1つ生成してください。

以下のJSON形式で回答：
{
  "trend_topic": "特定したトレンドトピック",
  "viral_score": 0.8,
  "content": {
    "text": "${config.config.platform}用の完全な投稿テキスト（改行・絵文字含む）",
    "hashtags": ["#タグ1", "#タグ2", "#タグ3"],
    "optimal_timing": "最適投稿時間"
  },
  "strategy": {
    "hook": "注目を集めるポイント",
    "engagement_tip": "エンゲージメントを高めるコツ"
  }
}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
      max_tokens: 1000 // 高速化のため削減
    })

    const duration = Date.now() - overallStartTime
    console.log(`Fast mode completed in ${duration}ms`)

    const result = JSON.parse(response.choices[0].message.content || '{}')

    // データベースに保存（エラー時はスキップ）
    if (session) {
      try {
        await prisma.gptAnalysis.update({
          where: { id: sessionId },
          data: {
            response: {
              ...(session.response as any || {}),
              chainFast: result
            },
            tokens: (session.tokens || 0) + (response.usage?.total_tokens || 0),
            duration: (session.duration || 0) + duration,
            metadata: {
              ...(session.metadata as any || {}),
              currentStep: 'chain-fast-complete',
              chainFastCompletedAt: new Date().toISOString(),
              usedChainFast: true
            }
          }
        })
      } catch (dbError) {
        console.warn('Failed to save Chain Fast results:', dbError instanceof Error ? dbError.message : 'Unknown error')
      }
    }

    return NextResponse.json({
      success: true,
      sessionId,
      method: 'Chain Fast Mode (< 10s)',
      duration: `${duration}ms`,
      trend: result.trend_topic,
      viralScore: result.viral_score,
      readyToPost: {
        status: true,
        content: result.content?.text || '',
        platform: config.config.platform,
        timing: result.content?.optimal_timing || '2-4時間以内',
        hashtags: result.content?.hashtags || []
      },
      strategy: result.strategy,
      vercelCompatible: duration < 9000 // 9秒以内なら安全
    }, { headers })

  } catch (error) {
    console.error('Chain Fast error:', error)
    
    return NextResponse.json(
      { 
        error: 'Chain Fast 分析でエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}