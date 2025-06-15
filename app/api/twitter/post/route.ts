import { NextRequest, NextResponse } from 'next/server'
import { TwitterApi } from 'twitter-api-v2'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text } = body

    if (!text) {
      return NextResponse.json(
        { error: 'Text content is required' },
        { status: 400 }
      )
    }

    // まず、NextAuthセッションからアクセストークンを取得してみる
    const session = await getServerSession(authOptions)
    if (session?.accessToken) {
      console.log('[TWITTER POST] Using NextAuth session token')
      const twitterClient = new TwitterApi(session.accessToken as string)
      
      try {
        const tweet = await twitterClient.v2.tweet(text)
        const tweetUrl = `https://twitter.com/${session.user?.username || 'user'}/status/${tweet.data.id}`
        
        console.log('[TWITTER POST] Successfully posted via NextAuth:', {
          tweetId: tweet.data.id,
          url: tweetUrl
        })
        
        return NextResponse.json({
          success: true,
          id: tweet.data.id,
          text: tweet.data.text,
          url: tweetUrl
        })
      } catch (authError: any) {
        console.log('[TWITTER POST] NextAuth token failed, trying other methods:', authError.message)
      }
    }

    // 認証成功確認済み - 実投稿テスト
    const USE_MOCK_POSTING = false // 実投稿でテスト
    
    if (USE_MOCK_POSTING) {
      const mockTweetId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      console.log('[MOCK TWITTER POST] Development mode:', {
        tweetId: mockTweetId,
        content: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        contentLength: text.length,
        timestamp: new Date().toISOString()
      })
      
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500))
      
      return NextResponse.json({
        success: true,
        id: mockTweetId,
        text: text,
        url: `https://twitter.com/opi/status/${mockTweetId}`,
        mock: true
      })
    }

    // Twitter API認証情報（環境変数から取得）
    const TWITTER_CREDENTIALS = {
      appKey: process.env.TWITTER_API_KEY!,
      appSecret: process.env.TWITTER_API_SECRET!,
      accessToken: process.env.TWITTER_ACCESS_TOKEN!,
      accessSecret: process.env.TWITTER_ACCESS_SECRET!
    }
    
    const hasV1Credentials = !!(
      TWITTER_CREDENTIALS.appKey &&
      TWITTER_CREDENTIALS.appSecret &&
      TWITTER_CREDENTIALS.accessToken &&
      TWITTER_CREDENTIALS.accessSecret
    )
    
    const hasV2Credentials = !!(
      process.env.TWITTER_CLIENT_ID &&
      process.env.TWITTER_CLIENT_SECRET
    )

    if (!hasV1Credentials && !hasV2Credentials) {
      // 認証情報がない場合はモック投稿
      const mockTweetId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      console.log('[MOCK TWITTER POST] Missing credentials, using mock:', {
        tweetId: mockTweetId,
        content: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        contentLength: text.length,
        timestamp: new Date().toISOString()
      })
      
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500))
      
      return NextResponse.json({
        success: true,
        id: mockTweetId,
        text: text,
        url: `https://twitter.com/mock_user/status/${mockTweetId}`,
        mock: true
      })
    }

    let twitterClient: TwitterApi

    if (hasV1Credentials) {
      // v1.1 API (アプリケーション認証)
      console.log('[TWITTER POST] Using Twitter API v1.1 credentials')
      twitterClient = new TwitterApi(TWITTER_CREDENTIALS)
    } else {
      // v2 API (OAuth2.0) - Bearer Token使用
      console.log('[TWITTER POST] Using Twitter API v2 with OAuth2.0')
      
      // Bearer Tokenが必要 - 一旦App-only auth (Bearer Token)を試行
      if (process.env.TWITTER_BEARER_TOKEN) {
        twitterClient = new TwitterApi(process.env.TWITTER_BEARER_TOKEN)
      } else {
        // Bearer Tokenもない場合はClient Credentialsで試行
        try {
          twitterClient = new TwitterApi({
            clientId: process.env.TWITTER_CLIENT_ID!,
            clientSecret: process.env.TWITTER_CLIENT_SECRET!,
          })
        } catch (error) {
          console.log('[TWITTER POST] OAuth2.0 setup failed, using mock')
          const mockTweetId = `mock_oauth2_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          
          return NextResponse.json({
            success: true,
            id: mockTweetId,
            text: text,
            url: `https://twitter.com/mock_user/status/${mockTweetId}`,
            mock: true,
            note: 'OAuth2.0 setup failed'
          })
        }
      }
    }

    try {
      console.log('[TWITTER POST] Posting to @opi account:', {
        contentLength: text.length,
        contentPreview: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        timestamp: new Date().toISOString()
      })

      // 実際にTwitterに投稿
      const tweet = await twitterClient.v2.tweet(text)
      
      const tweetUrl = `https://twitter.com/opi/status/${tweet.data.id}`
      
      console.log('[TWITTER POST] Successfully posted:', {
        tweetId: tweet.data.id,
        url: tweetUrl
      })
      
      return NextResponse.json({
        success: true,
        id: tweet.data.id,
        text: tweet.data.text,
        url: tweetUrl
      })
    } catch (twitterError: any) {
      console.error('Twitter API error:', twitterError)
      
      if (twitterError.code === 401) {
        return NextResponse.json(
          { error: 'Twitter authentication failed' },
          { status: 401 }
        )
      }
      
      if (twitterError.code === 403) {
        return NextResponse.json(
          { error: 'Twitter posting forbidden - check permissions' },
          { status: 403 }
        )
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to post to Twitter',
          message: twitterError.message || 'Unknown Twitter API error',
          code: twitterError.code
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in twitter/post:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}