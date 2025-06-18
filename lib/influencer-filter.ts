/**
 * インフルエンサーフィルタリング・分類ユーティリティ
 */

// 情報商材系のキーワード（より精度を高めた判定）
const INFO_PRODUCT_KEYWORDS = [
  // 直接的な販売・稼ぐ系
  '稼ぐ方法', '稼げる', '月収○○万', '年収○○万', '副業で稼', '不労所得',
  '〇〇万円達成', '○○万円稼', '７桁達成', '８桁達成', '６桁達成',
  
  // 煽り系（複合判定用）
  '今だけ限定', '無料配布', 'LINE登録で', '公式LINE登録',
  'プレゼント企画', '受け取り方法',
  
  // 成功アピール系
  '成功者になる', '勝ち組', '負け組', '情弱', '情強',
  'マインドセット', '成功法則', '億り人',
  
  // 投資・仮想通貨系の怪しいもの
  'FIRE達成', '爆益', '爆上げ確定', '仮想通貨で稼',
  'FX必勝法', 'バイナリー必勝', '自動売買で稼',
  
  // その他
  'DM解放中', 'DMください', 'コンサル募集', 'サロン運営'
]

// AI・技術共有系のキーワード（情報商材と区別）
const LEGITIMATE_SHARE_KEYWORDS = [
  'Tips', 'note', 'Zenn', 'Qiita', 'Brain', // プラットフォーム名
  '解説', '使い方', 'チュートリアル', 'ハンズオン',
  '実装', 'コード', 'プロンプト', 'API',
  '技術記事', 'ブログ', '知見', 'ナレッジ'
]

// AI系の正当なキーワード
const AI_KEYWORDS = [
  'AI', '人工知能', 'ChatGPT', 'Claude', 'GPT-4', 'GPT-3',
  'Gemini', 'LLM', '機械学習', 'ディープラーニング',
  'プロンプト', 'AIツール', 'AI活用', 'AIエージェント',
  'Copilot', 'Stable Diffusion', 'DALL-E', 'Midjourney',
  'AIアシスタント', 'AIモデル', 'ファインチューニング',
  'RAG', 'ベクトルDB', 'embedding'
]

// 働き方系の正当なキーワード
const WORK_KEYWORDS = [
  '働き方', 'リモートワーク', 'テレワーク', '在宅勤務',
  'フリーランス', '独立', '起業', 'スタートアップ',
  'ワークライフバランス', 'キャリア', '転職', '就活',
  '生産性', 'タスク管理', 'チームワーク', 'マネジメント',
  'スキルアップ', '勉強法', '時間管理', 'ノーコード',
  'DX', 'デジタル変革', '業務効率化', '自動化'
]

// ネットミーム・ネタ系のキーワード
const MEME_KEYWORDS = [
  // 定番ミーム（2024-2025）
  'それな', '草', 'ワロタ', '〜じゃん', '〜だろ',
  'しか勝たん', '尊い', 'エモい', 'ガチで',
  
  // 最新トレンドワード
  '〜って話', '〜な件', '〜すぎる', '〜すぎた',
  '速報', '朗報', '悲報', '【急募】', '【定期】',
  'ワイ', '民', '勢', '界隈', 'マジで',
  
  // Z世代系
  'それは草', 'fr', 'それはそう', 'ほんまそれ',
  '〜てみた', '〜チャレンジ', 'やってみた',
  
  // ネタ系
  'ネタ', 'あるある', '〜な人', '〜する人',
  'バズ', 'バズった', 'RT', 'いいね',
  
  // 画像・動画系
  'これ見て', 'この画像', 'この動画', '面白い',
  '爆笑', 'やばい', 'えぐい', 'ヤバすぎ',
  
  // リアクション系
  '知ってた？', '〜らしい', '〜だった', '〜してみた',
  '〜した結果', '〜してる', '〜だけど質問ある？',
  
  // 英語ミーム（日本でも使われる）
  'meme', 'lol', 'lmao', 'bruh', 'mood',
  'vibe', 'based', 'cringe', 'wholesome', 'slay'
]

