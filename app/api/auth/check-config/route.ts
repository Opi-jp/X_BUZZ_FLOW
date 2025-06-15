import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth-options'

export async function GET() {
  // Twitter OAuth 2.0設定の詳細チェック
  const twitterProvider = authOptions.providers.find(p => p.id === 'twitter')
  
  const config = {
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      VERCEL: !!process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
    },
    twitter: {
      oauth_version: '2.0',
      client_id: {
        exists: !!process.env.TWITTER_CLIENT_ID,
        prefix: process.env.TWITTER_CLIENT_ID?.substring(0, 15) + '...',
        expected_format: 'd09yVlhvZFVHYUlEVEtjVUo0eC06MTpjaQ',
        matches: process.env.TWITTER_CLIENT_ID === 'd09yVlhvZFVHYUlEVEtjVUo0eC06MTpjaQ',
      },
      client_secret: {
        exists: !!process.env.TWITTER_CLIENT_SECRET,
        length: process.env.TWITTER_CLIENT_SECRET?.length,
        last_4: process.env.TWITTER_CLIENT_SECRET?.slice(-4),
        expected_last_4: 'JFP3',
        matches: process.env.TWITTER_CLIENT_SECRET?.endsWith('JFP3'),
      },
    },
    nextauth: {
      secret_exists: !!process.env.NEXTAUTH_SECRET,
      debug_enabled: authOptions.debug,
      session_strategy: authOptions.session?.strategy,
      providers: authOptions.providers.map(p => p.id),
    },
    callbacks: {
      expected_local: 'http://localhost:3000/api/auth/callback/twitter',
      expected_prod: 'https://x-buzz-flow.vercel.app/api/auth/callback/twitter',
      current_base: process.env.NEXTAUTH_URL,
    },
    provider_config: twitterProvider ? {
      id: (twitterProvider as any).id,
      name: (twitterProvider as any).name,
      type: (twitterProvider as any).type,
      version: (twitterProvider as any).version,
    } : null,
  }

  return NextResponse.json(config, { 
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    }
  })
}