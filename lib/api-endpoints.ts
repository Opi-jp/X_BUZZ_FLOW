/**
 * API エンドポイント定数
 * 
 * 重要: 新しいAPIパスを使用してください。
 * 旧パスはmiddleware.tsによりリダイレクトされますが、
 * パフォーマンスと保守性のため直接新しいパスを使用することを推奨します。
 */

export const API_ENDPOINTS = {
  // Intelligence APIs
  intelligence: {
    news: {
      latest: '/api/intelligence/news/latest',
      collect: '/api/intelligence/news/collect',
      analyze: '/api/intelligence/news/analyze',
      sources: '/api/intelligence/news/sources',
      articles: '/api/intelligence/news/articles',
      threads: '/api/intelligence/news/threads',
    },
    buzz: {
      collect: '/api/intelligence/buzz/collect',
      trending: '/api/intelligence/buzz/trending',
      posts: '/api/intelligence/buzz/posts',
      influencers: '/api/intelligence/buzz/influencers',
    },
    trends: {
      discover: '/api/intelligence/trends/discover',
      analyze: '/api/intelligence/trends/analyze',
    },
  },

  // Generation APIs
  generation: {
    content: {
      session: {
        create: '/api/generation/content/session/create',
        get: (id: string) => `/api/generation/content/session/${id}`,
        process: (id: string) => `/api/generation/content/session/${id}/process`,
        processAsync: (id: string) => `/api/generation/content/session/${id}/process-async`,
        continueAsync: (id: string) => `/api/generation/content/session/${id}/continue-async`,
        status: (id: string) => `/api/generation/content/session/${id}/async-status`,
        progress: (id: string) => `/api/generation/content/session/${id}/progress`,
        resume: (id: string) => `/api/generation/content/session/${id}/resume`,
        recover: (id: string) => `/api/generation/content/session/${id}/recover`,
        drafts: (id: string) => `/api/generation/content/session/${id}/drafts`,
        proceedNext: (id: string) => `/api/generation/content/session/${id}/proceed-next-phase`,
      },
      // V2セッション（ViralSession用）
      v2Sessions: {
        create: '/api/generation/content/sessions', // ViralSession
        get: (id: string) => `/api/generation/content/sessions/${id}`,
        collectTopics: (id: string) => `/api/generation/content/sessions/${id}/collect-topics`,
        generateConcepts: (id: string) => `/api/generation/content/sessions/${id}/generate-concepts`,
        analyzeConcepts: (id: string) => `/api/generation/content/sessions/${id}/analyze-concepts`,
        generateContents: (id: string) => `/api/generation/content/sessions/${id}/generate-contents`,
        generateCharacterContents: (id: string) => `/api/generation/content/sessions/${id}/generate-character-contents`,
        generateCharacterContentsV2: (id: string) => `/api/generation/content/sessions/${id}/generate-character-contents-v2`,
        clone: (id: string) => `/api/generation/content/sessions/${id}/clone`,
        smartResume: (id: string) => `/api/generation/content/sessions/${id}/smart-resume`,
        drafts: (id: string) => `/api/generation/content/sessions/${id}/drafts`,
      },
    },
    drafts: {
      list: '/api/generation/drafts',
      get: (id: string) => `/api/generation/drafts/${id}`,
      update: (id: string) => `/api/generation/drafts/${id}`,
      schedule: (id: string) => `/api/generation/drafts/${id}/schedule`,
      cancelSchedule: (id: string) => `/api/generation/drafts/${id}/cancel-schedule`,
      postNow: (id: string) => `/api/generation/drafts/${id}/post-now`,
    },
    characters: {
      list: '/api/generation/characters',
      create: '/api/generation/characters',
      get: (id: string) => `/api/generation/characters/${id}`,
      update: (id: string) => `/api/generation/characters/${id}`,
      delete: (id: string) => `/api/generation/characters/${id}`,
    },
  },

  // Automation APIs
  automation: {
    scheduler: {
      list: '/api/automation/scheduler',
      create: '/api/automation/scheduler',
      update: (id: string) => `/api/automation/scheduler/${id}`,
      delete: (id: string) => `/api/automation/scheduler/${id}`,
      rt: '/api/automation/scheduler/rt',
    },
    performance: {
      recent: '/api/automation/performance/recent',
      track: (id: string) => `/api/automation/performance/${id}`,
    },
    publisher: {
      post: '/api/automation/publisher/post',
      schedule: '/api/automation/publisher/schedule',
    },
  },

  // Integration APIs
  integration: {
    missionControl: {
      stats: '/api/integration/mission-control/stats',
      insights: '/api/integration/mission-control/insights',
    },
    config: {
      get: '/api/integration/config',
      update: '/api/integration/config',
    },
    pipeline: {
      status: '/api/integration/pipeline/status',
      run: '/api/integration/pipeline/run',
    },
  },

  // Cron Jobs
  cron: {
    collectNews: '/api/cron/collect-news',
    collectPerformance: '/api/cron/collect-performance',
    scheduledPosts: '/api/cron/scheduled-posts',
    scheduledRts: '/api/cron/scheduled-rts',
    aggregateInfluencers: '/api/cron/aggregate-influencers',
  },

  // その他のAPI
  twitter: {
    post: '/api/twitter/post',
  },
  perplexity: {
    trends: '/api/perplexity/trends',
  },
  health: '/api/health',
} as const

// 旧エンドポイントから新エンドポイントへのマッピング（移行支援用）
export const LEGACY_TO_NEW_MAPPING: Record<string, string> = {
  // CoTセッション
  '/api/viral/cot-session/create': API_ENDPOINTS.generation.content.session.create,
  '/api/viral/cot-session/{id}': '/api/generation/content/session/{id}',
  '/api/viral/cot-session/{id}/process': '/api/generation/content/session/{id}/process',
  
  // V2セッション
  '/api/viral/v2/sessions': API_ENDPOINTS.generation.content.v2Sessions.create,
  '/api/viral/v2/sessions/{id}': '/api/generation/content/sessions/{id}',
  
  // 下書き
  '/api/viral/drafts': API_ENDPOINTS.generation.drafts.list,
  '/api/viral/drafts/{id}': '/api/generation/drafts/{id}',
  
  // ニュース
  '/api/news/latest': API_ENDPOINTS.intelligence.news.latest,
  '/api/news/collect': API_ENDPOINTS.intelligence.news.collect,
  
  // バズ
  '/api/buzz/trending': API_ENDPOINTS.intelligence.buzz.trending,
  '/api/buzz/posts': API_ENDPOINTS.intelligence.buzz.posts,
  
  // パフォーマンス
  '/api/viral/performance/recent': API_ENDPOINTS.automation.performance.recent,
  
  // キャラクター
  '/api/characters': API_ENDPOINTS.generation.characters.list,
}

// ヘルパー関数：旧エンドポイントを新エンドポイントに変換
export function modernizeEndpoint(legacyPath: string): string {
  // 動的パスの処理
  for (const [legacy, modern] of Object.entries(LEGACY_TO_NEW_MAPPING)) {
    if (legacy.includes('{id}')) {
      const pattern = legacy.replace('{id}', '([^/]+)')
      const regex = new RegExp(`^${pattern}$`)
      const match = legacyPath.match(regex)
      if (match) {
        return modern.replace('{id}', match[1])
      }
    } else if (legacy === legacyPath) {
      return modern
    }
  }
  return legacyPath
}