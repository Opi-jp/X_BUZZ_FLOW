import { NextResponse } from 'next/server'

export async function GET() {
  const clientId = process.env.TWITTER_CLIENT_ID
  const clientSecret = process.env.TWITTER_CLIENT_SECRET
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/callback/twitter`

  // OAuth 2.0 認証URLを手動で構築
  const authUrl = new URL('https://twitter.com/i/oauth2/authorize')
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('client_id', clientId || '')
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', 'users.read tweet.read tweet.write offline.access')
  authUrl.searchParams.set('state', 'test-state-123')
  authUrl.searchParams.set('code_challenge', 'test-challenge')
  authUrl.searchParams.set('code_challenge_method', 'plain')

  return NextResponse.json({
    status: 'Twitter OAuth 2.0 Test',
    config: {
      clientId: clientId ? `${clientId.substring(0, 10)}...` : 'NOT SET',
      clientSecret: clientSecret ? 'SET' : 'NOT SET',
      redirectUri,
      nextAuthUrl: process.env.NEXTAUTH_URL,
    },
    manualAuthUrl: authUrl.toString(),
    instructions: 'Copy the manualAuthUrl and paste in browser to test OAuth flow',
  })
}