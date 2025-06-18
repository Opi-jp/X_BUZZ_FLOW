/**
 * API クライアントユーティリティ
 * 
 * このファイルは統一されたAPI呼び出しインターフェースを提供します。
 * 旧エンドポイントの自動変換機能も含まれています。
 */

import { API_ENDPOINTS, modernizeEndpoint } from './api-endpoints'

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  body?: any
  headers?: Record<string, string>
  signal?: AbortSignal
}

/**
 * 統一されたAPIクライアント
 * 
 * @param endpoint - APIエンドポイント（旧パスも自動変換されます）
 * @param options - リクエストオプション
 * @returns レスポンスデータ
 */
export async function apiClient<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  // 旧エンドポイントを新エンドポイントに変換
  const modernEndpoint = modernizeEndpoint(endpoint)
  
  // 開発環境では変換をログ出力
  if (process.env.NODE_ENV === 'development' && endpoint !== modernEndpoint) {
    console.warn(
      `[API Client] Legacy endpoint detected: ${endpoint} -> ${modernEndpoint}`
    )
  }

  const { method = 'GET', body, headers = {}, signal } = options

  const requestOptions: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    signal,
  }

  if (body && method !== 'GET') {
    requestOptions.body = JSON.stringify(body)
  }

  try {
    const response = await fetch(modernEndpoint, requestOptions)

    if (!response.ok) {
      const error = await response.text()
      throw new Error(
        `API Error: ${response.status} ${response.statusText} - ${error}`
      )
    }

    // 204 No Content の場合
    if (response.status === 204) {
      return null as any
    }

    return await response.json()
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Unknown error occurred')
  }
}

/**
 * 型安全なAPIクライアント生成関数
 */
export const api = {
  // Intelligence APIs
  intelligence: {
    news: {
      getLatest: (limit?: number) =>
        apiClient(`${API_ENDPOINTS.intelligence.news.latest}${limit ? `?limit=${limit}` : ''}`),
      collect: (data: any) =>
        apiClient(API_ENDPOINTS.intelligence.news.collect, { method: 'POST', body: data }),
      analyze: (data: any) =>
        apiClient(API_ENDPOINTS.intelligence.news.analyze, { method: 'POST', body: data }),
    },
    buzz: {
      getTrending: () => apiClient(API_ENDPOINTS.intelligence.buzz.trending),
      getPosts: () => apiClient(API_ENDPOINTS.intelligence.buzz.posts),
      getInfluencers: () => apiClient(API_ENDPOINTS.intelligence.buzz.influencers),
    },
  },

  // Generation APIs
  generation: {
    content: {
      session: {
        create: (data: { theme: string; style: string; platform: string }) =>
          apiClient(API_ENDPOINTS.generation.content.session.create, {
            method: 'POST',
            body: data,
          }),
        get: (id: string) =>
          apiClient(API_ENDPOINTS.generation.content.session.get(id)),
        process: (id: string) =>
          apiClient(API_ENDPOINTS.generation.content.session.process(id), {
            method: 'POST',
          }),
        getStatus: (id: string) =>
          apiClient(API_ENDPOINTS.generation.content.session.status(id)),
        resume: (id: string) =>
          apiClient(API_ENDPOINTS.generation.content.session.resume(id), {
            method: 'POST',
          }),
      },
      v2Sessions: {
        create: (data: { theme: string; platform: string; style: string }) =>
          apiClient(API_ENDPOINTS.generation.content.v2Sessions.create, {
            method: 'POST',
            body: data,
          }),
        get: (id: string) =>
          apiClient(API_ENDPOINTS.generation.content.v2Sessions.get(id)),
        collectTopics: (id: string) =>
          apiClient(API_ENDPOINTS.generation.content.v2Sessions.collectTopics(id), {
            method: 'POST',
          }),
        generateConcepts: (id: string) =>
          apiClient(API_ENDPOINTS.generation.content.v2Sessions.generateConcepts(id), {
            method: 'POST',
          }),
      },
    },
    drafts: {
      list: () => apiClient(API_ENDPOINTS.generation.drafts.list),
      get: (id: string) => apiClient(API_ENDPOINTS.generation.drafts.get(id)),
      update: (id: string, data: any) =>
        apiClient(API_ENDPOINTS.generation.drafts.update(id), {
          method: 'PUT',
          body: data,
        }),
      postNow: (id: string) =>
        apiClient(API_ENDPOINTS.generation.drafts.postNow(id), {
          method: 'POST',
        }),
    },
    characters: {
      list: () => apiClient(API_ENDPOINTS.generation.characters.list),
      create: (data: any) =>
        apiClient(API_ENDPOINTS.generation.characters.create, {
          method: 'POST',
          body: data,
        }),
    },
  },

  // その他の一般的なパターン
  get: <T = any>(endpoint: string) => apiClient<T>(endpoint),
  post: <T = any>(endpoint: string, data: any) =>
    apiClient<T>(endpoint, { method: 'POST', body: data }),
  put: <T = any>(endpoint: string, data: any) =>
    apiClient<T>(endpoint, { method: 'PUT', body: data }),
  delete: <T = any>(endpoint: string) =>
    apiClient<T>(endpoint, { method: 'DELETE' }),
}