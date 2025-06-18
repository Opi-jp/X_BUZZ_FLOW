// APIルートのリダイレクトマッピング
// 旧ルート → 新ルートの対応表

export const API_ROUTE_MAPPING = {
  // Intelligence (情報収集・分析)
  '/api/news': '/api/intelligence/news',
  '/api/collect': '/api/intelligence/buzz/collect',
  '/api/buzz': '/api/intelligence/buzz',
  
  // Generation (コンテンツ生成)
  '/api/viral/v2': '/api/generation/content',
  '/api/viral/drafts': '/api/generation/drafts',
  '/api/characters': '/api/generation/characters',
  '/api/viral/cot-session': '/api/generation/content/session',
  
  // Automation (自動化・投稿)
  '/api/viral/scheduler': '/api/automation/scheduler',
  '/api/viral/performance': '/api/automation/performance',
  '/api/viral/post-draft': '/api/automation/publisher/post',
  
  // Integration (統合・制御)
  '/api/dashboard': '/api/integration/mission-control',
  '/api/health': '/api/integration/health',
  '/api/settings': '/api/integration/config'
}

// リダイレクトヘルパー関数
export function getNewApiRoute(oldRoute: string): string | null {
  // 完全一致をチェック
  if (API_ROUTE_MAPPING[oldRoute]) {
    return API_ROUTE_MAPPING[oldRoute]
  }
  
  // プレフィックスマッチをチェック
  for (const [oldPrefix, newPrefix] of Object.entries(API_ROUTE_MAPPING)) {
    if (oldRoute.startsWith(oldPrefix + '/')) {
      return oldRoute.replace(oldPrefix, newPrefix)
    }
  }
  
  return null
}