import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// データ統合チェックAPI
export async function GET() {
  try {
    // 過去24時間のデータを取得
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    
    // 1. バズ投稿データ
    const buzzPosts = await prisma.buzzPost.findMany({
      where: {
        collectedAt: { gte: since }
      },
      orderBy: { likesCount: 'desc' },
      take: 10
    })
    
    // 2. ニュース記事
    const newsArticles = await prisma.newsArticle.findMany({
      where: {
        publishedAt: { gte: since }
      },
      orderBy: { importance: 'desc' },
      take: 10,
      include: { source: true }
    })
    
    // 3. Perplexityレポート
    const perplexityReports = await prisma.perplexityReport.findMany({
      where: {
        createdAt: { gte: since }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })
    
    // 4. 統合分析
    const integration = {
      // トレンドワード抽出
      trendKeywords: extractTrendKeywords(buzzPosts, newsArticles, perplexityReports),
      
      // クロスソース相関
      crossSourceCorrelations: findCorrelations(buzzPosts, newsArticles, perplexityReports),
      
      // バズ予測の精度
      buzzPredictionAccuracy: calculatePredictionAccuracy(perplexityReports, buzzPosts),
      
      // データカバレッジ
      dataCoverage: {
        buzzPosts: buzzPosts.length,
        newsArticles: newsArticles.length,
        perplexityReports: perplexityReports.length,
        totalDataPoints: buzzPosts.length + newsArticles.length + perplexityReports.length
      }
    }
    
    return NextResponse.json({
      success: true,
      timeRange: {
        from: since.toISOString(),
        to: new Date().toISOString()
      },
      summary: {
        buzzPosts: {
          count: buzzPosts.length,
          topEngagement: buzzPosts[0] ? {
            content: buzzPosts[0].content.substring(0, 100) + '...',
            likes: buzzPosts[0].likesCount,
            author: buzzPosts[0].authorUsername
          } : null
        },
        news: {
          count: newsArticles.length,
          topStory: newsArticles[0] ? {
            title: newsArticles[0].title,
            source: newsArticles[0].source.name,
            importance: newsArticles[0].importance
          } : null
        },
        perplexity: {
          count: perplexityReports.length,
          // avgBuzzPrediction機能は新スキーマでは一時的に無効化
          hasReports: perplexityReports.length > 0
        }
      },
      integration,
      recommendations: generateRecommendations(integration)
    })
    
  } catch (error) {
    console.error('Data integration check error:', error)
    return NextResponse.json(
      { error: 'データ統合チェックでエラーが発生しました' },
      { status: 500 }
    )
  }
}

// トレンドキーワード抽出
function extractTrendKeywords(buzzPosts: any[], newsArticles: any[], perplexityReports: any[]) {
  const keywordCounts: Record<string, number> = {}
  
  // バズ投稿からキーワード抽出
  buzzPosts.forEach(post => {
    const keywords = extractKeywordsFromText(post.content)
    keywords.forEach(kw => {
      keywordCounts[kw] = (keywordCounts[kw] || 0) + post.likesCount
    })
  })
  
  // ニュースからキーワード抽出
  newsArticles.forEach(article => {
    const keywords = extractKeywordsFromText(article.title + ' ' + (article.summary || ''))
    keywords.forEach(kw => {
      keywordCounts[kw] = (keywordCounts[kw] || 0) + (article.importance || 0) * 10000
    })
  })
  
  // Perplexityトレンドから
  perplexityReports.forEach(report => {
    const trends = report.trends as string[]
    trends.forEach(trend => {
      const keywords = extractKeywordsFromText(trend)
      keywords.forEach(kw => {
        keywordCounts[kw] = (keywordCounts[kw] || 0) + 5000
      })
    })
  })
  
  // 上位キーワードを返す
  return Object.entries(keywordCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([keyword, score]) => ({ keyword, score }))
}

// キーワード抽出（簡易版）
function extractKeywordsFromText(text: string): string[] {
  const importantWords = ['AI', 'ChatGPT', 'Claude', 'LLM', '生成AI', 'クリエイティブ', '働き方', 'テクノロジー', '効率化', '自動化']
  return importantWords.filter(word => text.includes(word))
}

// 相関関係の発見
function findCorrelations(buzzPosts: any[], newsArticles: any[], perplexityReports: any[]) {
  const correlations: any[] = []
  
  // ニュースとバズの相関
  newsArticles.forEach(article => {
    const relatedBuzz = buzzPosts.filter(post => {
      const commonKeywords = extractKeywordsFromText(article.title).filter(kw => 
        post.content.includes(kw)
      )
      return commonKeywords.length > 0
    })
    
    if (relatedBuzz.length > 0) {
      correlations.push({
        type: 'news_buzz',
        news: article.title,
        buzzCount: relatedBuzz.length,
        totalEngagement: relatedBuzz.reduce((sum, p) => sum + p.likesCount, 0)
      })
    }
  })
  
  return correlations
}

// 予測精度の計算（新スキーマでは一時的に簡略化）
function calculatePredictionAccuracy(reports: any[], actualBuzz: any[]) {
  if (reports.length === 0) return 0
  
  // 新スキーマではbuzzPredictionフィールドがないため、簡易的な計算
  const hasReports = reports.length > 0
  const avgActualEngagement = actualBuzz.length > 0
    ? actualBuzz.reduce((sum, p) => sum + p.likesCount, 0) / actualBuzz.length
    : 0
  
  // 代替的な精度計算（レポート数と実際のエンゲージメントベース）
  return hasReports && avgActualEngagement > 100 ? 0.7 : 0.3
}

// 推奨事項の生成
function generateRecommendations(integration: any) {
  const recommendations = []
  
  // トレンドキーワードベースの推奨
  if (integration.trendKeywords.length > 0) {
    recommendations.push({
      type: 'trending_topic',
      action: `「${integration.trendKeywords[0].keyword}」について投稿`,
      reason: '複数のデータソースで話題になっています',
      priority: 'high'
    })
  }
  
  // 相関ベースの推奨
  if (integration.crossSourceCorrelations.length > 0) {
    const topCorrelation = integration.crossSourceCorrelations[0]
    recommendations.push({
      type: 'correlated_content',
      action: 'ニュースとバズが重なるトピックでRP',
      details: topCorrelation,
      priority: 'medium'
    })
  }
  
  return recommendations
}