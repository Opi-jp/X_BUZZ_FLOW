/**
 * セルフRT（自分の投稿をリツイート）戦略
 * 時間帯とコンテンツタイプに基づく最適なセルフRT計画
 */

import { TimeSlotPreset, ContentType, TIME_SLOT_PRESETS, getJSTDate } from './time-slot-presets'

export interface SelfRTConfig {
  enabled: boolean
  intervals: SelfRTInterval[]
  maxRetweetCount: number
  addComment?: boolean
  commentTemplate?: string
}

export interface SelfRTInterval {
  delayHours: number
  targetTimeSlot?: string // 特定の時間帯を狙う場合
  comment?: string
  rationale: string
}

/**
 * コンテンツタイプ別のセルフRT戦略
 */
export const SELF_RT_STRATEGIES: Record<ContentType, SelfRTConfig> = {
  'news': {
    enabled: true,
    maxRetweetCount: 2,
    intervals: [
      {
        delayHours: 6,
        targetTimeSlot: 'lunch',
        comment: '重要なニュースなので再度シェア 🔄',
        rationale: 'ニュースは朝投稿→昼に別の層へリーチ'
      },
      {
        delayHours: 12,
        targetTimeSlot: 'prime',
        comment: '見逃した方のために 📢',
        rationale: '夜のゴールデンタイムで最大露出'
      }
    ]
  },
  'tips': {
    enabled: true,
    maxRetweetCount: 3,
    intervals: [
      {
        delayHours: 8,
        targetTimeSlot: 'afternoon',
        comment: '役立つ情報なので再掲 💡',
        rationale: 'お役立ち情報は午後の高エンゲージメント時間に'
      },
      {
        delayHours: 24,
        comment: '昨日投稿した Tips、まだ見てない方も多いと思うので 🔄',
        rationale: '翌日の同時刻でリマインド効果'
      },
      {
        delayHours: 72,
        comment: '3日前の投稿ですが、引き続き有効な情報です 📝',
        rationale: '中長期的な価値のある情報は3日後にも'
      }
    ]
  },
  'thread': {
    enabled: true,
    maxRetweetCount: 2,
    intervals: [
      {
        delayHours: 12,
        targetTimeSlot: 'prime',
        comment: 'スレッドが長いので、見落とした方のために 🧵',
        rationale: 'スレッドは夜の時間のある時に読まれやすい'
      },
      {
        delayHours: 48,
        comment: 'まとめスレッド、改めて 📚',
        rationale: '2日後のまとめ再掲で新しい読者にリーチ'
      }
    ]
  },
  'entertainment': {
    enabled: true,
    maxRetweetCount: 1,
    intervals: [
      {
        delayHours: 6,
        targetTimeSlot: 'prime',
        comment: '面白かったので改めて 😄',
        rationale: 'エンタメは夜のリラックス時間が最適'
      }
    ]
  },
  'discussion': {
    enabled: true,
    maxRetweetCount: 2,
    intervals: [
      {
        delayHours: 12,
        targetTimeSlot: 'late',
        comment: '議論が深まってきました。追加の意見もお待ちしています 💭',
        rationale: '議論系は考察時間のある深夜が効果的'
      },
      {
        delayHours: 24,
        comment: '昨日の議論、引き続き意見交換できればと思います 🤝',
        rationale: '翌日に新しい参加者を呼び込む'
      }
    ]
  },
  'general': {
    enabled: false,
    maxRetweetCount: 1,
    intervals: [
      {
        delayHours: 12,
        comment: '改めて 🔄',
        rationale: '一般投稿は基本的にセルフRTしない'
      }
    ]
  }
}

/**
 * セルフRT計画を生成
 */
export function generateSelfRTPlan(
  originalPostTime: Date,
  contentType: ContentType,
  customConfig?: Partial<SelfRTConfig>
): SelfRTSchedule[] {
  const strategy = { ...SELF_RT_STRATEGIES[contentType], ...customConfig }
  
  if (!strategy.enabled) {
    return []
  }

  const schedules: SelfRTSchedule[] = []
  const jstPostTime = getJSTDate(originalPostTime)

  for (let i = 0; i < Math.min(strategy.intervals.length, strategy.maxRetweetCount); i++) {
    const interval = strategy.intervals[i]
    const rtTime = new Date(jstPostTime.getTime() + (interval.delayHours * 60 * 60 * 1000))
    
    // 特定の時間帯が指定されている場合は調整
    if (interval.targetTimeSlot) {
      const targetSlot = TIME_SLOT_PRESETS.find(slot => slot.id === interval.targetTimeSlot)
      if (targetSlot) {
        const isWeekend = rtTime.getDay() === 0 || rtTime.getDay() === 6
        const targetTime = isWeekend ? targetSlot.weekendTime : targetSlot.weekdayTime
        const [hours, minutes] = targetTime.split(':').map(Number)
        
        rtTime.setHours(hours, minutes, 0, 0)
      }
    }

    schedules.push({
      scheduledAt: rtTime,
      comment: interval.comment || '',
      rationale: interval.rationale,
      targetTimeSlot: interval.targetTimeSlot || null,
      intervalHours: interval.delayHours
    })
  }

  return schedules
}

export interface SelfRTSchedule {
  scheduledAt: Date
  comment: string
  rationale: string
  targetTimeSlot: string | null
  intervalHours: number
}

/**
 * 最適なセルフRT時間を提案
 */
