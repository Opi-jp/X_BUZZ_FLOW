import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function GET() {
  // PKCE (Proof Key for Code Exchange) の実装
  const codeVerifier = crypto.randomBytes(32).toString('base64url')
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url')
  
  const state = crypto.randomBytes(16).toString('hex')
  
  const clientId = process.env.TWITTER_CLIENT_ID!
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/callback/twitter`
  
  // Twitter OAuth 2.0 URL
  const authUrl = new URL('https://twitter.com/i/oauth2/authorize')
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', 'users.read tweet.read tweet.write offline.access')
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('code_challenge', codeChallenge)
  authUrl.searchParams.set('code_challenge_method', 'S256')
  
  return NextResponse.json({
    message: 'Twitter OAuth 2.0 with proper PKCE',
    authUrl: authUrl.toString(),
    debug: {
      codeVerifier: codeVerifier.substring(0, 10) + '...',
      codeChallenge: codeChallenge.substring(0, 10) + '...',
      state,
      clientId: clientId.substring(0, 15) + '...',
      redirectUri,
    },
    instructions: 'Save the codeVerifier - you will need it for the token exchange',
  })
}