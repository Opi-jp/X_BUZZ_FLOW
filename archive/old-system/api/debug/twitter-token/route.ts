import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 直接DBからトークンを確認（デバッグ用）
export async function GET() {
  try {
    const user = await prisma.user.findFirst({
      orderBy: { updatedAt: 'desc' }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'No user found' }, { status: 404 })
    }
    
    // トークンの詳細分析
    const token = user.accessToken
    const analysis = {
      exists: !!token,
      length: token?.length || 0,
      startsWithBearer: token?.startsWith('Bearer '),
      containsDash: token?.includes('-'),
      containsPercent: token?.includes('%'),
      // OAuth 2.0 Bearer tokenは通常base64エンコードされた長い文字列
      looksLikeOAuth2: token && token.length > 50 && !token.includes('-'),
      // OAuth 1.0aは通常ダッシュを含む
      looksLikeOAuth1: token && token.includes('-'),
      firstChars: token?.substring(0, 20) + '...',
      lastChars: '...' + token?.substring(token.length - 20),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
    
    // Twitter API v2 のBearer tokenの形式をチェック
    const recommendations = []
    if (!token) {
      recommendations.push('トークンが保存されていません')
    } else if (token.startsWith('Bearer ')) {
      recommendations.push('Bearer プレフィックスが含まれています。これを除去する必要があります。')
    } else if (analysis.looksLikeOAuth1) {
      recommendations.push('OAuth 1.0a形式のトークンのようです。OAuth 2.0で再認証が必要です。')
    } else if (!analysis.looksLikeOAuth2) {
      recommendations.push('トークンの形式が正しくない可能性があります。')
    }
    
    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        twitterId: user.twitterId,
      },
      tokenAnalysis: analysis,
      recommendations,
      nextSteps: recommendations.length > 0 
        ? '再ログインして新しいOAuth 2.0トークンを取得してください'
        : 'トークンは正しい形式のようです'
    })
  } catch (error) {
    console.error('Error analyzing token:', error)
    return NextResponse.json({ error: 'Failed to analyze token' }, { status: 500 })
  }
}