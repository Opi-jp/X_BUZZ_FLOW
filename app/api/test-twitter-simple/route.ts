import { NextResponse } from 'next/server'
import { TwitterApi } from 'twitter-api-v2'
import { prisma } from '@/lib/prisma'

// 最もシンプルなTwitter API テスト
export async function POST() {
  try {
    // 最新のユーザーを取得
    const user = await prisma.user.findFirst({
      orderBy: { updatedAt: 'desc' }
    })
    
    if (!user?.accessToken) {
      return NextResponse.json({ error: 'No user with token found' }, { status: 404 })
    }
    
    // 複数の方法でクライアントを作成してテスト
    const results = []
    
    // 方法1: 生のトークン
    try {
      const client1 = new TwitterApi(user.accessToken)
      const me1 = await client1.v2.me()
      results.push({
        method: 'Raw token',
        success: true,
        user: me1.data
      })
    } catch (e: any) {
      results.push({
        method: 'Raw token',
        success: false,
        error: e.message,
        code: e.code
      })
    }
    
    // 方法2: Bearer プレフィックスを除去
    try {
      const token = user.accessToken.replace('Bearer ', '')
      const client2 = new TwitterApi(token)
      const me2 = await client2.v2.me()
      results.push({
        method: 'Without Bearer prefix',
        success: true,
        user: me2.data
      })
    } catch (e: any) {
      results.push({
        method: 'Without Bearer prefix',
        success: false,
        error: e.message,
        code: e.code
      })
    }
    
    // 方法3: readWrite クライアント
    try {
      const client3 = new TwitterApi(user.accessToken).readWrite
      const me3 = await client3.v2.me()
      results.push({
        method: 'readWrite client',
        success: true,
        user: me3.data
      })
    } catch (e: any) {
      results.push({
        method: 'readWrite client',
        success: false,
        error: e.message,
        code: e.code
      })
    }
    
    return NextResponse.json({
      tokenInfo: {
        length: user.accessToken.length,
        startsWithBearer: user.accessToken.startsWith('Bearer '),
        preview: user.accessToken.substring(0, 30) + '...'
      },
      results,
      recommendation: results.some(r => r.success) 
        ? '成功した方法でツイート投稿を試してください'
        : '再ログインが必要です'
    })
  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json({ 
      error: 'Test failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}