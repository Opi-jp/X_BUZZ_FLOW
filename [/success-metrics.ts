// BuzzFlow 成功メトリクスの定義
// プロジェクトオーナーのKPIに基づく

export interface SuccessMetrics {
  // 短期KPI（3ヶ月目標）
  shortTermKPIs: {
    followers: {
      current: number
      target: 2000
      isVerified: boolean // 青バッジ
      growthRate: number // 日次成長率
    }
    impressions: {
      current: number
      target: 5000000 // 500万
      monthlyTotal: number
      dailyAverage: number
    }
    revenue: {
      subscriptions: number // Xサブスクライブ登録者数
      monthlyRevenue: number // 月間収益
      isMonetized: boolean
    }
  }
  
  // 投稿パフォーマンス指標
  postPerformance: {
    // エンゲージメント率（最重要）
    engagementRate: number // (いいね + RT + リプライ) / インプレッション
    
    // バイラル指標
    viralScore: number // RT率が高い = 拡散力
    averageImpressions: number
    
    // 質的指標
    verifiedEngagements: number // 青バッジユーザーからの反応
    influencerEngagements: number // 1万フォロワー以上からの反応
    qualityReplies: number // 50文字以上の返信数
  }
  
  // コンテンツ戦略の成功指標
  contentStrategy: {
    // 各タイプの成功率
    quoteRTSuccessRate: number // 引用RTの平均エンゲージメント
    originalPostSuccessRate: number // 独自投稿の平均エンゲージメント
    newsThreadSuccessRate: number // ニューススレッドの平均エンゲージメント
    
    // 時間帯別パフォーマンス
    bestPostingTimes: Array<{
      hour: number
      avgEngagement: number
    }>
    
    // トピック別パフォーマンス
    topicPerformance: Record<string, {
      posts: number
      avgEngagement: number
      topPost: string
    }>
  }
  
  // 長期的価値指標
  longTermValue: {
    // フォロワーの質
    followerQuality: {
      verifiedRatio: number // 青バッジフォロワーの割合
      techInfluencerRatio: number // テック系インフルエンサーの割合
      activeFollowerRatio: number // アクティブフォロワーの割合
    }
    
    // ブランド構築
    brandMetrics: {
      mentionSentiment: number // メンション感情分析（-1 to 1）
      shareOfVoice: number // AI×クリエイティブ領域でのシェア
      thoughtLeadershipScore: number // 独自視点の評価
    }
    
    // 収益化ポテンシャル
    monetizationPotential: {
      subscriberConversionRate: number // フォロワー→サブスク転換率
      sponsorshipReadiness: number // スポンサーシップ準備度
      contentMarketFit: number // コンテンツ市場適合度
    }
  }
}

// 成功判定関数
export function calculateSuccessScore(metrics: SuccessMetrics): {
  overallScore: number // 0-100
  kpiProgress: {
    followers: number // 目標に対する進捗率
    impressions: number
    revenue: number
  }
  recommendations: string[]
} {
  // KPI進捗率の計算
  const followerProgress = (metrics.shortTermKPIs.followers.current / 2000) * 100
  const impressionProgress = (metrics.shortTermKPIs.impressions.monthlyTotal / 5000000) * 100
  const revenueProgress = metrics.shortTermKPIs.revenue.isMonetized ? 
    Math.min(100, metrics.shortTermKPIs.revenue.subscriptions * 10) : 0
  
  // 総合スコアの計算（重み付け）
  const overallScore = (
    followerProgress * 0.3 + // フォロワー: 30%
    impressionProgress * 0.3 + // インプレッション: 30%
    revenueProgress * 0.2 + // 収益化: 20%
    metrics.postPerformance.engagementRate * 1000 * 0.2 // エンゲージメント: 20%
  )
  
  // 推奨アクション
  const recommendations: string[] = []
  
  if (followerProgress < 50) {
    recommendations.push('青バッジユーザーへの積極的なRP投稿を増やす')
  }
  
  if (impressionProgress < 50) {
    recommendations.push('バイラル性の高い時事ネタへの独自視点投稿を増やす')
  }
  
  if (!metrics.shortTermKPIs.revenue.isMonetized) {
    recommendations.push('Xサブスクライブの申請と独占コンテンツの準備')
  }
  
  if (metrics.postPerformance.engagementRate < 0.02) {
    recommendations.push('より議論を呼ぶ「逆張り」視点の投稿を増やす')
  }
  
  return {
    overallScore,
    kpiProgress: {
      followers: followerProgress,
      impressions: impressionProgress,
      revenue: revenueProgress
    },
    recommendations
  }
}

// 投稿タイプ別の最適化提案
export function getPostTypeRecommendations(metrics: SuccessMetrics): {
  quoteRT: { increase: boolean; reason: string }
  original: { increase: boolean; reason: string }
  newsThread: { increase: boolean; reason: string }
} {
  const { contentStrategy } = metrics
  
  return {
    quoteRT: {
      increase: contentStrategy.quoteRTSuccessRate > contentStrategy.originalPostSuccessRate,
      reason: 'エンゲージメント獲得に効果的'
    },
    original: {
      increase: metrics.longTermValue.brandMetrics.thoughtLeadershipScore < 0.5,
      reason: '独自視点の確立が必要'
    },
    newsThread: {
      increase: contentStrategy.newsThreadSuccessRate > 
        (contentStrategy.quoteRTSuccessRate + contentStrategy.originalPostSuccessRate) / 2,
      reason: '情報発信者としての信頼構築'
    }
  }
}