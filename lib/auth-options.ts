import TwitterProvider from 'next-auth/providers/twitter'
import { prisma } from '@/lib/prisma'
import type { NextAuthOptions } from 'next-auth'

export const authOptions: NextAuthOptions = {
  debug: true, // 強制的にデバッグ有効
  providers: [
    TwitterProvider({
      clientId: process.env.TWITTER_API_KEY || '',
      clientSecret: process.env.TWITTER_API_SECRET || '',
      version: '1.0',
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.session-token'
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('SignIn callback:', { user: user?.id, account: account?.provider })
      if (account?.provider === 'twitter') {
        try {
          // 簡略化されたユーザー保存（デバッグ用）
          const userData = {
            twitterId: account.providerAccountId,
            username: user.name || 'unknown',
            name: user.name || '',
            email: user.email || '',
            image: user.image || '',
            accessToken: account.access_token || '',
            refreshToken: account.refresh_token || '',
          }
          
          await prisma.user.upsert({
            where: { twitterId: account.providerAccountId },
            update: userData,
            create: userData,
          })
          
          console.log('User saved successfully')
          return true
        } catch (error) {
          console.error('Error saving user:', error)
          // エラーでも認証は通す（テスト用）
          return true
        }
      }
      return false
    },
    async session({ session, token }) {
      console.log('Session callback - token:', { sub: token.sub, twitterId: token.twitterId })
      
      // tokenにtwitterIdが保存されている場合はそれを使用
      const twitterId = (token.twitterId as string) || token.sub
      
      if (twitterId) {
        const user = await prisma.user.findFirst({
          where: { 
            OR: [
              { twitterId: twitterId },
              { id: token.userId as string }
            ].filter(Boolean)
          },
        })
        console.log('Session callback - user found:', user ? `Yes (${user.username})` : 'No')
        if (user) {
          session.user = {
            ...session.user,
            id: user.id,
            username: user.username,
          }
        }
      }
      
      // JWTトークンからアクセストークンをセッションに追加
      if (token.accessToken) {
        session.accessToken = token.accessToken as string
      }
      
      return session
    },
    async jwt({ token, account, user }) {
      console.log('JWT callback:', { token, account, user })
      if (account && user) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.userId = user.id
        token.twitterId = account.providerAccountId
      }
      return token
    },
    async redirect({ url, baseUrl }) {
      console.log('Redirect callback:', { url, baseUrl })
      
      // 認証成功後は必ずダッシュボードにリダイレクト
      if (url.includes('/api/auth/callback') || url === baseUrl + '/') {
        console.log('Auth success, redirecting to dashboard')
        return `${baseUrl}/dashboard`
      }
      
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url
      
      // デフォルトはダッシュボード
      return `${baseUrl}/dashboard`
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  secret: process.env.NEXTAUTH_SECRET,
}