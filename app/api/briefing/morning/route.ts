import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 朝のAI秘書：多様なデータソースを統合したブリーフィング
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      includePerplexity = true,
      includeNews = true, 
      includeBuzz = true,
      timeRange = '24h'
    } = body

    const briefing: any = {
      perplexityInsights: null,
      newsHighlights: [],
      buzzTrends: [],
      crossSourceInsights: [],
      actionableItems: [],
      personalizedTakeaways: []
    }

    // 1. 重要ニュースの抽出を先に実行（Perplexityで活用するため）
    if (includeNews) {
      const since = new Date(Date.now() - (timeRange === '24h' ? 24 : 6) * 60 * 60 * 1000)
      
      const newsArticles = await prisma.newsArticle.findMany({
        where: {
          publishedAt: { gte: since },
          OR: [
            { importance: { gte: 0.7 } },
            { title: { contains: 'AI', mode: 'insensitive' } },
            { title: { contains: 'クリエイティブ', mode: 'insensitive' } }
          ]
        },
        orderBy: [
          { importance: 'desc' },
          { publishedAt: 'desc' }
        ],
        take: 10,
        include: {
          source: true, // NewsSourceのデータも含める
          analysis: true // NewsAnalysisの詳細データも含める
        }
      })

      briefing.newsHighlights = newsArticles.map(article => ({
        id: article.id,
        title: article.title,
        source: article.source.name, // sourceの名前を使用
        importance: article.importance,
        summary: article.summary,
        url: article.url,
        publishedAt: article.publishedAt,
        category: article.category,
        // NewsAnalysisのデータを含める
        analysis: article.analysis ? {
          category: article.analysis.category,
          summary: article.analysis.summary,
          japaneseSummary: article.analysis.japaneseSummary,
          keyPoints: article.analysis.keyPoints,
          impact: article.analysis.impact
        } : null,
        // 互換性のため keyPoints も直接設定
        keyPoints: article.analysis?.keyPoints || [],
        japaneseSummary: article.analysis?.japaneseSummary || article.summary
      }))
    }

    // 2. Perplexityでリアルタイムトレンド分析（ニュースを含めて）
    if (includePerplexity) {
      try {
        // まず既存のレポートをDBから取得（1時間以内のもの）
        const recentReport = await prisma.perplexityReport.findFirst({
          where: {
            createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) }
          },
          orderBy: { createdAt: 'desc' }
        })

        if (recentReport) {
          // 既存のレポートを使用
          briefing.perplexityInsights = {
            reportId: recentReport.id,
            rawAnalysis: recentReport.rawAnalysis,
            structuredInsights: {
              trends: recentReport.trends as string[],
              insights: recentReport.insights as string[]
            },
            personalAngles: recentReport.personalAngles,
            buzzPrediction: recentReport.buzzPrediction,
            recommendations: recentReport.recommendations,
            metadata: recentReport.metadata,
            newsIntegrated: true,
            newsUsedCount: Math.min(briefing.newsHighlights.length, 5),
            fromCache: true
          }
        } else {
          // 新規でPerplexity分析を実行
          // 最新ニュースの詳細情報を含めたリッチなクエリを生成
          const newsContext = briefing.newsHighlights.length > 0
            ? `\n\n【最新ニュース】\n${briefing.newsHighlights.slice(0, 3).map((n: any) => 
                `- ${n.title}\n  要点: ${n.keyPoints?.slice(0, 2).join(', ') || ''}\n  重要度: ${(n.importance * 100).toFixed(0)}%`
              ).join('\n')}`
            : ''
          
          const perplexityQuery = `AI クリエイティブ 働き方 テクノロジー 最新トレンド 2025年1月${newsContext}`
          
          const baseUrl = process.env.NEXTAUTH_URL || 'https://x-buzz-flow.vercel.app'
          const perplexityResponse = await fetch(`${baseUrl}/api/perplexity/trends`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: perplexityQuery,
              focus: 'creative_ai_comprehensive',
              newsContext: briefing.newsHighlights.slice(0, 5) // ニュースコンテキストを追加
            })
          })

          if (perplexityResponse.ok) {
            const perplexityData = await perplexityResponse.json()
            briefing.perplexityInsights = {
              ...perplexityData,
              newsIntegrated: true,
              newsUsedCount: Math.min(briefing.newsHighlights.length, 5),
              fromCache: false
            }
          }
        }
      } catch (error) {
        console.warn('Perplexity API error:', error)
      }
    }

    // 3. バズツイートのトレンド分析
    if (includeBuzz) {
      const buzzPosts = await prisma.buzzPost.findMany({
        where: {
          postedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          likesCount: { gte: 1000 }
        },
        orderBy: { likesCount: 'desc' },
        take: 20
      })

      // テーマ別にグループ化
      const themes = ['AI', 'クリエイティブ', '働き方', 'テクノロジー', '50代', 'キャリア']
      const trendsByTheme: Record<string, any> = {}

      for (const theme of themes) {
        const themePosts = buzzPosts.filter(post => 
          post.content.toLowerCase().includes(theme.toLowerCase()) ||
          post.theme?.includes(theme)
        )
        
        if (themePosts.length > 0) {
          trendsByTheme[theme] = {
            count: themePosts.length,
            topPost: themePosts[0],
            totalEngagement: themePosts.reduce((sum, post) => 
              sum + post.likesCount + post.retweetsCount, 0
            )
          }
        }
      }

      briefing.buzzTrends = Object.entries(trendsByTheme).map(([theme, data]) => ({
        theme,
        ...data
      }))
    }

    // 4. データソース横断でのインサイト発見
    briefing.crossSourceInsights = await generateCrossSourceInsights(
      briefing.perplexityInsights,
      briefing.newsHighlights,
      briefing.buzzTrends
    )

    // 5. あなた専用のアクション提案
    briefing.actionableItems = await generateActionableItems(briefing)

    // 6. パーソナライズされた要点
    briefing.personalizedTakeaways = await generatePersonalizedTakeaways(briefing)

    return NextResponse.json({
      success: true,
      briefing,
      metadata: {
        generatedAt: new Date().toISOString(),
        dataSourcesUsed: {
          perplexity: !!briefing.perplexityInsights,
          news: briefing.newsHighlights.length > 0,
          buzz: briefing.buzzTrends.length > 0
        },
        totalDataPoints: 
          briefing.newsHighlights.length + 
          briefing.buzzTrends.length + 
          (briefing.perplexityInsights?.structuredInsights?.trends?.length || 0)
      }
    })

  } catch (error) {
    console.error('Morning briefing error:', error)
    return NextResponse.json(
      { error: 'ブリーフィング生成でエラーが発生しました' },
      { status: 500 }
    )
  }
}

