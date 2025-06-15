import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

export async function GET() {
  const headersList = await headers()
  const host = headersList.get('host')
  
  return NextResponse.json({
    env: {
      TWITTER_CLIENT_ID: process.env.TWITTER_CLIENT_ID ? 'SET' : 'NOT SET',
      TWITTER_CLIENT_SECRET: process.env.TWITTER_CLIENT_SECRET ? 'SET' : 'NOT SET',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT SET',
      NODE_ENV: process.env.NODE_ENV,
    },
    request: {
      host,
      protocol: 'http',
      baseUrl: `http://${host}`,
    },
    callbacks: {
      expected: `http://${host}/api/auth/callback/twitter`,
      configured: process.env.NEXTAUTH_URL + '/api/auth/callback/twitter',
    },
    timestamp: new Date().toISOString(),
  })
}