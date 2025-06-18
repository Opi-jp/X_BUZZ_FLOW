import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// APIルートのマッピング（旧パスから新パスへのリダイレクト）
const API_REDIRECTS: Record<string, string> = {
  // Generation
  '/api/characters': '/api/generation/characters',
  
  // Integration
  '/api/dashboard': '/api/integration/mission-control',
  '/api/settings': '/api/integration/config'
}

// フロントエンドルートのマッピング
const PAGE_REDIRECTS: Record<string, string> = {
  // Intelligence
  '/news': '/intelligence/news',
  '/buzz': '/intelligence/buzz',
  
  // Dashboard
  '/dashboard': '/mission-control'
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  // APIルートのリダイレクト
  for (const [oldPath, newPath] of Object.entries(API_REDIRECTS)) {
    if (pathname.startsWith(oldPath)) {
      const newUrl = new URL(request.url)
      newUrl.pathname = pathname.replace(oldPath, newPath)
      
      // 開発環境では警告ヘッダーを追加
      if (isDevelopment) {
        console.warn(`⚠️  [Middleware] Legacy API endpoint: ${pathname} → ${newUrl.pathname}`)
        const response = NextResponse.redirect(newUrl, { status: 308 })
        response.headers.set('X-Legacy-Endpoint-Warning', `${pathname} is deprecated. Use ${newUrl.pathname} instead.`)
        return response
      }
      
      return NextResponse.redirect(newUrl, { status: 308 }) // Permanent Redirect
    }
  }
  
  // ページルートのリダイレクト
  for (const [oldPath, newPath] of Object.entries(PAGE_REDIRECTS)) {
    if (pathname.startsWith(oldPath)) {
      const newUrl = new URL(request.url)
      newUrl.pathname = pathname.replace(oldPath, newPath)
      
      if (isDevelopment) {
        console.warn(`⚠️  [Middleware] Legacy page route: ${pathname} → ${newUrl.pathname}`)
      }
      
      return NextResponse.redirect(newUrl, { status: 308 }) // Permanent Redirect
    }
  }
  
  // test-* エンドポイントの警告（開発環境のみ）
  if (isDevelopment && pathname.includes('/test-') && pathname.includes('/api/')) {
    console.warn(`⚠️  [Middleware] Test endpoint accessed: ${pathname}. Consider moving to /api/debug/`)
  }
  
  return NextResponse.next()
}

// 対象となるパスの設定
export const config = {
  matcher: [
    // APIルート
    '/api/:path*',
    // ページルート（除外: _next, 静的ファイル）
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ]
}