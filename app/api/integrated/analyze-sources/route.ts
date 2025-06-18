import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { geminiAnalyzer } from '@/lib/gemini'

/**
 * 統合ソース分析API - ニュース記事とバズ投稿を横断分析
 * 
 * POST /api/integrated/analyze-sources
 * {
 *   "timeframe": "24h",           // 分析期間
 *   "includeNews": true,          // ニュース記事を含める
 *   "includeBuzz": true,          // バズ投稿を含める  
 *   "minImportance": 0.7,         // 最小重要度
 *   "minEngagement": 1000         // 最小エンゲージメント
 * }
 */

interface AnalyzeSourcesRequest {
  timeframe?: string
  includeNews?: boolean
  includeBuzz?: boolean
  minImportance?: number
  minEngagement?: number
}

export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeSourcesRequest = await request.json()
    
    const {
      timeframe = '24h',
      includeNews = true,
      includeBuzz = true,
      minImportance = 0.7,
      minEngagement = 1000
    } = body

    // 期間を計算
    const now = new Date()
    const timeframeMs = timeframe === '72h' ? 72 * 60 * 60 * 1000 :
                       timeframe === '24h' ? 24 * 60 * 60 * 1000 :
                       timeframe === '12h' ? 12 * 60 * 60 * 1000 :
                       timeframe === '6h' ? 6 * 60 * 60 * 1000 :
                       timeframe === '7d' ? 7 * 24 * 60 * 60 * 1000 :
                       24 * 60 * 60 * 1000 // デフォルト24時間
    
    const since = new Date(now.getTime() - timeframeMs)
    
    console.log(`[ANALYZE] Timeframe: ${timeframe}, Since: ${since.toISOString()}, Now: ${now.toISOString()}`)

    // 並列でデータ取得
    const [newsArticles, buzzPosts] = await Promise.all([
      // 高重要度ニュース記事取得
      includeNews ? prisma.newsArticle.findMany({
        where: {
          publishedAt: { gte: since },
          importance: { gte: minImportance },
          processed: true
        },
        select: {
          id: true,
          title: true,
          url: true,
          publishedAt: true,
          importance: true,
          category: true,
          source: {
            select: {
              name: true
            }
          }
        },
        orderBy: { importance: 'desc' },
        take: 20
      }) : [],

      // 高エンゲージメントバズ投稿取得
      includeBuzz ? prisma.buzzPost.findMany({
        where: {
          postedAt: { gte: since },
          OR: [
            { likesCount: { gte: minEngagement } },
            { retweetsCount: { gte: Math.floor(minEngagement / 10) } }
          ]
        },
        orderBy: [
          { likesCount: 'desc' },
          { retweetsCount: 'desc' }
        ],
        take: 20
      }) : []
    ])

    // キーワード抽出と分析
    const newsKeywords = new Map<string, number>()
    const buzzKeywords = new Map<string, number>()
    const combinedKeywords = new Map<string, number>()

    // ニュース記事からキーワード抽出
    newsArticles.forEach(article => {
      // タイトルから簡易キーワード抽出
      if (article.title) {
        const titleWords = article.title.split(/\s+/).filter(word => word.length > 2)
        titleWords.forEach(word => {
          newsKeywords.set(word, (newsKeywords.get(word) || 0) + 1)
          combinedKeywords.set(word, (combinedKeywords.get(word) || 0) + 0.5)
        })
      }
    })

    // バズ投稿からキーワード抽出
    buzzPosts.forEach(post => {
      // ハッシュタグからキーワード抽出
      if (post.hashtags && Array.isArray(post.hashtags)) {
        (post.hashtags as string[]).forEach(hashtag => {
          buzzKeywords.set(hashtag, (buzzKeywords.get(hashtag) || 0) + 1)
          combinedKeywords.set(hashtag, (combinedKeywords.get(hashtag) || 0) + 2) // バズ投稿は重み付け
        })
      }
      
      // コンテンツからキーワード抽出（簡易版）
      const contentWords = post.content.split(/\s+/).filter(word => 
        word.length > 2 && !word.startsWith('@') && !word.startsWith('http')
      )
      contentWords.forEach(word => {
        const cleanWord = word.replace(/[^\w\p{L}]/gu, '').toLowerCase()
        if (cleanWord.length > 2) {
          buzzKeywords.set(cleanWord, (buzzKeywords.get(cleanWord) || 0) + 0.3)
          combinedKeywords.set(cleanWord, (combinedKeywords.get(cleanWord) || 0) + 0.3)
        }
      })
    })

    // トレンドキーワードの特定（両方で言及されるもの）
    const trendingTopics = Array.from(combinedKeywords.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([keyword, count]) => ({
        keyword,
        frequency: count,
        inNews: newsKeywords.has(keyword),
        inBuzz: buzzKeywords.has(keyword),
        crossMentioned: newsKeywords.has(keyword) && buzzKeywords.has(keyword)
      }))

    // 🤖 Gemini AI分析による高度な推奨
    console.log('🤖 Starting Gemini cross-analysis...')
    const geminiAnalysis = await geminiAnalyzer.analyzeCrossCorrelation(
      newsArticles.slice(0, 5), // 上位5件のニュース
      buzzPosts.slice(0, 5)     // 上位5件のバズ投稿
    )

    // Gemini分析結果をマージ
    const recommendations = [...geminiAnalysis.contentRecommendations.map(rec => ({
      type: rec.type,
      priority: rec.expectedEngagement > 0.8 ? 'high' : 'medium',
      title: rec.title,
      description: rec.strategy,
      suggestedStrategy: rec.type,
      aiGenerated: true,
      confidence: rec.expectedEngagement
    }))]

    // 交差キーワードがある場合の推奨
    const crossKeywords = trendingTopics.filter(t => t.crossMentioned)
    if (crossKeywords.length > 0) {
      recommendations.push({
        type: 'cross_topic',
        priority: 'high',
        title: 'ニュース×バズのクロストピック',
        description: `「${crossKeywords[0].keyword}」など共通のトピックで強力なコンテンツが作成できます`,
        keywords: crossKeywords.map(k => k.keyword),
        suggestedStrategy: 'hybrid',
        aiGenerated: false
      })
    }

    // 高インポータンスニュースの推奨
    const topNews = newsArticles.slice(0, 3)
    if (topNews.length > 0) {
      recommendations.push({
        type: 'news_driven',
        priority: 'medium',
        title: '高重要度ニュースベース',
        description: '重要なニュースを元にタイムリーなコンテンツを作成',
        articles: topNews.map(a => ({ id: a.id, title: a.title, importance: a.importance })),
        suggestedStrategy: 'news_viral',
        aiGenerated: false
      })
    }

    // 高エンゲージメントバズの推奨
    const topBuzz = buzzPosts.slice(0, 3)
    if (topBuzz.length > 0) {
      recommendations.push({
        type: 'buzz_driven',
        priority: 'medium',
        title: 'バズパターン活用',
        description: 'エンゲージメントの高い投稿パターンを活用',
        posts: topBuzz.map(p => ({ 
          id: p.id, 
          content: p.content.substring(0, 100) + '...', 
          engagement: p.likesCount + p.retweetsCount + p.repliesCount 
        })),
        suggestedStrategy: 'buzz_viral',
        aiGenerated: false
      })
    }

    // 統計情報
    const stats = {
      analysisTimeframe: timeframe,
      newsArticlesFound: newsArticles.length,
      buzzPostsFound: buzzPosts.length,
      uniqueKeywords: combinedKeywords.size,
      crossKeywords: crossKeywords.length,
      recommendations: recommendations.length,
      avgNewsImportance: newsArticles.length > 0 ? 
        newsArticles.reduce((sum, a) => sum + (a.importance || 0), 0) / newsArticles.length : 0,
      avgBuzzEngagement: buzzPosts.length > 0 ?
        buzzPosts.reduce((sum, p) => sum + p.likesCount + p.retweetsCount + p.repliesCount, 0) / buzzPosts.length : 0
    }

    return NextResponse.json({
      success: true,
      stats,
      newsArticles: newsArticles.map(article => ({
        id: article.id,
        title: article.title,
        url: article.url,
        publishedAt: article.publishedAt,
        importance: article.importance,
        category: article.category,
        source: article.source.name,
        keywords: [],
        summary: article.title // titleを要約として使用
      })),
      buzzPosts: buzzPosts.map(post => ({
        id: post.id,
        content: post.content,
        author: post.authorUsername,
        postedAt: post.postedAt,
        likes: post.likesCount,
        retweets: post.retweetsCount,
        replies: post.repliesCount,
        impressions: post.impressionsCount,
        hashtags: post.hashtags,
        engagementRate: post.impressionsCount > 0 ? 
          ((post.likesCount + post.retweetsCount + post.repliesCount) / post.impressionsCount * 100) : 0
      })),
      trendingTopics,
      recommendations,
      aiAnalysis: {
        correlations: geminiAnalysis.correlations,
        aiTrendingTopics: geminiAnalysis.trendingTopics,
        summary: geminiAnalysis.summary,
        powered: 'Google Gemini AI'
      }
    })

  } catch (error) {
    console.error('Error in analyze-sources:', error)
    return NextResponse.json(
      { 
        error: 'Failed to analyze sources', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}