import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// APIルートのマッピング（旧パスから新パスへのリダイレクト）
const API_REDIRECTS: Record<string, string> = {
  // Generation（既存）
  '/api/characters': '/api/generation/characters',
  
  // Integration（既存）
  '/api/dashboard': '/api/integration/mission-control',
  '/api/settings': '/api/integration/config',
  
  // === Phase 1: 統合システム実装計画に基づく新しいマッピング ===
  
  // Intelligence Module への移行
  '/api/intelligence/news/collect': '/api/intel/news/collect',
  '/api/intelligence/news/analyze': '/api/intel/news/analyze',
  '/api/intelligence/news/latest': '/api/intel/news/collect',
  '/api/intelligence/buzz': '/api/intel/social/collect',
  '/api/collect': '/api/intel/social/collect',
  
  // Creation Module への移行
  // '/api/generation/content/sessions': '/api/create/flow/start', // 一時的にコメントアウト
  // '/api/generation/content/session': '/api/create/flow/process', // 一時的にコメントアウト
  // '/api/generation/drafts': '/api/create/draft/generate', // 一時的にコメントアウト
  '/api/viral/v2/sessions': '/api/create/flow/start',
  
  // Publishing Module への移行
  // '/api/twitter/post': '/api/publish/post/now', // 一時的にコメントアウト
  '/api/automation/scheduler': '/api/publish/schedule/set',
  
  // Analytics Module への移行
  '/api/analytics/insights': '/api/analyze/report/generate',
  '/api/automation/performance': '/api/analyze/metrics/collect'
}

// フロントエンドルートのマッピング
const PAGE_REDIRECTS: Record<string, string> = {
  // Intelligence（既存）
  '/news': '/intelligence/news',
  '/buzz': '/intelligence/buzz',
  
  // Dashboard（既存）
  '/dashboard': '/mission-control',
  
  // === Phase 1: 新しいページ構造への移行 ===
  
  // Intel Module
  '/intelligence': '/intel',
  '/intelligence/news': '/intel/news',
  '/intelligence/buzz': '/intel/social',
  
  // Create Module  
  '/generation': '/create',
  '/viral/v2': '/create/new',
  '/generation/content': '/create/flow',
  
  // Publish Module
  '/automation/publisher': '/publish',
  '/automation/scheduler': '/publish/calendar',
  
  // Analyze Module
  '/analytics': '/analyze',
  '/automation/performance': '/analyze/metrics'
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  // APIルートのリダイレクト
  for (const [oldPath, newPath] of Object.entries(API_REDIRECTS)) {
    if (pathname === oldPath || pathname.startsWith(oldPath + '/')) {
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