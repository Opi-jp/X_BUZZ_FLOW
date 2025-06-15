import { NextRequest, NextResponse } from 'next/server'
import { getProviders } from 'next-auth/react'

export async function GET(request: NextRequest) {
  try {
    // NextAuthプロバイダー情報を取得
    const providers = await getProviders()
    
    // 環境変数の確認
    const envCheck = {
      TWITTER_CLIENT_ID: {
        exists: !!process.env.TWITTER_CLIENT_ID,
        value: process.env.TWITTER_CLIENT_ID?.substring(0, 10) + '...',
      },
      TWITTER_CLIENT_SECRET: {
        exists: !!process.env.TWITTER_CLIENT_SECRET,
        lastChars: process.env.TWITTER_CLIENT_SECRET?.slice(-4),
      },
      NEXTAUTH_URL: {
        exists: !!process.env.NEXTAUTH_URL,
        value: process.env.NEXTAUTH_URL,
      },
      NEXTAUTH_SECRET: {
        exists: !!process.env.NEXTAUTH_SECRET,
      },
    }

    // OAuth URLの構築テスト
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const expectedCallbackUrl = `${baseUrl}/api/auth/callback/twitter`
    
    // Twitter OAuth 2.0 認証URLの構築
    const authUrl = new URL('https://twitter.com/i/oauth2/authorize')
    authUrl.searchParams.append('response_type', 'code')
    authUrl.searchParams.append('client_id', process.env.TWITTER_CLIENT_ID || '')
    authUrl.searchParams.append('redirect_uri', expectedCallbackUrl)
    authUrl.searchParams.append('scope', 'tweet.read users.read offline.access')
    authUrl.searchParams.append('state', 'test-state')
    authUrl.searchParams.append('code_challenge', 'test-challenge')
    authUrl.searchParams.append('code_challenge_method', 'plain')

    return NextResponse.json({
      envCheck,
      providers,
      expectedCallbackUrl,
      testAuthUrl: authUrl.toString(),
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Debug endpoint error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}