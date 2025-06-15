import { NextResponse } from 'next/server'

export async function GET() {
  const config = {
    oauth2: {
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET ? '***' + process.env.TWITTER_CLIENT_SECRET.slice(-10) : 'NOT SET',
      hasClientId: !!process.env.TWITTER_CLIENT_ID,
      hasClientSecret: !!process.env.TWITTER_CLIENT_SECRET,
    },
    oauth1: {
      apiKey: process.env.TWITTER_API_KEY,
      apiSecret: process.env.TWITTER_API_SECRET ? '***' + process.env.TWITTER_API_SECRET.slice(-10) : 'NOT SET',
      hasApiKey: !!process.env.TWITTER_API_KEY,
      hasApiSecret: !!process.env.TWITTER_API_SECRET,
    },
    nextAuth: {
      url: process.env.NEXTAUTH_URL,
      hasSecret: !!process.env.NEXTAUTH_SECRET,
    },
    callbacks: {
      signin: `${process.env.NEXTAUTH_URL}/api/auth/callback/twitter`,
      expected: 'http://localhost:3000/api/auth/callback/twitter',
    }
  }

  return NextResponse.json(config, { status: 200 })
}