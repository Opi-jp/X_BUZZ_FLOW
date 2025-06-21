// 時間スロットプリセット用ユーティリティ

export type ContentType = 'news' | 'business' | 'entertainment' | 'lifestyle'

export interface ContentTimeSlot {
  time: string // "HH:MM" format
  label: string
  engagement: 'high' | 'medium' | 'low'
  audience: string
}

// TimeSlotCard.tsxで使用されている型を定義
export interface TimeSlotPreset {
  id: string
  name: string
  icon: string
  description: string
  contentSuggestion: string
  targetAudience: string
  weekdayTime: string
  weekendTime: string
  engagement: 'high' | 'medium' | 'low'
  competition: 'high' | 'medium' | 'low'
  characteristics: string[]
}

export interface ContentTypeConfig {
  name: string
  optimalTimes: ContentTimeSlot[]
  description: string
}

export const TIME_SLOT_PRESETS: Record<string, ContentTimeSlot[]> = {
  morning: [
    { time: '07:00', label: '通勤開始', engagement: 'high', audience: '会社員・学生' },
    { time: '07:30', label: '通勤ピーク前', engagement: 'high', audience: '早起き層' },
    { time: '08:00', label: '通勤ピーク', engagement: 'medium', audience: '会社員' },
    { time: '08:30', label: '始業前', engagement: 'medium', audience: 'ビジネス層' },
    { time: '09:00', label: '始業時間', engagement: 'low', audience: '自営業・主婦' }
  ],
  lunch: [
    { time: '12:00', label: 'ランチ開始', engagement: 'high', audience: 'オフィスワーカー' },
    { time: '12:30', label: 'ランチピーク', engagement: 'high', audience: '全般' },
    { time: '13:00', label: 'ランチ終盤', engagement: 'medium', audience: '会社員' }
  ],
  evening: [
    { time: '17:00', label: '退勤開始', engagement: 'medium', audience: '早退組' },
    { time: '18:00', label: '退勤ピーク', engagement: 'high', audience: '会社員' },
    { time: '18:30', label: '帰宅ラッシュ', engagement: 'high', audience: '通勤者' },
    { time: '19:00', label: '帰宅時間', engagement: 'high', audience: '全般' },
    { time: '19:30', label: '夕食前', engagement: 'medium', audience: 'ファミリー層' }
  ],
  night: [
    { time: '21:00', label: 'ゴールデンタイム開始', engagement: 'high', audience: '全般' },
    { time: '21:30', label: 'ゴールデンタイム', engagement: 'high', audience: 'エンターテイメント層' },
    { time: '22:00', label: 'プライムタイム', engagement: 'high', audience: 'SNS活発層' },
    { time: '22:30', label: '夜型ピーク', engagement: 'medium', audience: '夜型ユーザー' },
    { time: '23:00', label: 'ナイトタイム', engagement: 'medium', audience: '夜更かし層' }
  ]
}

export const CONTENT_TYPE_CONFIGS: Record<string, ContentTypeConfig> = {
  news: {
    name: 'ニュース・時事',
    optimalTimes: [
      ...TIME_SLOT_PRESETS.morning.slice(0, 2),
      ...TIME_SLOT_PRESETS.lunch,
      ...TIME_SLOT_PRESETS.evening.slice(1, 3)
    ],
    description: '朝の通勤時間、ランチタイム、帰宅時間が最適'
  },
  entertainment: {
    name: 'エンターテイメント',
    optimalTimes: [
      ...TIME_SLOT_PRESETS.lunch,
      ...TIME_SLOT_PRESETS.evening.slice(2, 4),
      ...TIME_SLOT_PRESETS.night.slice(0, 3)
    ],
    description: 'ランチタイム、夕方、夜の時間帯が効果的'
  },
  business: {
    name: 'ビジネス・働き方',
    optimalTimes: [
      ...TIME_SLOT_PRESETS.morning.slice(0, 3),
      ...TIME_SLOT_PRESETS.lunch.slice(0, 2),
      ...TIME_SLOT_PRESETS.evening.slice(0, 2)
    ],
    description: '平日の通勤時間、ランチタイム、退勤時間が最適'
  },
  lifestyle: {
    name: 'ライフスタイル',
    optimalTimes: [
      ...TIME_SLOT_PRESETS.morning.slice(3, 5),
      ...TIME_SLOT_PRESETS.evening.slice(3, 5),
      ...TIME_SLOT_PRESETS.night.slice(0, 2)
    ],
    description: '朝の余裕時間、夕食時間、夜のリラックスタイムが効果的'
  }
}

export function detectContentType(content: string): string {
  const keywords = {
    news: ['ニュース', '速報', '発表', '政府', '企業', '経済', '政治', '社会'],
    business: ['働き方', 'ビジネス', 'キャリア', '副業', '起業', '効率', '生産性', 'AI活用'],
    entertainment: ['エンタメ', '映画', 'ドラマ', 'アニメ', 'ゲーム', '音楽', 'お笑い'],
    lifestyle: ['ライフスタイル', '健康', '料理', '旅行', 'ファッション', '美容', '家族']
  }

  const contentLower = content.toLowerCase()

  for (const [type, keywordList] of Object.entries(keywords)) {
    if (keywordList.some(keyword => contentLower.includes(keyword))) {
      return type
    }
  }

  return 'business' // デフォルト
}

