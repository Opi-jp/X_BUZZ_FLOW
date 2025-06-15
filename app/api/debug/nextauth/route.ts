import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const debug = {
    nodeEnv: process.env.NODE_ENV,
    nextAuthUrl: process.env.NEXTAUTH_URL,
    nextAuthSecret: process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT SET',
    
    // Twitter OAuth 1.0a credentials
    twitterApiKey: process.env.TWITTER_API_KEY ? 'SET' : 'NOT SET',
    twitterApiSecret: process.env.TWITTER_API_SECRET ? 'SET' : 'NOT SET',
    
    // Twitter OAuth 2.0 credentials
    twitterClientId: process.env.TWITTER_CLIENT_ID ? 'SET' : 'NOT SET',
    twitterClientSecret: process.env.TWITTER_CLIENT_SECRET ? 'SET' : 'NOT SET',
    
    // Values (first 10 chars for debugging)
    twitterApiKeyValue: process.env.TWITTER_API_KEY?.substring(0, 10),
    twitterApiSecretValue: process.env.TWITTER_API_SECRET?.substring(0, 10),
    nextAuthUrlValue: process.env.NEXTAUTH_URL,
    
    // Database
    hasDbUrl: !!process.env.DATABASE_URL,
    hasDirectUrl: !!process.env.DIRECT_URL,
  }

  return NextResponse.json({
    status: 'debug',
    environment: debug,
    timestamp: new Date().toISOString()
  })
}