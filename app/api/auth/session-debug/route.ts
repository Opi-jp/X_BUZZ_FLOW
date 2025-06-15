import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const cookieStore = await cookies()
    
    // セッションクッキーの存在確認
    const sessionToken = cookieStore.get('next-auth.session-token') || 
                       cookieStore.get('__Secure-next-auth.session-token')
    
    return NextResponse.json({
      session: session || null,
      hasSession: !!session,
      sessionUser: session?.user || null,
      sessionTokenExists: !!sessionToken,
      sessionTokenName: sessionToken?.name || 'NOT FOUND',
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Session debug error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}