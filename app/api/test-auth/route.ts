import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // セッション確認
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({
        authenticated: false,
        message: 'No session found'
      })
    }
    
    // ユーザー情報を取得
    const user = await prisma.user.findFirst({
      where: session.user.id 
        ? { id: session.user.id }
        : session.user.email 
        ? { email: session.user.email }
        : undefined,
    })
    
    return NextResponse.json({
      authenticated: true,
      session: {
        user: session.user,
        expires: session.expires
      },
      dbUser: user ? {
        id: user.id,
        username: user.username,
        twitterId: user.twitterId,
        hasAccessToken: !!user.accessToken,
        createdAt: user.createdAt
      } : null
    })
  } catch (error) {
    console.error('Error in test-auth:', error)
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}