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

export const authOptions = {
  debug: true, // デバッグモードを有効化
  providers: [
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      version: '2.0',
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
      },
    },
  },
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
    async jwt({ token, account, user }) {
      console.log('JWT callback:', { token, account, user })
      if (account && user) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.userId = user.id
      }
      return token
    },
    async redirect({ url, baseUrl }) {
      console.log('Redirect callback:', { url, baseUrl })
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }