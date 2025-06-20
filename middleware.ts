import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// APIルートのマッピング（統合システム計画準拠）
const API_REDIRECTS: Record<string, string> = {
  // === 統合システム計画準拠のマッピング ===
  
  // Create Module (旧 → 新)
  '/api/flow': '/api/create/flow/start',
  '/api/drafts': '/api/create/draft/list',
  '/api/generation/content/sessions': '/api/create/flow/list',
  '/api/generation/drafts': '/api/create/draft/list',
  '/api/characters': '/api/create/persona/list',
  
  // Publish Module (旧 → 新)
  '/api/post': '/api/publish/post/now',
  '/api/twitter/post': '/api/publish/post/now',
  '/api/publish': '/api/publish/post/now',
  '/api/posting-plan/schedule': '/api/publish/schedule/set',
  '/api/posting-plan/generate': '/api/publish/schedule/generate',
  
  // Intel Module (旧 → 新)
  '/api/collect': '/api/intel/social/collect',
  '/api/news/latest': '/api/intel/news/latest',
  '/api/news/articles': '/api/intel/news/articles',
  '/api/news/collect': '/api/intel/news/collect',
  '/api/buzz/trending': '/api/intel/social/trending',
  '/api/buzz-posts': '/api/intel/social/posts',
  '/api/briefing/morning': '/api/intel/insights/briefing',
  
  // Analyze Module (旧 → 新)
  '/api/dashboard/stats': '/api/analyze/metrics/overview',
  '/api/analytics': '/api/analyze/metrics/data',
  '/api/viral/performance/recent': '/api/analyze/performance/recent',
  
  // 既存（互換性維持）
  '/api/dashboard': '/api/integration/mission-control',
  '/api/settings': '/api/integration/config'
}

// フロントエンドルートのマッピング（統合システム計画準拠・循環回避）
const PAGE_REDIRECTS: Record<string, string> = {
  // === 統合システム計画準拠のページ構造（循環回避版） ===
  
  // 旧パス → 統合パスへの移行（1回のみリダイレクト）
  '/generation': '/create',
  '/generation/content': '/create',
  '/generation/drafts': '/drafts',
  '/viral/v2': '/create',
  
  // 既存（互換性維持） - 存在するページのみマップ
  '/dashboard': '/mission-control'
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  // APIルートのリダイレクト
  for (const [oldPath, newPath] of Object.entries(API_REDIRECTS)) {
    if (pathname === oldPath || pathname.startsWith(oldPath + '/')) {
      // リダイレクトループを防ぐ
      if (pathname.startsWith(newPath)) {
        return NextResponse.next()
      }
      
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