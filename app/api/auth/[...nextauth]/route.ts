import NextAuth from 'next-auth'
import TwitterProvider from 'next-auth/providers/twitter'
import { prisma } from '@/lib/prisma'

console.log('Auth config:', {
  clientId: process.env.TWITTER_CLIENT_ID?.substring(0, 10) + '...',
  clientSecret: process.env.TWITTER_CLIENT_SECRET ? 'SET' : 'NOT SET',
  nextAuthUrl: process.env.NEXTAUTH_URL,
  nextAuthSecret: process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT SET',
  nodeEnv: process.env.NODE_ENV,
})

const handler = NextAuth({
  debug: true, // デバッグモードを有効化
  providers: [
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      version: '2.0',
      authorization: {
        url: 'https://twitter.com/i/oauth2/authorize',
        params: {
          scope: 'tweet.read tweet.write users.read offline.access',
        },
      },
      token: {
        url: 'https://api.twitter.com/2/oauth2/token',
      },
      userinfo: {
        url: 'https://api.twitter.com/2/users/me',
        params: {
          'user.fields': 'profile_image_url',
        },
      },
      client: {
        token_endpoint_auth_method: 'client_secret_post',
      },
      profile(profile) {
        console.log('Twitter profile data:', profile)
        return {
          id: profile.data.id,
          name: profile.data.name,
          username: profile.data.username,
          email: profile.data.email ?? null,
          image: profile.data.profile_image_url,
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('SignIn callback:', { user, account, profile })
      if (account?.provider === 'twitter') {
        try {
          // ユーザー情報を保存
          await prisma.user.upsert({
            where: { twitterId: account.providerAccountId },
            update: {
              username: user.name || '',
              name: user.name,
              email: user.email,
              image: user.image,
              accessToken: account.access_token || '',
              refreshToken: account.refresh_token,
            },
            create: {
              twitterId: account.providerAccountId,
              username: user.name || '',
              name: user.name,
              email: user.email,
              image: user.image,
              accessToken: account.access_token || '',
              refreshToken: account.refresh_token,
            },
          })
          return true
        } catch (error) {
          console.error('Error saving user:', error)
          return false
        }
      }
      return false
    },
    async session({ session, token }) {
      if (token.sub) {
        const user = await prisma.user.findFirst({
          where: { twitterId: token.sub },
        })
        if (user) {
          session.user = {
            ...session.user,
            id: user.id,
            username: user.username,
          }
        }
      }
      return session
    },
    async jwt({ token, account, profile }) {
      console.log('JWT callback:', { token, account, profile })
      if (account) {
        token.sub = account.providerAccountId
      }
      return token
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  secret: process.env.NEXTAUTH_SECRET,
})

export { handler as GET, handler as POST }