export function getNextOptimalTime(
  contentType: string = 'business',
  fromTime?: Date
): { time: string; slot: ContentTimeSlot; reason: string } {
  const config = CONTENT_TYPE_CONFIGS[contentType] || CONTENT_TYPE_CONFIGS.business
  const now = fromTime || new Date()
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

  // 今日の残りの最適時間を検索
  const todayOptimal = config.optimalTimes.find(slot => slot.time > currentTime)
  
  if (todayOptimal) {
    return {
      time: todayOptimal.time,
      slot: todayOptimal,
      reason: `${config.name}コンテンツに最適な時間帯です`
    }
  }

  // 今日に最適な時間がない場合は明日の最初の時間
  const tomorrowOptimal = config.optimalTimes[0]
  return {
    time: tomorrowOptimal.time,
    slot: tomorrowOptimal,
    reason: `明日の${config.name}コンテンツに最適な時間帯です`
  }
}

export function getOptimalTimesForDate(
  date: Date,
  contentType: string = 'business'
): ContentTimeSlot[] {
  const config = CONTENT_TYPE_CONFIGS[contentType] || CONTENT_TYPE_CONFIGS.business
  const dayOfWeek = date.getDay()
  
  // 週末は夜の時間帯を重視
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return [
      ...config.optimalTimes.filter(slot => 
        parseInt(slot.time.split(':')[0]) >= 10 && parseInt(slot.time.split(':')[0]) <= 12
      ),
      ...TIME_SLOT_PRESETS.evening.slice(2, 5),
      ...TIME_SLOT_PRESETS.night.slice(0, 4)
    ]
  }

  return config.optimalTimes
}

export function formatTimeSlot(slot: ContentTimeSlot): string {
  return `${slot.time} - ${slot.label} (${slot.engagement === 'high' ? '高' : slot.engagement === 'medium' ? '中' : '低'}エンゲージメント)`
}

export function calculateEngagementScore(time: string, contentType: string): number {
  const config = CONTENT_TYPE_CONFIGS[contentType] || CONTENT_TYPE_CONFIGS.business
  const slot = config.optimalTimes.find(s => s.time === time)
  
  if (!slot) return 0.3 // デフォルトスコア
  
  switch (slot.engagement) {
    case 'high': return 0.8
    case 'medium': return 0.6
    case 'low': return 0.4
    default: return 0.3
  }
}

export function getJSTDate(date?: Date): Date {
  const now = date || new Date()
  // JST (UTC+9) に変換
  const jstOffset = 9 * 60 * 60 * 1000 // 9時間をミリ秒に変換
  const utc = now.getTime() + (now.getTimezoneOffset() * 60 * 1000)
  const jst = new Date(utc + jstOffset)
  return jst
}

// TimeSlotCard用のプリセットデータ
export const TIME_SLOT_PRESETS_UI: TimeSlotPreset[] = [
  {
    id: 'morning_commute',
    name: '通勤時間帯',
    icon: '🚃',
    description: '朝の通勤ラッシュ時間。会社員・学生が多く活動',
    contentSuggestion: 'ニュース、ビジネス系コンテンツ',
    targetAudience: '会社員・学生',
    weekdayTime: '7:30-8:30',
    weekendTime: '9:00-10:00',
    engagement: 'high',
    competition: 'medium',
    characteristics: ['通勤中の隙間時間', 'ニュースチェックが多い', '短時間での消費']
  },
  {
    id: 'lunch_break',
    name: 'ランチタイム',
    icon: '🍱',
    description: 'お昼休憩時間。リラックスしてSNSをチェック',
    contentSuggestion: 'エンターテイメント、ライフスタイル',
    targetAudience: 'オフィスワーカー全般',
    weekdayTime: '12:00-13:00',
    weekendTime: '12:30-13:30',
    engagement: 'high',
    competition: 'high',
    characteristics: ['ゆっくり見る時間がある', '気軽なコンテンツが好まれる', 'シェア率が高い']
  },
  {
    id: 'evening_home',
    name: '帰宅時間',
    icon: '🏠',
    description: '仕事終わりの帰宅時間。一日の振り返りタイム',
    contentSuggestion: 'ビジネス、働き方、ライフスタイル',
    targetAudience: '会社員',
    weekdayTime: '18:00-19:30',
    weekendTime: '17:00-18:00',
    engagement: 'high',
    competition: 'medium',
    characteristics: ['一日の疲れでリラックス志向', '明日への準備コンテンツ', '長めのコンテンツも可']
  },
  {
    id: 'night_relax',
    name: '夜のリラックスタイム',
    icon: '🌙',
    description: '夜のゆったりとした時間。エンターテイメント系が人気',
    contentSuggestion: 'エンターテイメント、趣味、ライフスタイル',
    targetAudience: '全年代',
    weekdayTime: '21:00-23:00',
    weekendTime: '20:00-24:00',
    engagement: 'high',
    competition: 'high',
    characteristics: ['じっくり楽しむ時間', 'エンターテイメント重視', 'コメント・いいねが活発']
  }
]