import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDaysAgoJST, toUTC } from '@/lib/date-utils'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '7')
    
    // JST基準で過去N日前の日付を取得し、UTCに変換
    const dateFrom = toUTC(getDaysAgoJST(days))

    // バズ投稿を取得
    const buzzPosts = await prisma.buzzPost.findMany({
      where: {
        collectedAt: {
          gte: dateFrom,
        },
      },
      orderBy: { likesCount: 'desc' },
    })

    // テーマ別に集計
    const themeAnalytics = buzzPosts.reduce((acc, post) => {
      const theme = post.theme || 'その他'
      if (!acc[theme]) {
        acc[theme] = {
          theme,
          count: 0,
          totalLikes: 0,
          totalRetweets: 0,
          totalImpressions: 0,
          posts: []
        }
      }
      
      acc[theme].count++
      acc[theme].totalLikes += post.likesCount
      acc[theme].totalRetweets += post.retweetsCount
      acc[theme].totalImpressions += post.impressionsCount
      acc[theme].posts.push(post)
      
      return acc
    }, {} as Record<string, any>)

    // 平均値を計算してフォーマット
    const analytics = Object.values(themeAnalytics).map((theme: any) => ({
      theme: theme.theme,
      count: theme.count,
      avgLikes: Math.round(theme.totalLikes / theme.count),
      avgRetweets: Math.round(theme.totalRetweets / theme.count),
      avgImpressions: Math.round(theme.totalImpressions / theme.count),
      avgEngagementRate: theme.totalImpressions > 0 
        ? ((theme.totalLikes + theme.totalRetweets) / theme.totalImpressions * 100)
        : 0,
      topPosts: theme.posts
        .sort((a: any, b: any) => b.likesCount - a.likesCount)
        .slice(0, 5)
        .map((p: any) => ({
          id: p.id,
          content: p.content,
          authorUsername: p.authorUsername,
          likesCount: p.likesCount,
          retweetsCount: p.retweetsCount,
          impressionsCount: p.impressionsCount,
          engagementRate: p.impressionsCount > 0
            ? ((p.likesCount + p.retweetsCount) / p.impressionsCount * 100)
            : 0,
          url: p.url,
        }))
    })).sort((a, b) => b.count - a.count)

    // AI代替インサイト（ホワイトカラー代替関連のキーワード分析）
    const replacementKeywords = [
      { category: '事務・管理職', keywords: ['事務', '管理', '経理', '人事', 'HR', '総務'] },
      { category: '営業・マーケティング', keywords: ['営業', 'セールス', 'マーケ', 'マーケティング', '広告'] },
      { category: 'エンジニア・開発', keywords: ['エンジニア', '開発', 'プログラマー', 'コーディング', 'プログラミング'] },
      { category: 'デザイナー・クリエイティブ', keywords: ['デザイナー', 'デザイン', 'クリエイティブ', 'イラスト', '動画'] },
      { category: 'ライター・編集', keywords: ['ライター', '記者', '編集', 'コピー', '執筆'] },
      { category: 'コンサルタント・アナリスト', keywords: ['コンサル', 'アナリスト', '分析', '戦略'] }
    ]

    const aiInsights = replacementKeywords.map(({ category, keywords }) => {
      const relatedPosts = buzzPosts.filter(post => 
        keywords.some(keyword => 
          post.content.includes(keyword) && 
          (post.content.includes('AI') || post.content.includes('ChatGPT') || post.content.includes('Claude'))
        )
      )

      const keyPhrases = new Set<string>()
      relatedPosts.forEach(post => {
        // AIと職種の組み合わせを抽出
        const matches = post.content.match(/(?:AI|ChatGPT|Claude).*?(?:が|で|により|を使って).*?(?:代替|置き換|なくな|不要|自動化)/g)
        if (matches) {
          matches.forEach(match => keyPhrases.add(match))
        }
      })

      return {
        jobCategory: category,
        examples: relatedPosts.length,
        trend: relatedPosts.length > 10 ? 'increasing' : relatedPosts.length > 5 ? 'stable' : 'decreasing',
        keyPhrases: Array.from(keyPhrases).slice(0, 5)
      }
    }).filter(insight => insight.examples > 0)
      .sort((a, b) => b.examples - a.examples)

    return NextResponse.json({
      analytics,
      aiInsights,
      summary: {
        totalPosts: buzzPosts.length,
        dateRange: { from: dateFrom, days },
        topThemes: analytics.slice(0, 3).map(a => a.theme)
      }
    })
  } catch (error) {
    console.error('Error fetching buzz analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}