export function suggestOptimalSelfRTTiming(
  originalPostTime: Date,
  contentType: ContentType
): SelfRTSuggestion[] {
  const jstPostTime = getJSTDate(originalPostTime)
  const originalHour = jstPostTime.getHours()
  const suggestions: SelfRTSuggestion[] = []

  // 元投稿の時間帯を判定
  let originalTimeSlot = 'general'
  for (const preset of TIME_SLOT_PRESETS) {
    const isWeekend = jstPostTime.getDay() === 0 || jstPostTime.getDay() === 6
    const targetTime = isWeekend ? preset.weekendTime : preset.weekdayTime
    const [targetHour] = targetTime.split(':').map(Number)
    
    if (Math.abs(originalHour - targetHour) <= 1) {
      originalTimeSlot = preset.id
      break
    }
  }

  // 異なる時間帯での効果を提案
  const complementarySlots = getComplementaryTimeSlots(originalTimeSlot, contentType)
  
  for (const slot of complementarySlots) {
    const nextSlotTime = getNextTimeSlotOccurrence(jstPostTime, slot)
    suggestions.push({
      timeSlot: slot,
      scheduledAt: nextSlotTime,
      expectedReach: calculateReachIncrease(originalTimeSlot, slot.id),
      reason: getReachReason(originalTimeSlot, slot.id, contentType)
    })
  }

  return suggestions.slice(0, 3) // 上位3つの提案
}

export interface SelfRTSuggestion {
  timeSlot: TimeSlotPreset
  scheduledAt: Date
  expectedReach: number // 追加リーチの予測（%）
  reason: string
}

/**
 * 元の時間帯に対する補完的な時間帯を取得
 */
function getComplementaryTimeSlots(originalTimeSlot: string, contentType: ContentType): TimeSlotPreset[] {
  const complementaryMap: Record<string, string[]> = {
    'morning': ['lunch', 'prime'], // 朝→昼・夜
    'lunch': ['afternoon', 'prime'], // 昼→午後・夜
    'afternoon': ['prime', 'late'], // 午後→夜・深夜
    'prime': ['morning', 'afternoon'], // 夜→朝・午後
    'late': ['morning', 'lunch'] // 深夜→朝・昼
  }

  const complementaryIds = complementaryMap[originalTimeSlot] || ['prime']
  return complementaryIds
    .map(id => TIME_SLOT_PRESETS.find(slot => slot.id === id))
    .filter(Boolean) as TimeSlotPreset[]
}

/**
 * 次の指定時間帯の発生時刻を計算
 */
function getNextTimeSlotOccurrence(fromTime: Date, timeSlot: TimeSlotPreset): Date {
  const nextTime = new Date(fromTime)
  const isWeekend = nextTime.getDay() === 0 || nextTime.getDay() === 6
  const targetTime = isWeekend ? timeSlot.weekendTime : timeSlot.weekdayTime
  const [hours, minutes] = targetTime.split(':').map(Number)

  nextTime.setHours(hours, minutes, 0, 0)
  
  // 同日の時刻が過ぎている場合は翌日
  if (nextTime <= fromTime) {
    nextTime.setDate(nextTime.getDate() + 1)
  }

  return nextTime
}

/**
 * リーチ増加率を計算
 */
function calculateReachIncrease(originalSlot: string, targetSlot: string): number {
  // 異なる時間帯での重複しないオーディエンス率（推定）
  const overlapMatrix: Record<string, Record<string, number>> = {
    'morning': { 'lunch': 0.3, 'afternoon': 0.2, 'prime': 0.4, 'late': 0.1 },
    'lunch': { 'morning': 0.3, 'afternoon': 0.5, 'prime': 0.6, 'late': 0.2 },
    'afternoon': { 'morning': 0.2, 'lunch': 0.5, 'prime': 0.7, 'late': 0.3 },
    'prime': { 'morning': 0.4, 'lunch': 0.6, 'afternoon': 0.7, 'late': 0.5 },
    'late': { 'morning': 0.1, 'lunch': 0.2, 'afternoon': 0.3, 'prime': 0.5 }
  }

  const overlap = overlapMatrix[originalSlot]?.[targetSlot] || 0.5
  return Math.round((1 - overlap) * 100) // 重複しない部分 = 新しいリーチ
}

/**
 * リーチ理由を生成
 */
function getReachReason(originalSlot: string, targetSlot: string, contentType: ContentType): string {
  const reasons: Record<string, Record<string, string>> = {
    'morning': {
      'lunch': '通勤層から昼休み層へのリーチ拡大',
      'prime': '朝の情報収集層から夜のリラックス層へ'
    },
    'lunch': {
      'afternoon': '昼休み層から午後の高エンゲージメント層へ',
      'prime': '昼の軽い閲覧から夜の集中閲覧へ'
    },
    'afternoon': {
      'prime': '午後の活発層から夜の幅広い層へ',
      'late': '午後の一般層から深夜の考察層へ'
    },
    'prime': {
      'morning': '夜の投稿を朝の情報収集時間に再露出',
      'afternoon': 'ゴールデンタイムから午後の高活動時間へ'
    },
    'late': {
      'morning': '深夜の考察層から朝の新鮮な閲覧層へ',
      'lunch': '深夜投稿を昼の別の層に展開'
    }
  }

  return reasons[originalSlot]?.[targetSlot] || '異なる時間帯での露出拡大'
}