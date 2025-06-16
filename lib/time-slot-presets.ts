/**
 * Twitter投稿の最適時間帯プリセット
 * 実際のTwitterエンゲージメントデータに基づく5つの時間帯
 */

export interface TimeSlotPreset {
  id: string
  name: string
  weekdayTime: string // "HH:MM" format
  weekendTime: string // "HH:MM" format
  description: string
  contentSuggestion: string
  engagement: 'high' | 'medium' | 'low'
  competition: 'high' | 'medium' | 'low'
  icon: string
  targetAudience: string
  characteristics: string[]
}

export const TIME_SLOT_PRESETS: TimeSlotPreset[] = [
  {
    id: 'morning',
    name: '朝の通勤・通学タイム',
    weekdayTime: '08:00',
    weekendTime: '09:00',
    description: '通勤・通学中にスマホ閲覧。情報収集欲が高い時間帯',
    contentSuggestion: 'ニュース・TIP・軽い問いかけ',
    engagement: 'medium',
    competition: 'low',
    icon: '☀️',
    targetAudience: '通勤・通学者、朝活組',
    characteristics: [
      '移動中で短文が効果的',
      '投稿数が少なく埋もれにくい',
      '木曜朝は特にインプレッション高',
      '情報収集モード'
    ]
  },
  {
    id: 'lunch',
    name: 'ランチタイム',
    weekdayTime: '12:30',
    weekendTime: '13:00',
    description: 'ランチ休憩中のリラックス時間。ビジュアル重視',
    contentSuggestion: '画像・動画・共感ネタ・投票',
    engagement: 'medium',
    competition: 'high',
    icon: '🍽️',
    targetAudience: 'サラリーマン・OL、学生',
    characteristics: [
      'リラックスモードで受動的閲覧',
      '流し見されない工夫が必須',
      '目に留まれば拡散されやすい',
      'ビジュアル重視のコンテンツが効果的'
    ]
  },
  {
    id: 'afternoon',
    name: '午後のピークタイム',
    weekdayTime: '15:30',
    weekendTime: '15:00',
    description: '全体的にRT数最多。週末は最大のゴールデンタイム',
    contentSuggestion: 'まとめスレッド・議論の種・速報',
    engagement: 'high',
    competition: 'medium',
    icon: '📈',
    targetAudience: '幅広い層、週末は特に活発',
    characteristics: [
      '平日：仕事の合間、ニッチ情報でコア層獲得',
      '週末：自由時間で質の高い内容が深く読まれる',
      '最もRT数が多い時間帯',
      'まとめ系コンテンツが効果的'
    ]
  },
  {
    id: 'prime',
    name: 'ゴールデンタイム',
    weekdayTime: '21:00',
    weekendTime: '20:00',
    description: '平日最大のピーク。競合も最多だが最も多くの人にリーチ',
    contentSuggestion: '深い内容・エンタメ・まとめ',
    engagement: 'high',
    competition: 'high',
    icon: '🌙',
    targetAudience: '帰宅後のリラックス層、全年齢',
    characteristics: [
      '帰宅後の自由時間',
      '投稿競合が最多',
      '質の高いコンテンツが必要',
      'エンターテイメント性が重要'
    ]
  },
  {
    id: 'late',
    name: 'まったりタイム',
    weekdayTime: '22:30',
    weekendTime: '22:00',
    description: 'ビジネス層が集中。ゆっくり読める深い内容向け',
    contentSuggestion: '考察・学び・明日への準備',
    engagement: 'medium',
    competition: 'low',
    icon: '💤',
    targetAudience: 'ビジネス層、学習意欲の高い層',
    characteristics: [
      '22時台にビジネス層閲覧ピーク',
      '競合が少なく質重視',
      '深い内容をじっくり読む時間',
      '学習・考察系コンテンツに最適'
    ]
  }
]

export type ContentType = 'news' | 'tips' | 'thread' | 'entertainment' | 'discussion' | 'general'

