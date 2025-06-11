import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // データベース接続テスト
    const userCount = await prisma.user.count()
    const sessionCount = await prisma.session.count()
    
    // 最初のユーザー情報（トークンは隠す）
    const firstUser = await prisma.user.findFirst({
      select: {
        id: true,
        username: true,
        twitterId: true,
        createdAt: true,
      }
    })
    
    return NextResponse.json({
      success: true,
      database: {
        connected: true,
        userCount,
        sessionCount,
        firstUser,
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasDbUrl: !!process.env.DATABASE_URL,
        dbUrlPrefix: process.env.DATABASE_URL?.substring(0, 30) + '...',
      }
    })
  } catch (error) {
    console.error('Database test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasDbUrl: !!process.env.DATABASE_URL,
      }
    }, { status: 500 })
  }
}