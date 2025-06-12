import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      theme = 'AIと働き方',
      platform = 'X',
      tone = '解説とエンタメ'
    } = body
    
    console.log('=== Phase 1: ニッチとスタイル情報の収集 ===')
    console.log('Setup Config:', { theme, platform, tone })
    
    // セッションIDを生成
    const sessionId = uuidv4()
    
    // 設定をデータベースに保存
    try {
      await prisma.gptAnalysis.create({
        data: {
          id: sessionId,
          status: 'phase1_completed',
          response: {
            phase1: {
              config: { theme, platform, tone },
              completedAt: new Date().toISOString()
            }
          },
          metadata: {
            currentPhase: 1,
            config: { theme, platform, tone },
            createdAt: new Date().toISOString()
          },
          tokens: 0,
          duration: 0
        }
      })
    } catch (dbError) {
      console.warn('Database save failed, proceeding with in-memory session:', dbError.message)
    }
    
    return NextResponse.json({
      success: true,
      sessionId,
      phase: 1,
      title: 'ニッチとスタイル情報の収集',
      config: {
        theme,
        platform, 
        tone
      },
      message: `設定完了: ${theme} × ${platform} × ${tone}`,
      nextPhase: {
        phase: 2,
        url: `/api/viral/phases/getTrendingTopics`,
        title: 'トレンドトピック抽出',
        description: '48時間以内のバズ機会を3-5件特定します'
      }
    })
    
  } catch (error) {
    console.error('Phase 1 Setup error:', error)
    
    return NextResponse.json(
      { 
        error: 'Phase 1 設定でエラーが発生しました',
        details: error.message 
      },
      { status: 500 }
    )
  }
}