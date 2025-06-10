import NextAuth from 'next-auth'
import TwitterProvider from 'next-auth/providers/twitter'
import { prisma } from '@/lib/prisma'

const handler = NextAuth({
  providers: [
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      version: '2.0',
      authorization: {
        url: 'https://twitter.com/i/oauth2/authorize',
        params: {
          scope: 'users.read tweet.read tweet.write offline.access',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
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
    async jwt({ token, account }) {
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