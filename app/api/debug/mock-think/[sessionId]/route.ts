import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    
    // セッション確認
    const session = await prisma.cotSession.findUnique({
      where: { id: sessionId }
    })
    
    if (!session) {
      return NextResponse.json(
        { error: 'セッションが見つかりません' },
        { status: 404 }
      )
    }
    
    // モックTHINK結果を作成
    const mockThinkResult = {
      searchGoals: [
        {
          category: "A",
          queries: ["テストクエリ1", "テストクエリ2"]
        }
      ],
      expertise: session.expertise,
      platform: session.platform
    }
    
    // DBに保存
    await prisma.cotPhase.upsert({
      where: {
        sessionId_phaseNumber: {
          sessionId,
          phaseNumber: 1
        }
      },
      update: {
        thinkResult: mockThinkResult as any,
        thinkTokens: 100,
        thinkAt: new Date(),
        status: 'THINKING'
      },
      create: {
        sessionId,
        phaseNumber: 1,
        thinkResult: mockThinkResult as any,
        thinkTokens: 100,
        thinkAt: new Date(),
        status: 'THINKING'
      }
    })
    
    // セッション更新
    await prisma.cotSession.update({
      where: { id: sessionId },
      data: {
        currentStep: 'EXECUTE',
        status: 'EXECUTING'
      }
    })
    
    return NextResponse.json({
      success: true,
      message: 'モックTHINK完了',
      thinkResult: mockThinkResult
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}