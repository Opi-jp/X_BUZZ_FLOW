import { buzz_posts } from '@/lib/generated/prisma'

export interface ScoringResult {
  postId: string
  relevanceScore: number      // テーマ関連度 (0-1)
  buzzPotential: number      // バズ可能性 (0-1)
  rpValue: number            // RP価値 (0-1)
  authorInfluence: number    // 著者影響力 (0-1)
  timeliness: number         // 時事性 (0-1)
  totalScore: number         // 総合スコア (0-5)
  recommendation: 'must_rp' | 'consider_rp' | 'reference' | 'skip'
  reason: string
}

// AI・働き方関連キーワード
const RELEVANCE_KEYWORDS = {
  high: ['AI', 'LLM', 'ChatGPT', 'Claude', 'Gemini', '生成AI', '働き方', 'DX', '自動化', 'プロンプト'],
  medium: ['テクノロジー', 'ビジネス', '生産性', '効率化', 'リモート', 'スキル', '未来'],
  low: ['デジタル', 'ツール', 'アプリ', 'サービス', 'IT']
}

export function calculateAutoScore(post: buzz_posts): ScoringResult {
  // 1. テーマ関連度スコア
  const content = post.content.toLowerCase()
  let relevanceScore = 0
  
  RELEVANCE_KEYWORDS.high.forEach(keyword => {
    if (content.includes(keyword.toLowerCase())) relevanceScore += 0.3
  })
  RELEVANCE_KEYWORDS.medium.forEach(keyword => {
    if (content.includes(keyword.toLowerCase())) relevanceScore += 0.15
  })
  RELEVANCE_KEYWORDS.low.forEach(keyword => {
    if (content.includes(keyword.toLowerCase())) relevanceScore += 0.05
  })
  
  relevanceScore = Math.min(relevanceScore, 1)

  // 2. バズ可能性スコア
  const engagementRate = post.impressions_count > 0 
    ? (post.likes_count + post.retweets_count) / post.impressions_count 
    : 0
  
  let buzzPotential = 0
  if (engagementRate > 0.1) buzzPotential = 1      // 10%以上は最高評価
  else if (engagementRate > 0.05) buzzPotential = 0.8
  else if (engagementRate > 0.03) buzzPotential = 0.6
  else if (engagementRate > 0.01) buzzPotential = 0.4
  else buzzPotential = 0.2

  // いいね数による補正
  if (post.likes_count > 10000) buzzPotential = Math.min(buzzPotential + 0.2, 1)
  else if (post.likes_count > 5000) buzzPotential = Math.min(buzzPotential + 0.1, 1)

  // 3. RP価値スコア
  const followers = post.author_followers || 0
  const isVerified = post.author_verified || false
  
  let rpValue = 0
  if (followers > 1000000) rpValue = 1           // 100万フォロワー以上
  else if (followers > 100000) rpValue = 0.8     // 10万フォロワー以上
  else if (followers > 50000) rpValue = 0.6      // 5万フォロワー以上  
  else if (followers > 10000) rpValue = 0.4      // 1万フォロワー以上
  else if (followers > 5000) rpValue = 0.2       // 5千フォロワー以上
  else rpValue = 0.1

  // 認証済みアカウントボーナス
  if (isVerified) rpValue = Math.min(rpValue + 0.2, 1)

  // エンゲージメント率が高い場合のボーナス
  if (engagementRate > 0.05 && followers > 10000) {
    rpValue = Math.min(rpValue + 0.2, 1)
  }

  // 4. 著者影響力スコア
  const ffRatio = (followers && post.author_following && post.author_following > 0) 
    ? followers / post.author_following 
    : 1
  
  let authorInfluence = 0
  if (ffRatio > 10) authorInfluence = 1          // FF比10以上
  else if (ffRatio > 5) authorInfluence = 0.8    
  else if (ffRatio > 2) authorInfluence = 0.6
  else if (ffRatio > 1) authorInfluence = 0.4
  else authorInfluence = 0.2

  // フォロワー数による補正
  if (followers > 100000) authorInfluence = Math.max(authorInfluence, 0.8)

  // 5. 時事性スコア
  const hoursSincePost = (Date.now() - new Date(post.posted_at).getTime()) / (1000 * 60 * 60)
  let timeliness = 0
  if (hoursSincePost < 1) timeliness = 1         // 1時間以内
  else if (hoursSincePost < 3) timeliness = 0.8  // 3時間以内
  else if (hoursSincePost < 6) timeliness = 0.6  // 6時間以内
  else if (hoursSincePost < 12) timeliness = 0.4 // 12時間以内
  else if (hoursSincePost < 24) timeliness = 0.2 // 24時間以内
  else timeliness = 0

  // 総合スコア計算（重み付け）
  const totalScore = 
    relevanceScore * 1.0 +      // テーマ関連度
    buzzPotential * 1.5 +       // バズ可能性（重視）
    rpValue * 1.2 +             // RP価値
    authorInfluence * 0.8 +     // 著者影響力
    timeliness * 0.5            // 時事性

  // 推奨アクション判定
  let recommendation: ScoringResult['recommendation']
  let reason: string

  if (totalScore >= 4.0 && rpValue >= 0.8 && timeliness >= 0.6) {
    recommendation = 'must_rp'
    reason = '影響力のある投稿者による旬な話題。今すぐRPすべき'
  } else if (totalScore >= 3.0 && (rpValue >= 0.6 || buzzPotential >= 0.8)) {
    recommendation = 'consider_rp'
    reason = 'RP価値あり。内容を精査して判断'
  } else if (totalScore >= 2.0 && relevanceScore >= 0.5) {
    recommendation = 'reference'
    reason = '参考になる内容。オリジナル投稿の種として活用'
  } else {
    recommendation = 'skip'
    reason = 'スコアが低いためスキップ推奨'
  }

  return {
    postId: post.id,
    relevanceScore,
    buzzPotential,
    rpValue,
    authorInfluence,
    timeliness,
    totalScore,
    recommendation,
    reason
  }
}

// バッチスコアリング
export function batchScore(posts: buzz_posts[]): ScoringResult[] {
  return posts
    .map(post => calculateAutoScore(post))
    .sort((a, b) => b.totalScore - a.totalScore)
}