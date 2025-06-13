/**
 * Google Custom Search API クライアント
 * 
 * 必要な環境変数:
 * - GOOGLE_API_KEY: Google Cloud Console から取得
 * - GOOGLE_SEARCH_ENGINE_ID: カスタム検索エンジンのID
 */

export interface GoogleSearchResult {
  title: string
  link: string
  snippet: string
  displayLink: string
  formattedUrl: string
  pagemap?: {
    cse_image?: Array<{ src: string }>
    metatags?: Array<Record<string, string>>
  }
}

export interface GoogleSearchResponse {
  items: GoogleSearchResult[]
  searchInformation: {
    totalResults: string
    searchTime: number
  }
}

export class GoogleSearchClient {
  private apiKey: string
  private searchEngineId: string
  private baseUrl = 'https://www.googleapis.com/customsearch/v1'

  constructor() {
    this.apiKey = process.env.GOOGLE_API_KEY || ''
    this.searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID || ''

    if (!this.apiKey || !this.searchEngineId) {
      console.warn('Google Search API credentials not configured')
    }
  }

  /**
   * 検索を実行
   */
  async search(query: string, options?: {
    num?: number // 結果数（1-10）
    start?: number // 開始位置
    dateRestrict?: string // 日付制限（例: d7 = 7日以内）
    lr?: string // 言語制限（例: lang_ja）
    siteSearch?: string // 特定サイト内検索
  }): Promise<GoogleSearchResult[]> {
    if (!this.apiKey || !this.searchEngineId) {
      console.error('Google Search API is not configured')
      return []
    }

    try {
      const params = new URLSearchParams({
        key: this.apiKey,
        cx: this.searchEngineId,
        q: query,
        num: (options?.num || 10).toString(),
        ...(options?.start && { start: options.start.toString() }),
        ...(options?.dateRestrict && { dateRestrict: options.dateRestrict }),
        ...(options?.lr && { lr: options.lr }),
        ...(options?.siteSearch && { siteSearch: options.siteSearch })
      })

      const response = await fetch(`${this.baseUrl}?${params}`)
      
      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Google Search API error: ${response.status} - ${error}`)
      }

      const data: GoogleSearchResponse = await response.json()
      return data.items || []
    } catch (error) {
      console.error('Google Search error:', error)
      return []
    }
  }

  /**
   * 複数のクエリを並列実行
   */
  async batchSearch(queries: string[], options?: Parameters<typeof this.search>[1]): Promise<{
    query: string
    results: GoogleSearchResult[]
  }[]> {
    const promises = queries.map(query => 
      this.search(query, options).then(results => ({ query, results }))
    )
    
    return Promise.all(promises)
  }

  /**
   * ニュース検索に最適化されたオプションで検索
   */
  async searchNews(query: string, daysBack: number = 7): Promise<GoogleSearchResult[]> {
    return this.search(query, {
      dateRestrict: `d${daysBack}`,
      num: 10
    })
  }

  /**
   * 日本語コンテンツに限定して検索
   */
  async searchJapanese(query: string, options?: Parameters<typeof this.search>[1]): Promise<GoogleSearchResult[]> {
    return this.search(query, {
      ...options,
      lr: 'lang_ja'
    })
  }

  /**
   * 特定のSNSプラットフォームで検索
   */
  async searchSocial(query: string, platform: 'twitter' | 'reddit' | 'youtube'): Promise<GoogleSearchResult[]> {
    const siteMap = {
      twitter: 'twitter.com OR x.com',
      reddit: 'reddit.com',
      youtube: 'youtube.com'
    }

    return this.search(query, {
      siteSearch: siteMap[platform],
      num: 10
    })
  }
}

// シングルトンインスタンス
export const googleSearch = new GoogleSearchClient()