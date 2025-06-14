import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateSuccessScore, getPostTypeRecommendations } from '@/lib/success-metrics'

// 成功レポートAPI - プロジェクトオーナーのKPIに基づく分析
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') || '7d' // 7d, 30d, 90d
    
    // 期間の計算
    const daysMap = { '7d': 7, '30d': 30, '90d': 90 }
    const days = daysMap[period as keyof typeof daysMap] || 7
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    
    // 1. 現在のフォロワー数（仮想データ - 実際はTwitter APIから取得）
    const currentFollowers = 850 // TODO: Twitter APIから取得
    const isVerified = false // TODO: Twitter APIから取得
    
    // 2. インプレッション集計
    const analytics = await prisma.postAnalytics.findMany({
      where: { measuredAt: { gte: since } }
    })
    
    const totalImpressions = analytics.reduce((sum, a) => sum + (a.impressions || 0), 0)
    const monthlyImpressions = days === 30 ? totalImpressions : (totalImpressions / days * 30)
    
    // 3. エンゲージメント率計算
    const totalEngagements = analytics.reduce((sum, a) => 
      sum + a.likes + a.retweets + a.replies, 0
    )
    const engagementRate = totalImpressions > 0 ? totalEngagements / totalImpressions : 0
    
    // 4. 投稿タイプ別パフォーマンス
    const scheduledPosts = await prisma.scheduledPost.findMany({
      where: { 
        scheduledTime: { gte: since },
        status: 'POSTED'
      },
      include: { analytics: true }
    })
    
    // タイプ別集計
    const typePerformance = {
      QUOTE: { posts: 0, totalEngagement: 0 },
      NEW: { posts: 0, totalEngagement: 0 },
      RETWEET: { posts: 0, totalEngagement: 0 }
    }
    
    scheduledPosts.forEach(post => {
      const type = post.postType as keyof typeof typePerformance
      const engagement = post.analytics?.reduce((sum, a) => 
        sum + a.likes + a.retweets, 0
      ) || 0
      
      typePerformance[type].posts++
      typePerformance[type].totalEngagement += engagement
    })
    
    // 5. 時間帯別パフォーマンス
    const hourlyPerformance = Array(24).fill(0).map((_, hour) => {
      const hourPosts = scheduledPosts.filter(p => 
        new Date(p.scheduledTime).getHours() === hour
      )
      
      const avgEngagement = hourPosts.length > 0 ?
        hourPosts.reduce((sum, p) => 
          sum + (p.analytics?.[0]?.likes || 0) + (p.analytics?.[0]?.retweets || 0), 0
        ) / hourPosts.length : 0
      
      return { hour, avgEngagement }
    }).filter(h => h.avgEngagement > 0)
    
    // 成功メトリクスの構築
    const metrics = {
      shortTermKPIs: {
        followers: {
          current: currentFollowers,
          target: 2000,
          isVerified,
          growthRate: 0.02 // TODO: 実際の成長率を計算
        },
        impressions: {
          current: totalImpressions,
          target: 5000000,
          monthlyTotal: Math.round(monthlyImpressions),
          dailyAverage: Math.round(totalImpressions / days)
        },
        revenue: {
          subscriptions: 0, // TODO: X APIから取得
          monthlyRevenue: 0,
          isMonetized: false
        }
      },
      postPerformance: {
        engagementRate,
        viralScore: 0.1, // TODO: RT率から計算
        averageImpressions: totalImpressions / Math.max(scheduledPosts.length, 1),
        verifiedEngagements: 0, // TODO: 実装
        influencerEngagements: 0, // TODO: 実装
        qualityReplies: 0 // TODO: 実装
      },
      contentStrategy: {
        quoteRTSuccessRate: typePerformance.QUOTE.posts > 0 ?
          typePerformance.QUOTE.totalEngagement / typePerformance.QUOTE.posts : 0,
        originalPostSuccessRate: typePerformance.NEW.posts > 0 ?
          typePerformance.NEW.totalEngagement / typePerformance.NEW.posts : 0,
        newsThreadSuccessRate: 0, // TODO: ニューススレッドの追跡
        bestPostingTimes: hourlyPerformance.sort((a, b) => b.avgEngagement - a.avgEngagement).slice(0, 3),
        topicPerformance: {} // TODO: トピック分析
      },
      longTermValue: {
        followerQuality: {
          verifiedRatio: 0.05, // TODO: 実装
          techInfluencerRatio: 0.1,
          activeFollowerRatio: 0.3
        },
        brandMetrics: {
          mentionSentiment: 0.7,
          shareOfVoice: 0.02,
          thoughtLeadershipScore: 0.4
        },
        monetizationPotential: {
          subscriberConversionRate: 0.01,
          sponsorshipReadiness: 0.3,
          contentMarketFit: 0.6
        }
      }
    }
    
    // 成功スコアと推奨事項の計算
    const successAnalysis = calculateSuccessScore(metrics as any)
    const postTypeRecommendations = getPostTypeRecommendations(metrics as any)
    
    // 具体的なアクションプラン
    const actionPlan = generateActionPlan(metrics, successAnalysis)
    
    return NextResponse.json({
      success: true,
      period,
      metrics,
      analysis: {
        overallScore: successAnalysis.overallScore.toFixed(1),
        kpiProgress: {
          followers: `${successAnalysis.kpiProgress.followers.toFixed(1)}%`,
          impressions: `${successAnalysis.kpiProgress.impressions.toFixed(1)}%`,
          revenue: `${successAnalysis.kpiProgress.revenue.toFixed(1)}%`
        },
        recommendations: successAnalysis.recommendations,
        postTypeStrategy: postTypeRecommendations
      },
      actionPlan
    })
    
  } catch (error) {
    console.error('Success report error:', error)
    return NextResponse.json(
      { error: '成功レポートの生成でエラーが発生しました' },
      { status: 500 }
    )
  }
}

// 具体的なアクションプラン生成
function generateActionPlan(metrics: any, analysis: any): any {
  interface ActionItem {
    action: string
    target: string
    expectedImpact: string
  }
  
  const plan = {
    immediate: [] as ActionItem[], // 今すぐやること
    weekly: [] as ActionItem[], // 今週中にやること
    monthly: [] as ActionItem[] // 今月中にやること
  }
  
  // KPI進捗に基づく即時アクション
  if (analysis.kpiProgress.followers < 50) {
    plan.immediate.push({
      action: '影響力のあるアカウント（1万フォロワー以上）への引用RT強化',
      target: '1日3-5件の高品質RP',
      expectedImpact: 'フォロワー成長率20%向上'
    })
  }
  
  if (analysis.kpiProgress.impressions < 30) {
    plan.immediate.push({
      action: 'トレンドトピックへの独自視点投稿',
      target: '朝のゴールデンタイム（7-9時）に毎日投稿',
      expectedImpact: 'インプレッション50%増加'
    })
  }
  
  // パフォーマンスに基づく週次アクション
  if (metrics.postPerformance.engagementRate < 0.02) {
    plan.weekly.push({
      action: '議論を呼ぶ「逆張り」コンテンツの増加',
      target: '週3回の挑発的な視点投稿',
      expectedImpact: 'エンゲージメント率2倍'
    })
  }
  
  // 長期戦略
  plan.monthly.push({
    action: 'X Premium+への加入とサブスクライブ機能の有効化',
    target: '独占コンテンツ5本の準備',
    expectedImpact: '月額収益の確立'
  })
  
  return plan
}