/**
 * コンテンツタイプ別の最適時間帯推奨
 */
export const CONTENT_OPTIMIZATION: Record<ContentType, string[]> = {
  'news': ['morning', 'afternoon'], // ニュース系
  'tips': ['morning', 'lunch'], // お役立ち情報
  'thread': ['afternoon', 'prime'], // スレッド・まとめ
  'entertainment': ['lunch', 'prime'], // エンタメ系
  'discussion': ['afternoon', 'late'], // 議論・考察
  'general': ['lunch', 'afternoon', 'prime'] // 一般的な投稿
}

/**
 * 時間帯IDから詳細情報を取得
 */
export function getTimeSlotPreset(id: string): TimeSlotPreset | undefined {
  return TIME_SLOT_PRESETS.find(preset => preset.id === id)
}

/**
 * コンテンツタイプに最適な時間帯を取得
 */
export function getRecommendedTimeSlots(contentType: ContentType): TimeSlotPreset[] {
  const recommendedIds = CONTENT_OPTIMIZATION[contentType] || []
  return recommendedIds
    .map(id => getTimeSlotPreset(id))
    .filter(Boolean) as TimeSlotPreset[]
}

/**
 * 現在時刻から次の最適投稿時間を計算（JST基準）
 */
export function getNextOptimalTime(timeSlotId: string, fromDate: Date = new Date()): Date {
  const preset = getTimeSlotPreset(timeSlotId)
  if (!preset) return fromDate

  // JST時刻で処理
  const jstFromDate = new Date(fromDate.toLocaleString("ja-JP", {timeZone: "Asia/Tokyo"}))
  const isWeekend = jstFromDate.getDay() === 0 || jstFromDate.getDay() === 6
  const targetTime = isWeekend ? preset.weekendTime : preset.weekdayTime
  const [hours, minutes] = targetTime.split(':').map(Number)

  const nextTime = new Date(jstFromDate)
  nextTime.setHours(hours, minutes, 0, 0)

  // 指定時刻が過ぎている場合は翌日に設定
  if (nextTime <= jstFromDate) {
    nextTime.setDate(nextTime.getDate() + 1)
  }

  return nextTime
}

/**
 * 日本時間（JST）で現在時刻を取得
 */
export function getJSTDate(date: Date = new Date()): Date {
  return new Date(date.toLocaleString("ja-JP", {timeZone: "Asia/Tokyo"}))
}

/**
 * 時間帯プリセットの表示時間（JST）を取得
 */
export function getDisplayTime(preset: TimeSlotPreset, isWeekend: boolean = false): string {
  const time = isWeekend ? preset.weekendTime : preset.weekdayTime
  return `${time} JST`
}

/**
 * エンゲージメント予測スコア（JST基準）
 */
export function calculateEngagementScore(
  timeSlotId: string,
  contentType: ContentType,
  date: Date = new Date()
): number {
  const preset = getTimeSlotPreset(timeSlotId)
  if (!preset) return 0

  // JST時刻で曜日を判定
  const jstDate = getJSTDate(date)
  const dayOfWeek = jstDate.getDay()

  const baseScore = {
    'high': 0.8,
    'medium': 0.6,
    'low': 0.4
  }[preset.engagement]

  const competitionPenalty = {
    'high': -0.2,
    'medium': -0.1,
    'low': 0
  }[preset.competition]

  const contentMatch = CONTENT_OPTIMIZATION[contentType]?.includes(timeSlotId) ? 0.2 : 0

  // 曜日ボーナス（JST基準）
  let dayBonus = 0
  
  if (timeSlotId === 'morning' && dayOfWeek === 4) { // 木曜朝
    dayBonus = 0.1
  } else if (timeSlotId === 'afternoon' && (dayOfWeek === 0 || dayOfWeek === 6)) { // 週末午後
    dayBonus = 0.15
  }

  return Math.max(0, Math.min(1, baseScore + competitionPenalty + contentMatch + dayBonus))
}