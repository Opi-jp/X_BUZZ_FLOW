import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DataStore } from '@/lib/data-store'

type RouteParams = {
  params: Promise<{
    id: string
  }>
}

// スマートな再開 - 最適なデータを自動選択
export async function POST(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    
    const session = await prisma.viralSession.findUnique({
      where: { id }
    })
    
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    const results: any = {
      sessionId: id,
      actions: []
    }

    // トピックがない場合
    if (!session.topics) {
      // 最新の同じテーマのトピックを取得
      const latestTopics = await DataStore.getLatestTopics(session.theme)
      
      if (latestTopics && latestTopics.createdAt > new Date(Date.now() - 24 * 60 * 60 * 1000)) {
        // 24時間以内なら再利用
        await prisma.viralSession.update({
          where: { id },
          data: {
            topics: latestTopics.topics,
            status: 'TOPICS_COLLECTED'
          }
        })
        
        results.actions.push({
          step: 'topics',
          action: 'reused',
          sourceSessionId: latestTopics.sessionId,
          age: Math.floor((Date.now() - latestTopics.createdAt.getTime()) / (1000 * 60 * 60)) + '時間前'
        })
      } else {
        // 新規取得が必要
        results.actions.push({
          step: 'topics',
          action: 'required',
          reason: latestTopics ? 'データが古い（24時間以上）' : '利用可能なデータなし'
        })
        
        return NextResponse.json(results)
      }
    }

    // コンセプトがない場合
    if (!session.concepts && session.topics) {
      // 同じトピックから生成されたコンセプトを探す
      const similarSessions = await prisma.viralSession.findMany({
        where: {
          theme: session.theme,
          concepts: { not: null },
          topics: { equals: session.topics }
        },
        orderBy: { createdAt: 'desc' },
        take: 1
      })
      
      if (similarSessions.length > 0) {
        // 再利用
        await prisma.viralSession.update({
          where: { id },
          data: {
            concepts: similarSessions[0].concepts,
            status: 'CONCEPTS_GENERATED'
          }
        })
        
        results.actions.push({
          step: 'concepts',
          action: 'reused',
          sourceSessionId: similarSessions[0].id
        })
      } else {
        // 類似テーマのコンセプトから一部を流用することも可能
        const latestConcepts = await DataStore.getLatestConcepts(session.theme, 5)
        
        if (latestConcepts) {
          results.actions.push({
            step: 'concepts',
            action: 'available',
            suggestion: '類似コンセプトが利用可能です（要調整）',
            sourceSessionId: latestConcepts.sessionId
          })
        } else {
          results.actions.push({
            step: 'concepts',
            action: 'required',
            reason: '新規生成が必要'
          })
        }
      }
    }

    // 下書きがない場合
    if (session.concepts && session.status !== 'CONTENTS_GENERATED') {
      const draftsCount = await prisma.viralDraftV2.count({
        where: { sessionId: id }
      })
      
      if (draftsCount === 0) {
        results.actions.push({
          step: 'contents',
          action: 'required',
          conceptsCount: (session.concepts as any[]).length
        })
      }
    }

    // 実行済みのアクションを適用
    const updatedSession = await prisma.viralSession.findUnique({
      where: { id },
      include: {
        _count: { select: { drafts: true } }
      }
    })

    results.currentStatus = updatedSession?.status
    results.summary = {
      hasTopics: !!updatedSession?.topics,
      hasConcepts: !!updatedSession?.concepts,
      draftsCount: updatedSession?._count.drafts || 0
    }

    return NextResponse.json(results)

  } catch (error) {
    console.error('[Smart Resume] Error:', error)
    return NextResponse.json(
      { error: 'Failed to smart resume' },
      { status: 500 }
    )
  }
}