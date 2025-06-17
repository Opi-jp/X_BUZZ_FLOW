import { NextResponse } from 'next/server'
import { prisma } from '@/lib/generated/prisma'
import { withErrorHandling } from '@/lib/api/error-handler'
import { subDays } from 'date-fns'

// データエクスプローラーAPI
export const GET = withErrorHandling(async (request: Request) => {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || ''
  const type = searchParams.get('type') || 'all'
  const range = searchParams.get('range') || '7d'
  
  try {
    // 日付範囲を計算
    let dateFilter = {}
    if (range !== 'all') {
      const days = range === '1d' ? 1 : range === '7d' ? 7 : 30
      dateFilter = {
        createdAt: { gte: subDays(new Date(), days) }
      }
    }
    
    const items: any[] = []
    
    // トピックを検索
    if (type === 'all' || type === 'topic') {
      const sessions = await prisma.viralSession.findMany({
        where: {
          AND: [
            dateFilter,
            query ? {
              OR: [
                { theme: { contains: query, mode: 'insensitive' } },
                { topics: { string_contains: query } }
              ]
            } : {}
          ]
        },
        take: 20,
        orderBy: { createdAt: 'desc' }
      })
      
      // トピックを抽出
      sessions.forEach(session => {
        if (session.topics && typeof session.topics === 'object') {
          const topics = (session.topics as any).parsed || []
          topics.forEach((topic: any) => {
            items.push({
              id: `topic-${session.id}-${topic.TOPIC}`,
              type: 'topic',
              title: topic.TOPIC,
              description: topic.DETAILS,
              metadata: {
                sessionId: session.id,
                theme: session.theme,
                sentiment: topic.SENTIMENT,
                source: topic.SOURCE
              },
              createdAt: session.createdAt,
              performance: {
                score: topic.EXCITEMENT || 0
              }
            })
          })
        }
      })
    }
    
    // コンセプトを検索
    if (type === 'all' || type === 'concept') {
      const sessions = await prisma.viralSession.findMany({
        where: {
          AND: [
            dateFilter,
            { concepts: { not: null } },
            query ? {
              OR: [
                { theme: { contains: query, mode: 'insensitive' } },
                { concepts: { string_contains: query } }
              ]
            } : {}
          ]
        },
        take: 20,
        orderBy: { createdAt: 'desc' }
      })
      
      // コンセプトを抽出
      sessions.forEach(session => {
        if (session.concepts && Array.isArray(session.concepts)) {
          (session.concepts as any[]).forEach((concept, index) => {
            items.push({
              id: `concept-${session.id}-${index}`,
              type: 'concept',
              title: concept.title || concept.hook,
              description: concept.angle,
              metadata: {
                sessionId: session.id,
                format: concept.format,
                viralPotential: concept.viralPotential
              },
              createdAt: session.createdAt,
              performance: {
                score: concept.viralPotential?.score || 0
              }
            })
          })
        }
      })
    }
    
    // ニュース記事を検索
    if (type === 'all' || type === 'news') {
      const articles = await prisma.newsArticle.findMany({
        where: {
          AND: [
            dateFilter,
            query ? {
              OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
                { category: { contains: query, mode: 'insensitive' } }
              ]
            } : {}
          ]
        },
        take: 20,
        orderBy: { publishedAt: 'desc' },
        include: {
          analysis: true
        }
      })
      
      articles.forEach(article => {
        items.push({
          id: `news-${article.id}`,
          type: 'news',
          title: article.title,
          description: article.description || article.analysis?.summary,
          metadata: {
            url: article.url,
            category: article.category,
            source: article.sourceId,
            keywords: article.analysis?.keywords
          },
          createdAt: article.publishedAt,
          performance: {
            score: article.importance || 0
          }
        })
      })
    }
    
    // ソース（Perplexity検索結果など）を検索
    if (type === 'all' || type === 'source') {
      // CoTフェーズから抽出
      const cotPhases = await prisma.cotPhase.findMany({
        where: {
          AND: [
            dateFilter,
            { executeResult: { not: null } },
            query ? {
              executeResult: { string_contains: query }
            } : {}
          ]
        },
        take: 10,
        orderBy: { createdAt: 'desc' }
      })
      
      cotPhases.forEach(phase => {
        const result = phase.executeResult as any
        if (result?.savedPerplexityResponses) {
          result.savedPerplexityResponses.forEach((response: any, index: number) => {
            items.push({
              id: `source-${phase.id}-${index}`,
              type: 'source',
              title: response.query || 'Perplexity検索結果',
              description: response.content?.substring(0, 200),
              metadata: {
                phaseId: phase.id,
                sessionId: phase.sessionId,
                sources: response.sources
              },
              createdAt: phase.createdAt,
              performance: {
                score: 0.5
              }
            })
          })
        }
      })
    }
    
    // スコアでソート
    items.sort((a, b) => {
      const scoreA = a.performance?.score || 0
      const scoreB = b.performance?.score || 0
      return scoreB - scoreA
    })
    
    return {
      items: items.slice(0, 50), // 最大50件
      total: items.length,
      query,
      type,
      range
    }
    
  } catch (error) {
    console.error('Data explore error:', error)
    throw error
  }
}, {
  requiredEnvVars: ['DATABASE_URL']
})