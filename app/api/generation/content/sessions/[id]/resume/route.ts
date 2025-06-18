import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type RouteParams = {
  params: Promise<{
    id: string
  }>
}

// セッションの現在の状態を確認し、次に実行すべきステップを提案
export async function GET(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    
    const session = await prisma.viralSession.findUnique({
      where: { id },
      include: {
        _count: {
          select: { drafts: true }
        }
      }
    })
    
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // 各フェーズの完了状態をチェック
    const phases = {
      topics: {
        completed: !!session.topics,
        data: session.topics,
        nextAction: !session.topics ? 'collect-topics' : null
      },
      concepts: {
        completed: !!session.concepts,
        data: session.concepts,
        count: session.concepts ? (session.concepts as any[]).length : 0,
        nextAction: session.topics && !session.concepts ? 'generate-concepts' : null
      },
      contents: {
        completed: session.status === 'CONTENTS_GENERATED' || session.status === 'COMPLETED',
        draftsCount: session._count.drafts,
        nextAction: session.concepts && session._count.drafts === 0 ? 'generate-contents' : null
      }
    }

    // 次に実行すべきアクション
    let nextStep = null
    let canResume = true
    let message = ''

    if (!phases.topics.completed) {
      nextStep = 'collect-topics'
      message = 'トピックがまだ収集されていません'
    } else if (!phases.concepts.completed) {
      nextStep = 'generate-concepts'
      message = 'コンセプトがまだ生成されていません'
    } else if (!phases.contents.completed) {
      nextStep = 'generate-contents'
      message = 'コンテンツがまだ生成されていません'
    } else {
      canResume = false
      message = 'すべてのフェーズが完了しています'
    }

    return NextResponse.json({
      session: {
        id: session.id,
        theme: session.theme,
        status: session.status,
        createdAt: session.createdAt
      },
      phases,
      nextStep,
      canResume,
      message,
      recommendations: getRecommendations(session, phases)
    })

  } catch (error) {
    console.error('[Resume Check] Error:', error)
    return NextResponse.json(
      { error: 'Failed to check session status' },
      { status: 500 }
    )
  }
}

// セッションを再開（中断したところから再開）
export async function POST(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    const { 
      reuseTopics = true, 
      reuseConcepts = true,
      forceStep = null 
    } = await request.json()
    
    const session = await prisma.viralSession.findUnique({
      where: { id }
    })
    
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // 強制的に特定のステップから開始
    if (forceStep) {
      return await executeStep(session, forceStep, { reuseTopics, reuseConcepts })
    }

    // 現在の状態から次のステップを決定
    if (!session.topics) {
      return await executeStep(session, 'topics', { reuseTopics })
    }
    
    if (!session.concepts) {
      return await executeStep(session, 'concepts', { reuseConcepts })
    }
    
    const draftsCount = await prisma.viralDraftV2.count({
      where: { sessionId: id }
    })
    
    if (draftsCount === 0) {
      return await executeStep(session, 'contents', {})
    }

    return NextResponse.json({
      success: true,
      message: 'Session already completed',
      session
    })

  } catch (error) {
    console.error('[Resume Session] Error:', error)
    return NextResponse.json(
      { error: 'Failed to resume session' },
      { status: 500 }
    )
  }
}

// 特定のステップを実行
async function executeStep(session: any, step: string, options: any) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  
  switch (step) {
    case 'topics':
      // 再利用可能なトピックを探す
      if (options.reuseTopics) {
        const recentSession = await prisma.viralSession.findFirst({
          where: {
            theme: session.theme,
            topics: { not: null },
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24時間以内
            }
          },
          orderBy: { createdAt: 'desc' }
        })
        
        if (recentSession) {
          await prisma.viralSession.update({
            where: { id: session.id },
            data: {
              topics: recentSession.topics,
              status: 'TOPICS_COLLECTED'
            }
          })
          
          return NextResponse.json({
            success: true,
            step: 'topics',
            reused: true,
            sourceSessionId: recentSession.id,
            nextStep: 'concepts'
          })
        }
      }
      
      // 新規取得が必要
      return NextResponse.json({
        success: false,
        step: 'topics',
        action: 'manual',
        endpoint: `/api/viral/v2/sessions/${session.id}/collect-topics`,
        message: '新しいトピックの収集が必要です'
      })
    
    case 'concepts':
      if (!session.topics) {
        return NextResponse.json({
          error: 'Topics must be collected first'
        }, { status: 400 })
      }
      
      // 再利用可能なコンセプトを探す
      if (options.reuseConcepts) {
        const similarSession = await prisma.viralSession.findFirst({
          where: {
            theme: session.theme,
            concepts: { not: null },
            topics: { equals: session.topics } // 同じトピックから生成されたもの
          },
          orderBy: { createdAt: 'desc' }
        })
        
        if (similarSession) {
          await prisma.viralSession.update({
            where: { id: session.id },
            data: {
              concepts: similarSession.concepts,
              status: 'CONCEPTS_GENERATED'
            }
          })
          
          return NextResponse.json({
            success: true,
            step: 'concepts',
            reused: true,
            sourceSessionId: similarSession.id,
            conceptsCount: (similarSession.concepts as any[]).length,
            nextStep: 'contents'
          })
        }
      }
      
      // 新規生成が必要
      return NextResponse.json({
        success: false,
        step: 'concepts',
        action: 'manual',
        endpoint: `/api/viral/v2/sessions/${session.id}/generate-concepts`,
        message: '新しいコンセプトの生成が必要です'
      })
    
    case 'contents':
      if (!session.concepts) {
        return NextResponse.json({
          error: 'Concepts must be generated first'
        }, { status: 400 })
      }
      
      return NextResponse.json({
        success: false,
        step: 'contents',
        action: 'manual',
        endpoint: `/api/viral/v2/sessions/${session.id}/generate-character-contents`,
        message: 'キャラクターコンテンツの生成が必要です',
        data: {
          characterId: 'cardi-dare',
          voiceStyleMode: 'normal'
        }
      })
    
    default:
      return NextResponse.json({
        error: 'Invalid step'
      }, { status: 400 })
  }
}

// 推奨事項を生成
function getRecommendations(session: any, phases: any): string[] {
  const recommendations = []
  
  // トピックの鮮度をチェック
  if (phases.topics.completed) {
    const topicsAge = Date.now() - new Date(session.createdAt).getTime()
    const hoursAgo = Math.floor(topicsAge / (1000 * 60 * 60))
    
    if (hoursAgo > 24) {
      recommendations.push(`トピックが${hoursAgo}時間前のものです。新しいトピックの取得を検討してください`)
    }
  }
  
  // コンセプトの数をチェック
  if (phases.concepts.completed && phases.concepts.count < 5) {
    recommendations.push(`コンセプトが${phases.concepts.count}個しかありません。追加生成を検討してください`)
  }
  
  // 下書きの数をチェック
  if (phases.contents.completed && phases.contents.draftsCount === 0) {
    recommendations.push('下書きが0件です。コンテンツ生成を実行してください')
  }
  
  return recommendations
}