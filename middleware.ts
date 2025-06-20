import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// APIルートのマッピング（統合システム計画準拠）
const API_REDIRECTS: Record<string, string> = {
  // === 統合システム計画準拠のマッピング（循環回避版） ===
  
  // Intel Module (情報収集) → 直接対応
  '/api/intel/collect/topics': '/api/flow',
  
  // Create Module (コンテンツ生成) → 1:1マッピング（循環回避）
  '/api/create/flow/start': '/api/flow',
  '/api/create/draft/list': '/api/drafts',
  '/api/create/draft/manage': '/api/drafts',
  
  // Publish Module (投稿・配信) → 直接対応
  '/api/publish/post/now': '/api/post',
  '/api/publish/schedule/set': '/api/automation/scheduler',
  '/api/publish/calendar': '/api/generation/drafts',
  
  // Analyze Module (分析・監視) → 直接対応
  '/api/analyze/dashboard': '/api/integration/mission-control',
  
  // 旧パス → シンプルAPI直接 (詳細パスは除外)
  '/api/twitter/post': '/api/post',
  '/api/viral/v2/sessions': '/api/flow',
  
  // 既存（互換性維持）
  '/api/characters': '/api/generation/characters',
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