// 海外ミーム検索用キーワード（輸入候補）
const GLOBAL_MEME_KEYWORDS = [
  // 定番海外ミーム
  'meme', 'viral', 'trending', 'relatable',
  'mood', 'vibe check', 'no cap', 'fr fr',
  
  // TikTok発祥系
  'POV', 'storytime', 'day in my life',
  'get ready with me', 'grwm', 'ootd',
  
  // リアクション系
  'real', 'based', 'cringe', 'wholesome',
  'cursed', 'blessed', 'chaotic', 'unhinged',
  
  // テンプレート系
  'nobody:', 'me:', 'pov:', 'therapist:',
  'literally', 'actually', 'lowkey', 'highkey'
]

export interface InfluencerCategory {
  category: 'ai' | 'work' | 'meme' | 'other'
  confidence: number
  isInfoProduct: boolean
  infoProductScore: number
  keywords: string[]
}

/**
 * 投稿内容からインフルエンサーのカテゴリを判定
 */
export function categorizeInfluencer(posts: string[]): InfluencerCategory {
  const allContent = posts.join(' ').toLowerCase()
  
  // 情報商材スコアを計算
  let infoProductScore = 0
  let legitimateShareScore = 0
  const foundInfoKeywords: string[] = []
  
  // 情報商材キーワードチェック
  for (const keyword of INFO_PRODUCT_KEYWORDS) {
    if (allContent.includes(keyword.toLowerCase())) {
      infoProductScore++
      foundInfoKeywords.push(keyword)
    }
  }
  
  // 正当な情報共有キーワードチェック
  for (const keyword of LEGITIMATE_SHARE_KEYWORDS) {
    if (allContent.includes(keyword.toLowerCase())) {
      legitimateShareScore++
    }
  }
  
  // カテゴリスコアを計算
  const categoryScores = {
    ai: 0,
    work: 0,
    meme: 0
  }
  
  const foundKeywords: string[] = []
  
  // AI系
  for (const keyword of AI_KEYWORDS) {
    if (allContent.includes(keyword.toLowerCase())) {
      categoryScores.ai++
      foundKeywords.push(keyword)
    }
  }
  
  // 働き方系
  for (const keyword of WORK_KEYWORDS) {
    if (allContent.includes(keyword.toLowerCase())) {
      categoryScores.work++
      foundKeywords.push(keyword)
    }
  }
  
  // ミーム系
  for (const keyword of MEME_KEYWORDS) {
    if (allContent.includes(keyword.toLowerCase())) {
      categoryScores.meme++
      foundKeywords.push(keyword)
    }
  }
  
  // 最高スコアのカテゴリを特定
  let maxCategory: 'ai' | 'work' | 'meme' | 'other' = 'other'
  let maxScore = 0
  
  for (const [category, score] of Object.entries(categoryScores)) {
    if (score > maxScore) {
      maxScore = score
      maxCategory = category as 'ai' | 'work' | 'meme'
    }
  }
  
  // 情報商材判定（改善版）
  // 正当な情報共有の場合は情報商材スコアを軽減
  const adjustedInfoScore = legitimateShareScore > 0 ? 
    Math.max(0, infoProductScore - legitimateShareScore * 0.5) : 
    infoProductScore
  
  // 情報商材判定の閾値を調整（3つ以上、かつ正当な共有要素が少ない場合）
  const isInfoProduct = adjustedInfoScore >= 3 && legitimateShareScore < 2
  
  // 信頼度計算（キーワード出現率）
  const totalWords = allContent.split(/\s+/).length
  const confidence = Math.min(maxScore / totalWords * 100, 1)
  
  return {
    category: maxCategory,
    confidence,
    isInfoProduct,
    infoProductScore: adjustedInfoScore / INFO_PRODUCT_KEYWORDS.length,
    keywords: foundKeywords
  }
}

