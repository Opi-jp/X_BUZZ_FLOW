import { NextResponse } from 'next/server'

export async function GET() {
  const config = {
    twitter: {
      clientId: process.env.TWITTER_CLIENT_ID?.substring(0, 10) + '...',
      clientSecret: process.env.TWITTER_CLIENT_SECRET ? 'SET' : 'NOT SET',
      clientIdLength: process.env.TWITTER_CLIENT_ID?.length,
      clientSecretLength: process.env.TWITTER_CLIENT_SECRET?.length,
    },
    nextAuth: {
      url: process.env.NEXTAUTH_URL,
      secret: process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT SET',
      secretLength: process.env.NEXTAUTH_SECRET?.length,
    },
    environment: {
      nodeEnv: process.env.NODE_ENV,
      vercel: process.env.VERCEL ? 'YES' : 'NO',
      vercelUrl: process.env.VERCEL_URL,
    },
    callbacks: {
      configured: process.env.NEXTAUTH_URL ? `${process.env.NEXTAUTH_URL}/api/auth/callback/twitter` : 'NOT SET',
    }
  }

  return NextResponse.json(config)
}