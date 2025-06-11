import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { getTwitterClient } from '@/lib/twitter'

export async function POST(request: NextRequest) {
  try {
    // セッション確認
    const session = await getServerSession(authOptions)
    console.log('Session in test-tweet:', JSON.stringify(session, null, 2))
    
    if (!session?.user) {
      // セッションがない場合、リクエストヘッダーを確認
      console.log('No session found. Headers:', {
        cookie: request.headers.get('cookie'),
        authorization: request.headers.get('authorization'),
      })
      
      return NextResponse.json(
        { error: 'Twitter認証が必要です' },
        { status: 401 }
      )
    }

    // ユーザー情報を取得（複数の方法で試す）
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          session.user.id ? { id: session.user.id } : {},
          session.user.email ? { email: session.user.email } : {},
          { username: session.user.name || '' }
        ].filter(condition => Object.keys(condition).length > 0)
      }
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
    console.log('Test tweet - Token type:', typeof user.accessToken)
    console.log('Test tweet - Token length:', user.accessToken.length)
    console.log('Test tweet - Token preview:', user.accessToken.substring(0, 20) + '...')
    
    try {
      const client = getTwitterClient(user.accessToken)
      console.log('Twitter client created')
      
      // まずユーザー情報を取得してアクセストークンが有効か確認
      try {
        const me = await client.v2.me()
        console.log('Twitter user verified:', me.data.username)
      } catch (meError: any) {
        console.error('Failed to get user info:', meError)
        console.error('Me error details:', {
          status: meError.code,
          data: meError.data,
          errors: meError.errors
        })
      }
      
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