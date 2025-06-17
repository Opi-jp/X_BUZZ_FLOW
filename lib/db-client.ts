// DBクライアント - 柔軟なデータアクセス

export class DBClient {
  private static baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

  // 汎用クエリ
  static async query(params: {
    table: 'sessions' | 'drafts' | 'performance'
    where?: any
    select?: any
    include?: any
    orderBy?: any
    take?: number
    skip?: number
  }) {
    const response = await fetch(`${this.baseUrl}/api/viral/v2/db/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    })
    
    if (!response.ok) {
      throw new Error(`Query failed: ${response.statusText}`)
    }
    
    return response.json()
  }

  // JSONデータの抽出
  static async extract(params: {
    type: 'topics' | 'concepts' | 'sources'
    filters?: any
    extract?: string[]
  }) {
    const response = await fetch(`${this.baseUrl}/api/viral/v2/db/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    })
    
    if (!response.ok) {
      throw new Error(`Extract failed: ${response.statusText}`)
    }
    
    return response.json()
  }

  // よく使うクエリのショートカット
  
  // 最新のトピックを取得
  static async getLatestTopics(theme?: string, limit: number = 10) {
    const result = await this.extract({
      type: 'topics',
      filters: theme ? { theme } : {},
      extract: ['TOPIC', 'url', 'date', 'summary', 'keyPoints']
    })
    
    return result.data.slice(0, limit)
  }

  // キャラクター別の下書き
  static async getDraftsByCharacter(characterId: string) {
    return this.query({
      table: 'drafts',
      where: { characterId },
      include: {
        session: {
          select: { theme: true, platform: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  // 特定期間のセッション
  static async getSessionsByDateRange(startDate: Date, endDate: Date) {
    return this.query({
      table: 'sessions',
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  // トピックのキーワード検索
  static async searchTopicsByKeyword(keyword: string) {
    const result = await this.extract({
      type: 'topics',
      extract: ['TOPIC', 'summary', 'url', 'date']
    })
    
    // クライアントサイドでフィルタリング
    return result.data.filter((topic: any) => 
      topic.TOPIC?.includes(keyword) || 
      topic.summary?.includes(keyword)
    )
  }

  // コンセプトの角度別取得
  static async getConceptsByAngle(angle: string) {
    const result = await this.extract({
      type: 'concepts',
      extract: ['angle', 'structure.openingHook', 'topicTitle', 'format']
    })
    
    return result.data.filter((concept: any) => concept.angle === angle)
  }

  // 全ソースURLの取得
  static async getAllSourceUrls(daysBack: number = 7) {
    return this.extract({
      type: 'sources',
      filters: {
        createdAt: {
          gte: new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)
        }
      }
    })
  }
}