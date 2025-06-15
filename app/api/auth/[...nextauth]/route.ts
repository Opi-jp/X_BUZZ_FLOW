import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth-options'

console.log('Auth config:', {
  twitterApiKey: process.env.TWITTER_API_KEY ? 'SET' : 'NOT SET',
  twitterApiSecret: process.env.TWITTER_API_SECRET ? 'SET' : 'NOT SET',
  nextAuthUrl: process.env.NEXTAUTH_URL,
  nextAuthSecret: process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT SET',
  nodeEnv: process.env.NODE_ENV,
})

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }