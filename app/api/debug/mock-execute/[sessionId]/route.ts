import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Phase1Strategy } from '@/lib/orchestrated-cot-strategy'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    
    // セッションとフェーズ取得
    const session = await prisma.cotSession.findUnique({
      where: { id: sessionId },
      include: {
        phases: true
      }
    })
    
    if (!session) {
      return NextResponse.json(
        { error: 'セッションが見つかりません' },
        { status: 404 }
      )
    }
    
    const phase = await prisma.cotPhase.findUnique({
      where: {
        sessionId_phaseNumber: {
          sessionId,
          phaseNumber: 1
        }
      }
    })
    
    if (!phase?.thinkResult) {
      return NextResponse.json(
        { error: 'THINK結果が見つかりません' },
        { status: 400 }
      )
    }
    
    // buildSafeContextを再現
    const baseContext = {
      expertise: session.expertise || 'AIと働き方',
      style: session.style || '洞察的',
      platform: session.platform || 'Twitter',
    }
    
    const userConfig = {
      expertise: baseContext.expertise,
      style: baseContext.style,
      platform: baseContext.platform
    }
    
    const context = {
      ...baseContext,
      userConfig
    }
    
    console.log('[MOCK EXECUTE] Context:', {
      hasContext: !!context,
      contextKeys: Object.keys(context),
      expertise: context.expertise,
      userConfig: context.userConfig
    })
    
    // モックexecuteハンドラーを実行
    let receivedContext = null
    const mockHandler = async (thinkResult: any, ctx?: any) => {
      receivedContext = ctx
      
      // contextがundefinedかチェック
      if (!ctx) {
        console.error('[MOCK EXECUTE] Context is undefined!')
        throw new Error('Context is undefined in execute handler')
      }
      
      console.log('[MOCK EXECUTE] Handler received context:', {
        hasContext: !!ctx,
        contextKeys: ctx ? Object.keys(ctx) : 'undefined',
        expertise: ctx?.expertise,
        userConfig: ctx?.userConfig
      })
      
      return {
        searchResults: [
          {
            topic: "モックトピック",
            summary: "モック結果",
            url: "https://example.com",
            source: "mock"
          }
        ]
      }
    }
    
    // ハンドラーを実行
    try {
      const result = await mockHandler(phase.thinkResult, context)
      
      // 結果をDBに保存
      await prisma.cotPhase.update({
        where: {
          sessionId_phaseNumber: {
            sessionId,
            phaseNumber: 1
          }
        },
        data: {
          executeResult: result as any,
          executeDuration: 1000,
          executeAt: new Date(),
          status: 'EXECUTING'
        }
      })
      
      // セッション更新
      await prisma.cotSession.update({
        where: { id: sessionId },
        data: {
          currentStep: 'INTEGRATE',
          status: 'INTEGRATING'
        }
      })
      
      return NextResponse.json({
        success: true,
        message: 'モックEXECUTE完了',
        executeResult: result,
        receivedExpertise: receivedContext?.expertise,
        receivedUserConfig: receivedContext?.userConfig,
        receivedContextKeys: receivedContext ? Object.keys(receivedContext) : []
      })
    } catch (error) {
      console.error('[MOCK EXECUTE] Error:', error)
      return NextResponse.json({
        error: error instanceof Error ? error.message : 'Unknown error',
        receivedExpertise: receivedContext?.expertise,
        receivedUserConfig: receivedContext?.userConfig
      }, { status: 500 })
    }
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}