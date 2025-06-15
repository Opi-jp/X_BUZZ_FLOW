import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    // 環境変数のチェック
    const envCheck = {
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      PERPLEXITY_API_KEY: !!process.env.PERPLEXITY_API_KEY,
      GOOGLE_API_KEY: !!process.env.GOOGLE_API_KEY,
      GOOGLE_SEARCH_ENGINE_ID: !!process.env.GOOGLE_SEARCH_ENGINE_ID,
      DATABASE_URL: !!process.env.DATABASE_URL,
    }
    
    // データベース接続テスト
    let dbStatus = 'NOT_TESTED'
    let recentSessions = []
    
    try {
      // 最新のCoTセッションを取得
      recentSessions = await prisma.cotSession.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          currentPhase: true,
          currentStep: true,
          retryCount: true,
          lastError: true,
          createdAt: true,
          updatedAt: true,
        }
      })
      dbStatus = 'CONNECTED'
    } catch (dbError) {
      dbStatus = 'ERROR: ' + (dbError instanceof Error ? dbError.message : 'Unknown')
    }
    
    // セッションデータの統計
    const sessionStats = {
      total: recentSessions.length,
      completed: recentSessions.filter(s => s.status === 'COMPLETED').length,
      failed: recentSessions.filter(s => s.status === 'FAILED').length,
      pending: recentSessions.filter(s => s.status === 'PENDING').length,
      processing: recentSessions.filter(s => 
        ['THINKING', 'EXECUTING', 'INTEGRATING'].includes(s.status)
      ).length
    }
    
    return NextResponse.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      auth: {
        hasSession: !!session,
        userId: session?.user?.id || null,
        username: session?.user?.username || null
      },
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: !!process.env.VERCEL,
        checks: envCheck
      },
      database: {
        status: dbStatus,
        sessionStats,
        recentSessions: recentSessions.map(s => ({
          ...s,
          timeSinceUpdate: Date.now() - new Date(s.updatedAt).getTime()
        }))
      },
      apis: {
        openai: envCheck.OPENAI_API_KEY ? 'CONFIGURED' : 'MISSING',
        perplexity: envCheck.PERPLEXITY_API_KEY ? 'CONFIGURED' : 'MISSING',
        google: envCheck.GOOGLE_API_KEY && envCheck.GOOGLE_SEARCH_ENGINE_ID ? 'CONFIGURED' : 'MISSING'
      }
    })
  } catch (error) {
    return NextResponse.json({
      status: 'ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}