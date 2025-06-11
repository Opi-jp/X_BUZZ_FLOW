import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const user = await prisma.user.findFirst({
      where: { 
        id: (session.user as any).id 
      }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // トークンの詳細情報（センシティブな情報は隠す）
    const tokenInfo = {
      hasAccessToken: !!user.accessToken,
      tokenLength: user.accessToken?.length || 0,
      tokenPrefix: user.accessToken?.substring(0, 10) + '...',
      tokenPattern: detectTokenPattern(user.accessToken),
      hasRefreshToken: !!user.refreshToken,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      username: user.username,
      twitterId: user.twitterId,
    }
    
    return NextResponse.json({
      success: true,
      tokenInfo,
      suggestion: tokenInfo.tokenPattern === 'oauth1' 
        ? 'OAuth 1.0aのトークンです。OAuth 2.0で再認証が必要です。'
        : tokenInfo.tokenPattern === 'invalid'
        ? 'トークンの形式が無効です。再認証が必要です。'
        : 'OAuth 2.0のトークンです。'
    })
  } catch (error) {
    console.error('Error getting token info:', error)
    return NextResponse.json({ error: 'Failed to get token info' }, { status: 500 })
  }
}

function detectTokenPattern(token: string | null): string {
  if (!token) return 'none'
  
  // OAuth 2.0のベアラートークンは通常長い文字列
  if (token.length > 50 && !token.includes('-')) {
    return 'oauth2'
  }
  
  // OAuth 1.0aのトークンは通常ハイフンを含む
  if (token.includes('-')) {
    return 'oauth1'
  }
  
  return 'invalid'
}