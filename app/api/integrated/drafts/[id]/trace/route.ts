import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * 下書きトレーサビリティAPI
 * 下書きの生成元ソース・コンセプト・戦略を詳細に追跡
 * 
 * GET /api/integrated/drafts/[id]/trace
 */

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const draftId = params.id

    // 下書きの詳細情報を取得
    const draft = await prisma.integratedDraft.findUnique({
      where: { id: draftId },
      include: {
        session: {
          include: {
            sources: {
              include: {
                source: true
              }
            },
            v2Session: true
          }
        },
        performance: true
      }
    })

    if (!draft) {
      return NextResponse.json(
        { error: 'Draft not found' },
        { status: 404 }
      )
    }

    // 元ニュース記事の取得
    const sourceNews = draft.sourceNewsIds.length > 0 ? 
      await prisma.newsArticle.findMany({
        where: { id: { in: draft.sourceNewsIds } },
        include: {
          source: true,
          analysis: true
        }
      }) : []

    // 元バズ投稿の取得
    const sourceBuzz = draft.sourceBuzzIds.length > 0 ?
      await prisma.buzzPost.findMany({
        where: { id: { in: draft.sourceBuzzIds } }
      }) : []

    // 統合ソースの詳細情報
    const unifiedSources = await Promise.all(
      draft.session.sources.map(async (sessionSource) => {
        const source = sessionSource.source
        let detailData = null

        // ソースタイプに応じて詳細データを取得
        if (source.sourceType === 'news') {
          detailData = await prisma.newsArticle.findUnique({
            where: { id: source.sourceId },
            include: { source: true, analysis: true }
          })
        } else if (source.sourceType === 'buzz_post') {
          detailData = await prisma.buzzPost.findUnique({
            where: { id: source.sourceId }
          })
        }

        return {
          unifiedSource: source,
          sessionUsage: {
            relevanceScore: sessionSource.relevanceScore,
            usageType: sessionSource.usageType
          },
          detailData
        }
      })
    )

    // パフォーマンス分析
    const performanceAnalysis = draft.performance ? {
      totalEngagement: {
        '30m': (draft.performance.likes30m || 0) + (draft.performance.retweets30m || 0) + (draft.performance.replies30m || 0),
        '1h': (draft.performance.likes1h || 0) + (draft.performance.retweets1h || 0) + (draft.performance.replies1h || 0),
        '24h': (draft.performance.likes24h || 0) + (draft.performance.retweets24h || 0) + (draft.performance.replies24h || 0)
      },
      engagementRate: draft.performance.engagementRate,
      viralCoefficient: draft.performance.viralCoefficient,
      predictionAccuracy: draft.performance.predictionAccuracy
    } : null

    // ソース効果分析
    const sourceEffectiveness = {
      newsImpact: sourceNews.length > 0 ? {
        totalImportance: sourceNews.reduce((sum, news) => sum + (news.importance || 0), 0) / sourceNews.length,
        categories: [...new Set(sourceNews.map(n => n.category).filter(Boolean))],
        avgAge: sourceNews.length > 0 ? 
          (Date.now() - sourceNews.reduce((sum, news) => sum + news.publishedAt.getTime(), 0) / sourceNews.length) / (1000 * 60 * 60 * 24) : 0
      } : null,
      
      buzzImpact: sourceBuzz.length > 0 ? {
        totalEngagement: sourceBuzz.reduce((sum, buzz) => sum + buzz.likesCount + buzz.retweetsCount + buzz.repliesCount, 0),
        avgEngagementRate: sourceBuzz.reduce((sum, buzz) => {
          const rate = buzz.impressionsCount > 0 ? 
            (buzz.likesCount + buzz.retweetsCount + buzz.repliesCount) / buzz.impressionsCount : 0
          return sum + rate
        }, 0) / sourceBuzz.length,
        topHashtags: extractTopHashtags(sourceBuzz)
      } : null
    }

    // 生成戦略の分析
    const strategyAnalysis = {
      strategy: draft.generationStrategy,
      contentType: draft.contentType,
      hook: draft.hook,
      angle: draft.angle,
      keyFactors: analyzeKeyFactors(draft, sourceNews, sourceBuzz),
      successFactors: identifySuccessFactors(draft, performanceAnalysis)
    }

    // トレーサビリティレポート
    const traceabilityReport = {
      draftInfo: {
        id: draft.id,
        title: draft.title,
        status: draft.status,
        createdAt: draft.createdAt,
        postedAt: draft.postedAt,
        viralScore: draft.viralScore
      },
      
      generationContext: {
        sessionId: draft.sessionId,
        sessionType: draft.session.sessionType,
        theme: draft.session.theme,
        character: draft.session.character,
        platform: draft.session.platform,
        strategy: draft.session.strategy
      },

      sourceBreakdown: {
        totalSources: unifiedSources.length,
        newsSources: sourceNews.length,
        buzzSources: sourceBuzz.length,
        sourceDetails: unifiedSources.map(us => ({
          id: us.unifiedSource.id,
          type: us.unifiedSource.sourceType,
          summary: us.unifiedSource.contentSummary,
          importance: us.unifiedSource.importanceScore,
          viralPotential: us.unifiedSource.viralPotential,
          relevance: us.sessionUsage.relevanceScore,
          usage: us.sessionUsage.usageType,
          keywords: us.unifiedSource.keywords
        }))
      },

      directSources: {
        newsArticles: sourceNews.map(news => ({
          id: news.id,
          title: news.title,
          importance: news.importance,
          category: news.category,
          publishedAt: news.publishedAt,
          source: news.source.name,
          keywords: news.analysis?.keywords || []
        })),
        buzzPosts: sourceBuzz.map(buzz => ({
          id: buzz.id,
          content: buzz.content.substring(0, 200) + '...',
          author: buzz.authorUsername,
          engagement: {
            likes: buzz.likesCount,
            retweets: buzz.retweetsCount,
            replies: buzz.repliesCount
          },
          postedAt: buzz.postedAt,
          hashtags: buzz.hashtags
        }))
      },

      contentAnalysis: {
        concept: draft.conceptId ? {
          id: draft.conceptId,
          hook: draft.hook,
          angle: draft.angle
        } : null,
        generation: draft.generationData,
        hashtags: draft.hashtags,
        visualGuide: draft.visualGuide
      },

      performanceAnalysis,
      sourceEffectiveness,
      strategyAnalysis,

      insights: {
        mostInfluentialSource: findMostInfluentialSource(unifiedSources, performanceAnalysis),
        keySuccessFactors: strategyAnalysis.successFactors,
        improvementSuggestions: generateImprovementSuggestions(draft, sourceEffectiveness, performanceAnalysis)
      }
    }

    return NextResponse.json({
      success: true,
      trace: traceabilityReport
    })

  } catch (error) {
    console.error('Error in draft trace:', error)
    return NextResponse.json(
      { 
        error: 'Failed to trace draft', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

// ヘルパー関数

function extractTopHashtags(buzzPosts: any[]): string[] {
  const hashtagCounts = new Map<string, number>()
  
  buzzPosts.forEach(post => {
    if (post.hashtags && Array.isArray(post.hashtags)) {
      (post.hashtags as string[]).forEach(tag => {
        hashtagCounts.set(tag, (hashtagCounts.get(tag) || 0) + 1)
      })
    }
  })
  
  return Array.from(hashtagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag)
}

function analyzeKeyFactors(draft: any, sourceNews: any[], sourceBuzz: any[]): string[] {
  const factors = []
  
  if (sourceNews.length > 0) {
    factors.push(`${sourceNews.length}件のニュース記事を活用`)
    if (sourceNews.some(n => n.importance > 0.8)) {
      factors.push('高重要度ニュースを含む')
    }
  }
  
  if (sourceBuzz.length > 0) {
    factors.push(`${sourceBuzz.length}件のバズ投稿を参考`)
    const totalEngagement = sourceBuzz.reduce((sum, b) => sum + b.likesCount + b.retweetsCount, 0)
    if (totalEngagement > 10000) {
      factors.push('高エンゲージメント投稿を含む')
    }
  }
  
  if (draft.hook) {
    factors.push('効果的なフック使用')
  }
  
  if (draft.angle) {
    factors.push('独自のアングル設定')
  }
  
  return factors
}

function identifySuccessFactors(draft: any, performanceAnalysis: any): string[] {
  const factors = []
  
  if (!performanceAnalysis) {
    return ['パフォーマンスデータ未取得']
  }
  
  if (performanceAnalysis.engagementRate > 0.05) {
    factors.push('高エンゲージメント率達成')
  }
  
  if (performanceAnalysis.viralCoefficient > 0.8) {
    factors.push('バイラル拡散成功')
  }
  
  if (performanceAnalysis.totalEngagement['24h'] > performanceAnalysis.totalEngagement['1h'] * 2) {
    factors.push('持続的な拡散')
  }
  
  return factors.length > 0 ? factors : ['標準的なパフォーマンス']
}

function findMostInfluentialSource(unifiedSources: any[], performanceAnalysis: any): any {
  if (unifiedSources.length === 0) return null
  
  // 関連度とバイラル可能性の組み合わせで評価
  return unifiedSources.reduce((best, current) => {
    const currentScore = (current.unifiedSource.viralPotential || 0) * (current.sessionUsage.relevanceScore || 0)
    const bestScore = (best.unifiedSource.viralPotential || 0) * (best.sessionUsage.relevanceScore || 0)
    return currentScore > bestScore ? current : best
  })
}

function generateImprovementSuggestions(draft: any, sourceEffectiveness: any, performanceAnalysis: any): string[] {
  const suggestions = []
  
  if (!performanceAnalysis) {
    suggestions.push('パフォーマンスデータを収集して効果測定を行う')
    return suggestions
  }
  
  if (performanceAnalysis.engagementRate < 0.02) {
    suggestions.push('より魅力的なフックやビジュアル要素を追加')
  }
  
  if (sourceEffectiveness.newsImpact && sourceEffectiveness.newsImpact.avgAge > 3) {
    suggestions.push('より新鮮なニュースソースを活用')
  }
  
  if (sourceEffectiveness.buzzImpact && sourceEffectiveness.buzzImpact.avgEngagementRate < 0.03) {
    suggestions.push('より高エンゲージメントのバズ投稿を参考にする')
  }
  
  if (!draft.hashtags || draft.hashtags.length < 3) {
    suggestions.push('効果的なハッシュタグを追加')
  }
  
  return suggestions.length > 0 ? suggestions : ['現在の戦略を継続']
}