/**
 * フォロー推奨スコアを計算
 */
export function calculateFollowScore(
  influencer: any,
  userPreferences: { categories: string[], excludeInfoProduct: boolean }
): number {
  let score = 0
  
  // カテゴリマッチ
  if (userPreferences.categories.includes(influencer.category)) {
    score += 50
  }
  
  // エンゲージメント率
  score += Math.min(influencer.engagementRate * 100, 30)
  
  // 一貫性スコア
  score += influencer.consistencyScore * 10
  
  // 情報商材ペナルティ
  if (userPreferences.excludeInfoProduct && influencer.isInfoProduct) {
    score = 0
  }
  
  return score
}

/**
 * ネットミーム検索クエリを生成
 */
export function generateMemeSearchQueries(includeGlobal: boolean = false): string[] {
  const queries: string[] = []
  
  // 日本語ミーム検索
  queries.push('min_faves:1000 (草 OR ワロタ OR それな) lang:ja')
  queries.push('min_retweets:500 (バズった OR バズ) lang:ja')
  
  // トレンド系
  queries.push('min_faves:2000 (速報 OR 朗報 OR 悲報) -ニュース')
  queries.push('min_faves:1500 〜すぎる lang:ja')
  
  // リアクション系
  queries.push('min_faves:1000 (やばい OR えぐい) has:images')
  
  // 画像・動画系（メディア必須）
  queries.push('has:images min_faves:2000 (これ見て OR この画像) lang:ja')
  queries.push('has:videos min_faves:3000 面白い lang:ja')
  
  // 海外ミームも含める場合
  if (includeGlobal) {
    // 英語圏の人気ミーム
    queries.push('min_faves:5000 meme has:images lang:en')
    queries.push('min_faves:10000 (viral OR trending) has:videos lang:en')
    queries.push('min_faves:3000 "POV:" lang:en')
    
    // 日本でも使えそうな海外ミーム
    queries.push('min_faves:5000 (mood OR vibe) has:images')
    queries.push('min_faves:10000 relatable has:images')
  }
  
  return queries
}

/**
 * 海外ミームの日本向けローカライズ候補を検索
 */
export function generateGlobalMemeImportQueries(): string[] {
  const queries: string[] = []
  
  // 高エンゲージメントの海外ミーム
  queries.push('min_faves:20000 meme has:images lang:en -filter:retweets')
  queries.push('min_faves:50000 viral has:videos lang:en -filter:retweets')
  
  // テンプレート系（日本語化しやすい）
  queries.push('min_faves:10000 "nobody:" has:images lang:en')
  queries.push('min_faves:10000 "POV:" -filter:retweets lang:en')
  
  // リアクション画像（言語を問わない）
  queries.push('min_faves:15000 reaction has:images')
  queries.push('min_faves:20000 (mood OR vibe) has:images')
  
  return queries
}

/**
 * カテゴリ別検索クエリを生成
 */
export function generateCategorySearchQueries(category: 'ai' | 'work' | 'meme'): string[] {
  const queries: string[] = []
  
  switch (category) {
    case 'ai':
      queries.push('(ChatGPT OR Claude OR GPT-4) min_faves:500 -filter:retweets')
      queries.push('(AI ツール OR AI 活用) min_faves:300 lang:ja')
      queries.push('(プロンプト OR LLM) min_faves:200 -"稼ぐ" -"副業"')
      break
      
    case 'work':
      queries.push('(リモートワーク OR 働き方改革) min_faves:300 -"稼ぐ"')
      queries.push('(フリーランス OR 独立) min_faves:200 -"月収" -"副業"')
      queries.push('(生産性 OR タスク管理) min_faves:100 lang:ja')
      break
      
    case 'meme':
      queries = queries.concat(generateMemeSearchQueries())
      break
  }
  
  return queries
}