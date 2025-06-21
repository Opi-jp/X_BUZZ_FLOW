import { prisma } from '@/lib/prisma'

// データストアのインターフェース - DBから任意のデータを取得

export class DataStore {
  // 最新のトピックを取得（テーマ指定可能）
  static async getLatestTopics(theme?: string, limit: number = 3) {
    const session = await prisma.viral_sessions.findFirst({
      where: {
        topics: { not: null },
        ...(theme ? { theme } : {})
      },
      orderBy: { created_at: 'desc' }
    })
    
    if (!session || !session.topics) return null
    
    const topics = (session.topics as any).parsed || []
    return {
      sessionId: session.id,
      theme: session.theme,
      created_at: session.created_at,
      topics: topics.slice(0, limit)
    }
  }

  // 特定のセッションのトピックを取得
  static async getSessionTopics(sessionId: string) {
    const session = await prisma.viral_sessions.findUnique({
      where: { id: sessionId },
      select: { topics: true, theme: true }
    })
    
    if (!session || !session.topics) return null
    return (session.topics as any).parsed || []
  }

  // 任意のテーマ・期間のトピックを検索
  static async searchTopics(params: {
    theme?: string
    startDate?: Date
    endDate?: Date
    keyword?: string
  }) {
    const sessions = await prisma.viral_sessions.findMany({
      where: {
        topics: { not: null },
        ...(params.theme ? { theme: params.theme } : {}),
        created_at: {
          gte: params.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          lte: params.endDate || new Date()
        }
      },
      select: {
        id: true,
        theme: true,
        created_at: true,
        topics: true
      }
    })

    // トピックを展開してフィルタリング
    const allTopics: any[] = []
    sessions.forEach(session => {
      const topics = (session.topics as any).parsed || []
      topics.forEach((topic: any) => {
        if (!params.keyword || 
            topic.TOPIC?.includes(params.keyword) || 
            topic.summary?.includes(params.keyword)) {
          allTopics.push({
            sessionId: session.id,
            theme: session.theme,
            ...topic
          })
        }
      })
    })

    return allTopics
  }

  // 最新のコンセプトを取得
  static async getLatestConcepts(theme?: string, limit: number = 10) {
    const session = await prisma.viral_sessions.findFirst({
      where: {
        concepts: { not: null },
        ...(theme ? { theme } : {})
      },
      orderBy: { created_at: 'desc' }
    })
    
    if (!session || !session.concepts) return null
    
    const concepts = session.concepts as any[]
    return {
      sessionId: session.id,
      theme: session.theme,
      created_at: session.created_at,
      concepts: concepts.slice(0, limit)
    }
  }

  // 特定の角度のコンセプトを検索
  static async getConceptsByAngle(angle: string) {
    const sessions = await prisma.viral_sessions.findMany({
      where: { concepts: { not: null } },
      select: {
        id: true,
        theme: true,
        concepts: true
      }
    })

    const matchingConcepts: any[] = []
    sessions.forEach(session => {
      const concepts = session.concepts as any[]
      concepts.forEach(concept => {
        if (concept.angle === angle) {
          matchingConcepts.push({
            sessionId: session.id,
            theme: session.theme,
            ...concept
          })
        }
      })
    })

    return matchingConcepts
  }

  // キャラクター別の下書きを取得
  static async getDraftsByCharacter(character_id: string, limit: number = 10) {
    return await prisma.viral_drafts.findMany({
      where: { character_id },
      include: {
        viral_sessions: {
          select: {
            theme: true,
            platform: true
          }
        }
      },
      orderBy: { created_at: 'desc' },
      take: limit
    })
  }

  // パフォーマンスの良い下書きを取得（将来の実装用）
  static async getHighPerformanceDrafts(minEngagement: number = 100) {
    return await prisma.viral_drafts.findMany({
      where: {
        viral_draft_performance: {
          OR: [
            { likes_30m: { gte: minEngagement } },
            { likes_1h: { gte: minEngagement } },
            { likes_24h: { gte: minEngagement } }
          ]
        }
      },
      include: {
        viral_draft_performance: true,
        viral_sessions: {
          select: { theme: true }
        }
      },
      orderBy: { created_at: 'desc' }
    })
  }

  // 再利用可能なデータの候補を取得
  static async getReusableCandidates(theme: string, type: 'topics' | 'concepts') {
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24時間以内
    
    if (type === 'topics') {
      const sessions = await prisma.viral_sessions.findMany({
        where: {
          theme,
          topics: { not: null },
          created_at: { gte: cutoffDate }
        },
        select: {
          id: true,
          created_at: true,
          topics: true
        },
        orderBy: { created_at: 'desc' },
        take: 5
      })
      
      return sessions.map(s => ({
        sessionId: s.id,
        created_at: s.created_at,
        data: s.topics
      }))
    } else {
      const sessions = await prisma.viral_sessions.findMany({
        where: {
          theme,
          concepts: { not: null },
          created_at: { gte: cutoffDate }
        },
        select: {
          id: true,
          created_at: true,
          concepts: true,
          topics: true
        },
        orderBy: { created_at: 'desc' },
        take: 5
      })
      
      return sessions.map(s => ({
        sessionId: s.id,
        created_at: s.created_at,
        data: s.concepts,
        relatedTopics: s.topics
      }))
    }
  }
}