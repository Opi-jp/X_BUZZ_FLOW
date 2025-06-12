import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // データ収集状況を分析
    const now = new Date()
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const last3Hours = new Date(now.getTime() - 3 * 60 * 60 * 1000)

    // ニュース収集状況
    const newsStats = await Promise.all([
      // 総ニュース数（24時間）
      prisma.newsArticle.count({
        where: { createdAt: { gte: last24Hours } }
      }),
      
      // ソース別統計
      prisma.newsArticle.groupBy({
        by: ['sourceId'],
        where: { createdAt: { gte: last24Hours } },
        _count: { id: true }
      }),
      
      // 重要度分布
      prisma.newsArticle.groupBy({
        by: ['category'],
        where: { 
          createdAt: { gte: last24Hours },
          importance: { gte: 0.7 }
        },
        _count: { id: true }
      })
    ])

    // バズ投稿収集状況
    const buzzStats = await Promise.all([
      // 総投稿数（3時間）
      prisma.buzzPost.count({
        where: { collectedAt: { gte: last3Hours } }
      }),
      
      // テーマ別統計
      prisma.buzzPost.groupBy({
        by: ['theme'],
        where: { collectedAt: { gte: last3Hours } },
        _count: { id: true },
        _avg: { likesCount: true, retweetsCount: true }
      }),
      
      // 高エンゲージメント投稿
      prisma.buzzPost.count({
        where: {
          collectedAt: { gte: last3Hours },
          likesCount: { gte: 1000 }
        }
      })
    ])

    // データ品質評価
    const dataQuality = {
      newsCompleteness: newsStats[0] >= 20 ? 'excellent' : newsStats[0] >= 10 ? 'good' : 'insufficient',
      buzzPostCompleteness: buzzStats[0] >= 50 ? 'excellent' : buzzStats[0] >= 10 ? 'good' : newsStats[0] >= 20 ? 'acceptable' : 'insufficient',
      sourcesDiversity: newsStats[1].length >= 5 ? 'excellent' : newsStats[1].length >= 3 ? 'good' : 'limited'
    }

    // ソース情報を取得
    const sourceInfo = await prisma.newsSource.findMany({
      select: { id: true, name: true, category: true }
    })

    return NextResponse.json({
      timestamp: now.toISOString(),
      dataCollection: {
        news: {
          total24h: newsStats[0],
          bySource: newsStats[1].map((stat: any) => {
            const source = sourceInfo.find(s => s.id === stat.sourceId)
            return {
              sourceId: stat.sourceId,
              sourceName: source?.name || 'Unknown',
              category: source?.category || 'unknown',
              count: stat._count.id
            }
          }),
          byCategory: newsStats[2],
          qualityScore: dataQuality.newsCompleteness
        },
        buzzPosts: {
          total3h: buzzStats[0],
          byTheme: buzzStats[1],
          highEngagement: buzzStats[2],
          qualityScore: dataQuality.buzzPostCompleteness
        },
        dataQuality,
        readyForAnalysis: dataQuality.newsCompleteness !== 'insufficient' && 
                         (dataQuality.buzzPostCompleteness !== 'insufficient' || dataQuality.newsCompleteness === 'excellent')
      }
    })

  } catch (error) {
    console.error('Phase 1 data collection error:', error)
    return NextResponse.json(
      { error: 'データ収集状況の分析でエラーが発生しました' },
      { status: 500 }
    )
  }
}