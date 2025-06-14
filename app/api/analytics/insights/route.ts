import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')
    
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    // 高パフォーマンス投稿を取得
    const topPosts = await prisma.viralPost.findMany({
      where: {
        postedAt: {
          gte: startDate
        },
        performance: {
          engagementRate: {
            gte: 3 // 3%以上のエンゲージメント率
          }
        }
      },
      include: {
        performance: true,
        opportunity: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    })
    
    // 低パフォーマンス投稿も取得（比較のため）
    const lowPosts = await prisma.viralPost.findMany({
      where: {
        postedAt: {
          gte: startDate
        },
        performance: {
          engagementRate: {
            lt: 1 // 1%未満のエンゲージメント率
          }
        }
      },
      include: {
        performance: true,
        opportunity: true
      },
      take: 10
    })
    
    // GPT-4で傾向分析
    const analysisPrompt = `
以下のデータから、バズる投稿の傾向を分析してください。

## 高パフォーマンス投稿（エンゲージメント率3%以上）
${topPosts.map(post => ({
  content: post.content,
  engagementRate: post.performance?.engagementRate,
  impressions: post.performance?.impressions24h,
  hashtags: post.hashtags,
  conceptType: post.conceptType
})).map(p => JSON.stringify(p)).join('\n')}

## 低パフォーマンス投稿（エンゲージメント率1%未満）
${lowPosts.map(post => ({
  content: post.content?.substring(0, 100),
  engagementRate: post.performance?.engagementRate,
  conceptType: post.conceptType
})).map(p => JSON.stringify(p)).join('\n')}

以下の観点で分析してください：
1. 高パフォーマンス投稿の共通パターン
2. 使用されている言葉やフレーズの特徴
3. アングル（切り口）の傾向
4. ハッシュタグの使い方
5. 改善提案

JSON形式で出力してください。
`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'あなたはソーシャルメディア分析の専門家です。'
        },
        {
          role: 'user',
          content: analysisPrompt
        }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })
    
    const insights = JSON.parse(completion.choices[0].message.content || '{}')
    
    // 時間帯別パフォーマンス
    const hourlyPerformance = await prisma.$queryRaw`
      SELECT 
        EXTRACT(HOUR FROM posted_at) as hour,
        AVG(vpp.engagement_rate) as avg_engagement,
        COUNT(DISTINCT vp.id) as post_count
      FROM viral_posts vp
      JOIN viral_post_performance vpp ON vp.id = vpp.post_id
      WHERE vp.posted_at >= ${startDate}
        AND vpp.timeframe = '24h'
      GROUP BY EXTRACT(HOUR FROM posted_at)
      ORDER BY avg_engagement DESC
    ` as Array<{hour: number, avg_engagement: number, post_count: number}>
    
    // カテゴリ別パフォーマンス
    const categoryPerformance = topPosts.reduce((acc, post) => {
      const category = post.conceptType || 'その他'
      if (!acc[category]) {
        acc[category] = {
          count: 0,
          totalEngagement: 0,
          avgEngagement: 0
        }
      }
      acc[category].count++
      acc[category].totalEngagement += post.performance?.engagementRate || 0
      acc[category].avgEngagement = acc[category].totalEngagement / acc[category].count
      return acc
    }, {} as Record<string, any>)
    
    return NextResponse.json({
      insights,
      stats: {
        totalAnalyzed: topPosts.length + lowPosts.length,
        highPerformers: topPosts.length,
        lowPerformers: lowPosts.length,
        avgEngagementHigh: topPosts.reduce((sum, p) => sum + (p.performance?.engagementRate || 0), 0) / topPosts.length,
        avgEngagementLow: lowPosts.reduce((sum, p) => sum + (p.performance?.engagementRate || 0), 0) / lowPosts.length
      },
      hourlyPerformance,
      categoryPerformance,
      topPerformers: topPosts.slice(0, 5).map(post => ({
        id: post.id,
        content: post.content?.substring(0, 100) + '...',
        engagementRate: post.performance?.engagementRate,
        impressions: post.performance?.impressions24h,
        postedAt: post.postedAt,
        conceptType: post.conceptType
      }))
    })
    
  } catch (error) {
    console.error('Analytics insights error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate insights',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}