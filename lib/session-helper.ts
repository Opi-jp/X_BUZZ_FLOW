import { DataStore } from './data-store'
import { prisma } from './prisma'

// セッションヘルパー - データの再利用を簡単に

export class SessionHelper {
  // 新しいセッションを既存データで初期化
  static async createWithExistingData(params: {
    theme: string
    platform: string
    style: string
    reuseTopics?: boolean
    reuseConcepts?: boolean
  }) {
    // 新しいセッションを作成
    const session = await prisma.viralSession.create({
      data: {
        theme: params.theme,
        platform: params.platform,
        style: params.style,
        status: 'CREATED'
      }
    })

    let updatedData: any = {}

    // トピックの再利用
    if (params.reuseTopics) {
      const latestTopics = await DataStore.getLatestTopics(params.theme)
      if (latestTopics) {
        updatedData.topics = latestTopics.topics
        updatedData.status = 'TOPICS_COLLECTED'
      }
    }

    // コンセプトの再利用
    if (params.reuseConcepts && updatedData.topics) {
      const latestConcepts = await DataStore.getLatestConcepts(params.theme)
      if (latestConcepts) {
        updatedData.concepts = latestConcepts.concepts
        updatedData.status = 'CONCEPTS_GENERATED'
      }
    }

    // データがあれば更新
    if (Object.keys(updatedData).length > 0) {
      await prisma.viralSession.update({
        where: { id: session.id },
        data: updatedData
      })
    }

    return {
      session,
      reused: {
        topics: !!updatedData.topics,
        concepts: !!updatedData.concepts
      }
    }
  }

  // セッションの次のステップに必要なデータを取得
  static async getNextStepData(sessionId: string) {
    const session = await prisma.viralSession.findUnique({
      where: { id: sessionId }
    })

    if (!session) return null

    // トピックがない場合
    if (!session.topics) {
      const candidates = await DataStore.getReusableCandidates(session.theme, 'topics')
      return {
        nextStep: 'collect-topics',
        reusableCandidates: candidates,
        recommendation: candidates.length > 0 ? 'reuse' : 'fetch-new'
      }
    }

    // コンセプトがない場合
    if (!session.concepts) {
      const candidates = await DataStore.getReusableCandidates(session.theme, 'concepts')
      return {
        nextStep: 'generate-concepts',
        reusableCandidates: candidates,
        recommendation: candidates.length > 0 ? 'consider-reuse' : 'generate-new'
      }
    }

    // 下書きがない場合
    const draftsCount = await prisma.viralDraftV2.count({
      where: { sessionId }
    })

    if (draftsCount === 0) {
      return {
        nextStep: 'generate-contents',
        conceptsAvailable: (session.concepts as any[]).length,
        recommendation: 'generate-new'
      }
    }

    return {
      nextStep: 'completed',
      draftsCount
    }
  }

  // 類似セッションを探す
  static async findSimilarSessions(theme: string, limit: number = 5) {
    const sessions = await prisma.viralSession.findMany({
      where: {
        theme,
        status: { in: ['CONCEPTS_GENERATED', 'CONTENTS_GENERATED', 'COMPLETED'] }
      },
      include: {
        _count: {
          select: { drafts: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    return sessions.map(s => ({
      id: s.id,
      createdAt: s.createdAt,
      hasTopics: !!s.topics,
      hasConcepts: !!s.concepts,
      draftsCount: s._count.drafts,
      status: s.status
    }))
  }
}