// データソース横断インサイト生成
async function generateCrossSourceInsights(perplexityData: any, newsData: any[], buzzData: any[]) {
  const insights = []

  // Perplexityトレンド × ニュース記事の関連性
  if (perplexityData?.structuredInsights?.trends) {
    for (const trend of perplexityData.structuredInsights.trends.slice(0, 3)) {
      const relatedNews = newsData.filter(news => 
        news.title.toLowerCase().includes(trend.toLowerCase().split(' ')[0])
      )
      
      if (relatedNews.length > 0) {
        insights.push({
          type: 'perplexity_news_connection',
          trend,
          relatedNews: relatedNews.slice(0, 2),
          insight: `Perplexityで注目の「${trend}」が、${relatedNews.length}件のニュースでも取り上げられています。`,
          actionSuggestion: `この話題について、あなたの23年の経験からの独自視点で投稿してみては？`
        })
      }
    }
  }

  // ニュース × バズツイートの相関
  for (const news of newsData.slice(0, 5)) {
    const relatedBuzz = buzzData.find(buzz => 
      buzz.topPost?.content.toLowerCase().includes(
        news.title.toLowerCase().split(' ')[0]
      )
    )
    
    if (relatedBuzz) {
      insights.push({
        type: 'news_buzz_correlation',
        news: {
          title: news.title,
          source: news.source
        },
        buzz: {
          theme: relatedBuzz.theme,
          engagement: relatedBuzz.totalEngagement
        },
        insight: `「${news.title}」のニュースが、Twitterでも${relatedBuzz.totalEngagement.toLocaleString()}のエンゲージメントで話題になっています。`,
        opportunity: 'この流れに乗ってRPするチャンス！'
      })
    }
  }

  return insights
}

// アクション提案生成
async function generateActionableItems(briefingData: any) {
  const actions = []

  // 緊急度の高いRP機会
  if (briefingData.buzzTrends.length > 0) {
    const topTrend = briefingData.buzzTrends[0]
    actions.push({
      type: 'urgent_rp',
      priority: 'high',
      action: `「${topTrend.theme}」のバズツイートにRP`,
      details: `@${topTrend.topPost?.authorUsername}の投稿（${topTrend.topPost?.likesCount.toLocaleString()}いいね）に独自視点でRP`,
      timeframe: '30分以内',
      url: topTrend.topPost?.url
    })
  }

  // Perplexityトレンドからの投稿提案
  if (briefingData.perplexityInsights?.personalAngles) {
    briefingData.perplexityInsights.personalAngles.slice(0, 2).forEach((angle: any) => {
      actions.push({
        type: 'original_post',
        priority: 'medium',
        action: `${angle.type}の視点で投稿`,
        details: angle.angle,
        template: angle.postTemplate,
        timeframe: '2時間以内'
      })
    })
  }

  // 重要ニュースからのスレッド作成提案
  if (briefingData.newsHighlights.length > 0) {
    const topNews = briefingData.newsHighlights[0]
    actions.push({
      type: 'news_thread',
      priority: 'medium',
      action: 'ニューススレッド作成',
      details: `「${topNews.title}」について、50代クリエイターの視点でスレッド作成`,
      timeframe: '1時間以内'
    })
  }

  return actions.sort((a, b) => {
    const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 }
    return priorityOrder[b.priority] - priorityOrder[a.priority]
  })
}

// パーソナライズされた要点生成
async function generatePersonalizedTakeaways(briefingData: any) {
  const takeaways = []

  // あなたの強みを活かせるポイント
  takeaways.push({
    category: 'your_advantage',
    title: '50代クリエイターの独自視点が活きるポイント',
    points: [
      '若者が注目する技術トレンドに対して、過去の経験から「本質」を語れる',
      'AI効率化の流れに対して「非効率の価値」という逆張り視点を提供できる',
      '長期的な業界変化の経験から、現在のトレンドの「持続性」を予測できる'
    ]
  })

  // 今日の戦略
  const topThemes = briefingData.buzzTrends.slice(0, 3).map((t: any) => t.theme)
  takeaways.push({
    category: 'today_strategy',
    title: '今日の投稿戦略',
    points: [
      `話題の${topThemes.join('、')}について、あなたの23年の経験から独自解釈`,
      'バズっている投稿に対して「経験者目線」でRP',
      '若者とは違う「長期視点」での未来予測を投稿'
    ]
  })

  // 差別化ポイント
  takeaways.push({
    category: 'differentiation',
    title: 'Z世代との差別化ポイント',
    points: [
      'アナログ時代の知識 × AI活用 = 独自の組み合わせ',
      '失敗の蓄積から来る「リスク予測能力」',
      '1990年代からの技術変革体験による「歴史的洞察力」'
    ]
  })

  return takeaways
}