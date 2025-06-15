import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const envCheck = {
    nodeEnv: process.env.NODE_ENV,
    nextAuthUrl: process.env.NEXTAUTH_URL,
    nextAuthSecret: process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT SET',
    twitterClientId: process.env.TWITTER_CLIENT_ID ? 'SET' : 'NOT SET',
    twitterClientSecret: process.env.TWITTER_CLIENT_SECRET ? 'SET' : 'NOT SET',
    hasDbUrl: !!process.env.DATABASE_URL,
    hasDirectUrl: !!process.env.DIRECT_URL,
    vercelUrl: process.env.VERCEL_URL,
    vercelEnv: process.env.VERCEL_ENV
  }

  return NextResponse.json({
    status: 'ok',
    environment: envCheck,
    timestamp: new Date().toISOString()
  })
}