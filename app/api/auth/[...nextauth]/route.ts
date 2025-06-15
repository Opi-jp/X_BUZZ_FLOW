import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth-options'

console.log('Auth config:', {
  twitterClientId: process.env.TWITTER_CLIENT_ID ? 'SET' : 'NOT SET',
  twitterClientSecret: process.env.TWITTER_CLIENT_SECRET ? 'SET' : 'NOT SET',
  nextAuthUrl: process.env.NEXTAUTH_URL,
  nextAuthSecret: process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT SET',
  nodeEnv: process.env.NODE_ENV,
  version: '2.0',
})

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }