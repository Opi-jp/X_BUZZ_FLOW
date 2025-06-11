import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

// セッションをクリアしてトークンも削除
export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    
    if (session?.user && (session.user as any).id) {
      // DBからトークンをクリア
      await prisma.user.update({
        where: { id: (session.user as any).id },
        data: {
          accessToken: '',
          refreshToken: null,
        }
      })
    }
    
    // セッションもクリア（NextAuthのサインアウトページにリダイレクト）
    return NextResponse.json({ 
      success: true, 
      redirectUrl: '/api/auth/signout?callbackUrl=/auth/signin' 
    })
  } catch (error) {
    console.error('Error signing out:', error)
    return NextResponse.json({ error: 'Failed to sign out' }, { status: 500 })
  }
}