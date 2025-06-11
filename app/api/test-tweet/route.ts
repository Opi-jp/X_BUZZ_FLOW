import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { getTwitterClient } from '@/lib/twitter'

export async function POST(request: NextRequest) {
  try {
    // セッション確認
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Twitter認証が必要です' },
        { status: 401 }
      )
    }

    // ユーザー情報を取得
    const user = await prisma.user.findFirst({
      where: session.user.id 
        ? { id: session.user.id }
        : undefined,
    })
    
    if (!user?.accessToken) {
      return NextResponse.json(
        { error: 'アクセストークンが見つかりません' },
        { status: 401 }
      )
    }

    // テストツイート
    const testContent = 'テスト投稿 from BuzzFlow at ' + new Date().toLocaleString('ja-JP')
    
    console.log('Test tweet - User:', user.username)
    console.log('Test tweet - Content:', testContent)
    console.log('Test tweet - Token:', user.accessToken.substring(0, 20) + '...')
    
    try {
      const client = getTwitterClient(user.accessToken)
      const result = await client.v2.tweet(testContent)
      
      console.log('Tweet posted successfully:', result)
      
      return NextResponse.json({
        success: true,
        tweetId: result.data.id,
        tweetUrl: `https://twitter.com/${user.username}/status/${result.data.id}`,
        result: result.data
      })
    } catch (twitterError: any) {
      console.error('Twitter API error:', twitterError)
      console.error('Error response:', {
        status: twitterError.code,
        data: twitterError.data,
        errors: twitterError.errors,
        rateLimit: twitterError.rateLimit
      })
      
      return NextResponse.json({
        error: 'Twitter API エラー',
        details: {
          message: twitterError.message,
          code: twitterError.code,
          data: twitterError.data,
          errors: twitterError.errors
        }
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Error in test-tweet:', error)
    return NextResponse.json({
      error: 'テスト失敗',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}