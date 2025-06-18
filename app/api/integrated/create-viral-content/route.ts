import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * 統合バイラルコンテンツ生成API
 * 
 * POST /api/integrated/create-viral-content
 * {
 *   "sourceType": "hybrid",       // news, buzz, hybrid
 *   "newsIds": ["news-1"],       // ニュース記事ID
 *   "buzzIds": ["buzz-1"],       // バズ投稿ID
 *   "character": "cardi_dare",    // キャラクター選択
 *   "platform": "Twitter",       // プラットフォーム
 *   "strategy": "trend_riding"    // 戦略タイプ
 * }
 */

interface CreateViralContentRequest {
  sourceType: 'news' | 'buzz' | 'hybrid'
  newsIds?: string[]
  buzzIds?: string[]
  character?: string
  platform?: string
  strategy?: string
  theme?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateViralContentRequest = await request.json()
    
    const {
      sourceType,
      newsIds = [],
      buzzIds = [],
      character = 'cardi_dare',
      platform = 'Twitter',
      strategy = 'trend_riding',
      theme
    } = body

    // 入力バリデーション
    if (!sourceType) {
      return NextResponse.json(
        { error: 'sourceType is required' },
        { status: 400 }
      )
    }

    if (sourceType === 'news' && newsIds.length === 0) {
      return NextResponse.json(
        { error: 'newsIds are required for news sourceType' },
        { status: 400 }
      )
    }

    if (sourceType === 'buzz' && buzzIds.length === 0) {
      return NextResponse.json(
        { error: 'buzzIds are required for buzz sourceType' },
        { status: 400 }
      )
    }

    if (sourceType === 'hybrid' && newsIds.length === 0 && buzzIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one newsId or buzzId is required for hybrid sourceType' },
        { status: 400 }
      )
    }

    // ソースデータの取得
    const [newsArticles, buzzPosts] = await Promise.all([
      newsIds.length > 0 ? prisma.newsArticle.findMany({
        where: { id: { in: newsIds } },
        include: {
          source: true,
          analysis: true
        }
      }) : [],
      buzzIds.length > 0 ? prisma.buzzPost.findMany({
        where: { id: { in: buzzIds } }
      }) : []
    ])

    // 存在チェック
    if (newsIds.length > 0 && newsArticles.length !== newsIds.length) {
      return NextResponse.json(
        { error: 'Some news articles not found' },
        { status: 404 }
      )
    }

    if (buzzIds.length > 0 && buzzPosts.length !== buzzIds.length) {
      return NextResponse.json(
        { error: 'Some buzz posts not found' },
        { status: 404 }
      )
    }

    // 統合セッションの作成
    const integratedSession = await prisma.integratedSession.create({
      data: {
        sessionType: sourceType,
        newsArticleIds: newsIds,
        buzzPostIds: buzzIds,
        theme: theme || generateThemeFromSources(newsArticles, buzzPosts),
        character,
        platform,
        strategy,
        status: 'created',
        currentStep: 'initializing',
        generationContext: {
          sourceType,
          newsCount: newsArticles.length,
          buzzCount: buzzPosts.length,
          totalSources: newsArticles.length + buzzPosts.length,
          strategy,
          platform,
          character,
          timestamp: new Date().toISOString()
        }
      }
    })

    // UnifiedContentSourcesに各ソースを登録
    const sourceCreations = []

    // ニュース記事をUnifiedContentSourceに登録
    for (const article of newsArticles) {
      sourceCreations.push(
        prisma.unifiedContentSource.create({
          data: {
            sourceType: 'news',
            sourceId: article.id,
            contentSummary: article.description || article.title,
            importanceScore: article.importance || 0.5,
            viralPotential: calculateNewsViralPotential(article),
            keywords: (article.analysis?.keywords as string[]) || extractKeywordsFromText(article.title),
            metadata: {
              title: article.title,
              url: article.url,
              source: article.source.name,
              publishedAt: article.publishedAt,
              category: article.category
            }
          }
        })
      )
    }

    // バズ投稿をUnifiedContentSourceに登録
    for (const post of buzzPosts) {
      sourceCreations.push(
        prisma.unifiedContentSource.create({
          data: {
            sourceType: 'buzz_post',
            sourceId: post.id,
            contentSummary: post.content.substring(0, 200),
            importanceScore: calculateBuzzImportance(post),
            viralPotential: calculateBuzzViralPotential(post),
            keywords: extractKeywordsFromBuzzPost(post),
            metadata: {
              author: post.authorUsername,
              likes: post.likesCount,
              retweets: post.retweetsCount,
              replies: post.repliesCount,
              impressions: post.impressionsCount,
              postedAt: post.postedAt,
              hashtags: post.hashtags
            }
          }
        })
      )
    }

    // 並列でソースを作成
    const createdSources = await Promise.all(sourceCreations)

    // IntegratedSessionSourcesに関連付け
    const sessionSourceCreations = createdSources.map((source, index) => {
      const isNews = index < newsArticles.length
      return prisma.integratedSessionSource.create({
        data: {
          sessionId: integratedSession.id,
          sourceId: source.id,
          relevanceScore: isNews ? 
            (newsArticles[index]?.importance || 0.5) : 
            calculateBuzzRelevance(buzzPosts[index - newsArticles.length]),
          usageType: 'primary'
        }
      })
    })

    await Promise.all(sessionSourceCreations)

    // V2セッションの作成準備（実際の生成はバックグラウンドで実行）
    const generationPayload = {
      integratedSessionId: integratedSession.id,
      sources: {
        news: newsArticles.map(a => ({
          id: a.id,
          title: a.title,
          content: a.description,
          importance: a.importance,
          keywords: (a.analysis?.keywords as string[]) || []
        })),
        buzz: buzzPosts.map(p => ({
          id: p.id,
          content: p.content,
          engagement: {
            likes: p.likesCount,
            retweets: p.retweetsCount,
            replies: p.repliesCount
          },
          hashtags: p.hashtags
        }))
      },
      strategy,
      character,
      platform,
      theme: integratedSession.theme
    }

    // バックグラウンドでV2コンテンツ生成を開始（非同期）
    // 実際の処理は別のワーカーで実行される
    await triggerBackgroundGeneration(integratedSession.id, generationPayload)

    // セッション状態を更新
    await prisma.integratedSession.update({
      where: { id: integratedSession.id },
      data: {
        status: 'analyzing',
        currentStep: 'content_generation',
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      sessionId: integratedSession.id,
      integratedSources: createdSources.length,
      sourceBreakdown: {
        news: newsArticles.length,
        buzz: buzzPosts.length
      },
      theme: integratedSession.theme,
      nextStep: `/api/integrated/sessions/${integratedSession.id}`,
      status: 'analyzing',
      estimatedCompletion: new Date(Date.now() + 2 * 60 * 1000), // 2分後
      generationContext: generationPayload
    })

  } catch (error) {
    console.error('Error in create-viral-content:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create viral content', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

// ヘルパー関数

function generateThemeFromSources(newsArticles: any[], buzzPosts: any[]): string {
  const keywords = new Set<string>()
  
  // ニュースからキーワード収集
  newsArticles.forEach(article => {
    if (article.analysis?.keywords) {
      (article.analysis.keywords as string[]).forEach(k => keywords.add(k))
    }
    // タイトルからも抽出
    extractKeywordsFromText(article.title).forEach(k => keywords.add(k))
  })
  
  // バズ投稿からキーワード収集
  buzzPosts.forEach(post => {
    extractKeywordsFromBuzzPost(post).forEach(k => keywords.add(k))
  })
  
  const keywordArray = Array.from(keywords).slice(0, 3)
  return keywordArray.length > 0 ? keywordArray.join(' × ') : 'トレンドトピック'
}

function calculateNewsViralPotential(article: any): number {
  // ニュースのバイラル可能性を計算
  let score = 0.5 // ベーススコア
  
  // 重要度が高いほどバイラル可能性も高い
  if (article.importance) {
    score += article.importance * 0.3
  }
  
  // 特定のカテゴリは話題になりやすい
  const viralCategories = ['technology', 'entertainment', 'sports', 'politics']
  if (article.category && viralCategories.includes(article.category.toLowerCase())) {
    score += 0.2
  }
  
  return Math.min(score, 1.0)
}

function calculateBuzzImportance(post: any): number {
  // バズ投稿の重要度を計算（エンゲージメントベース）
  const totalEngagement = post.likesCount + post.retweetsCount + post.repliesCount
  
  if (totalEngagement > 10000) return 1.0
  if (totalEngagement > 5000) return 0.8
  if (totalEngagement > 1000) return 0.6
  if (totalEngagement > 500) return 0.4
  return 0.2
}

function calculateBuzzViralPotential(post: any): number {
  // エンゲージメント率ベースでバイラル可能性を計算
  const engagementRate = post.impressionsCount > 0 ?
    (post.likesCount + post.retweetsCount + post.repliesCount) / post.impressionsCount : 0
  
  if (engagementRate > 0.1) return 1.0
  if (engagementRate > 0.05) return 0.8
  if (engagementRate > 0.02) return 0.6
  if (engagementRate > 0.01) return 0.4
  return 0.2
}

function calculateBuzzRelevance(post: any): number {
  // セッションでの関連度を計算
  return calculateBuzzImportance(post)
}

function extractKeywordsFromText(text: string): string[] {
  if (!text) return []
  
  // 簡易キーワード抽出（日本語対応）
  const words = text.split(/[\s\p{P}]+/u)
    .filter(word => word.length > 2)
    .filter(word => !/^[@#]/.test(word)) // メンション・ハッシュタグ除外
    .slice(0, 10)
  
  return words
}

function extractKeywordsFromBuzzPost(post: any): string[] {
  const keywords = new Set<string>()
  
  // ハッシュタグから抽出
  if (post.hashtags && Array.isArray(post.hashtags)) {
    (post.hashtags as string[]).forEach(tag => keywords.add(tag))
  }
  
  // コンテンツから抽出
  extractKeywordsFromText(post.content).forEach(word => keywords.add(word))
  
  return Array.from(keywords).slice(0, 10)
}

async function triggerBackgroundGeneration(sessionId: string, payload: any) {
  // 実際の実装では、ここでワーカーキューに追加
  // 今回はログ出力のみ
  console.log(`[INTEGRATED] Background generation triggered for session: ${sessionId}`)
  console.log(`[INTEGRATED] Payload:`, JSON.stringify(payload, null, 2))
  
  // TODO: 実際のバックグラウンド処理の実装
  // - V2システムとの連携
  // - キャラクター設定の適用
  // - コンテンツ生成の実行
}