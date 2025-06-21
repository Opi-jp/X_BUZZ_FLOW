// セルフRT戦略用ユーティリティ

export interface SelfRTSchedule {
  id: string
  originalPostTime: Date
  rtTime: Date
  strategy: string
  description: string
  expectedBoost: number // パーセント
  targetAudience: string
}

export interface SelfRTSuggestion {
  timing: 'immediate' | 'delayed' | 'peak'
  delay: number // 分
  reason: string
  audience: string
  boostExpectation: number
  comment?: string
}

export interface SelfRTStrategy {
  name: string
  description: string
  timings: {
    immediate?: number // 分後
    delayed?: number[] // 複数の遅延時間
    peak?: string[] // 最適時間帯
  }
  commentSuggestions: string[]
}

export const SELF_RT_STRATEGIES: Record<string, SelfRTStrategy> = {
  news: {
    name: 'ニュース・時事戦略',
    description: '速報性を活かし、話題が盛り上がっている間に追加拡散',
    timings: {
      immediate: 30, // 30分後
      delayed: [120, 360], // 2時間後、6時間後
      peak: ['12:00', '18:00', '21:00']
    },
    commentSuggestions: [
      '続報が入りました 👀',
      'この件について追加情報です',
      '重要なポイントを再確認 📊',
      'まだご覧になっていない方へ ⚡'
    ]
  },
  business: {
    name: 'ビジネス・働き方戦略', 
    description: 'ビジネス層の活動時間に合わせて複数回拡散',
    timings: {
      immediate: 60, // 1時間後
      delayed: [480, 1020], // 8時間後（翌営業日開始）、17時間後（翌日夕方）
      peak: ['09:00', '12:30', '18:00']
    },
    commentSuggestions: [
      '働き方について改めて考えてみました 💭',
      'ビジネスパーソンの皆さんにお伝えしたい内容です',
      '朝の通勤時間にもう一度シェア 🚃',
      '夕方の振り返りタイムに 📈'
    ]
  },
  entertainment: {
    name: 'エンターテイメント戦略',
    description: '夜の時間帯の高いエンゲージメントを狙って拡散',
    timings: {
      immediate: 90, // 1.5時間後
      delayed: [300, 480], // 5時間後、8時間後
      peak: ['19:30', '21:00', '22:30']
    },
    commentSuggestions: [
      'まだ見てない人にもぜひ！ ✨',
      '夜のリラックスタイムにもう一度 🌙',
      'みなさんの反応が面白すぎて再投稿 😄',
      '夜の部、開演です 🎭'
    ]
  },
  lifestyle: {
    name: 'ライフスタイル戦略',
    description: 'ゆったりとした時間帯に、より多くの人に届けるように拡散',
    timings: {
      immediate: 120, // 2時間後
      delayed: [360, 720], // 6時間後、12時間後
      peak: ['10:00', '15:00', '20:00']
    },
    commentSuggestions: [
      'ライフスタイルの参考になれば 🌱',
      '午後のひと息にもう一度 ☕',
      '生活の質について考えるきっかけに',
      'のんびりした時間にシェア 🏠'
    ]
  }
}

export function generateSelfRTPlan(
  postTime: Date,
  contentType: string = 'business',
  customStrategy?: Partial<SelfRTStrategy>
): SelfRTSchedule[] {
  const strategy = customStrategy 
    ? { ...SELF_RT_STRATEGIES[contentType], ...customStrategy }
    : SELF_RT_STRATEGIES[contentType] || SELF_RT_STRATEGIES.business

  const schedules: SelfRTSchedule[] = []

  // 即座のRT
  if (strategy.timings.immediate) {
    const rtTime = new Date(postTime.getTime() + strategy.timings.immediate * 60 * 1000)
    schedules.push({
      id: `rt_immediate_${Date.now()}`,
      originalPostTime: postTime,
      rtTime,
      strategy: 'immediate',
      description: `${strategy.timings.immediate}分後のフォローアップRT`,
      expectedBoost: 15,
      targetAudience: '初期反応を見逃した層'
    })
  }

  // 遅延RT
  if (strategy.timings.delayed) {
    strategy.timings.delayed.forEach((delay, index) => {
      const rtTime = new Date(postTime.getTime() + delay * 60 * 1000)
      schedules.push({
        id: `rt_delayed_${index}_${Date.now()}`,
        originalPostTime: postTime,
        rtTime,
        strategy: 'delayed',
        description: `${Math.floor(delay / 60)}時間後の拡散RT`,
        expectedBoost: 25,
        targetAudience: '異なる時間帯のアクティブユーザー'
      })
    })
  }

  return schedules
}

export function suggestOptimalSelfRTTiming(
  content: string,
  postTime: Date,
  contentType: string = 'business'
): SelfRTSuggestion[] {
  const strategy = SELF_RT_STRATEGIES[contentType] || SELF_RT_STRATEGIES.business
  const suggestions: SelfRTSuggestion[] = []

  // 即座のRT提案
  if (strategy.timings.immediate) {
    suggestions.push({
      timing: 'immediate',
      delay: strategy.timings.immediate,
      reason: '初期の反応を逃した人への再リーチ',
      audience: '初回投稿から数十分経過後のアクティブユーザー',
      boostExpectation: 15,
      comment: strategy.commentSuggestions[Math.floor(Math.random() * strategy.commentSuggestions.length)]
    })
  }

  // 遅延RT提案
  if (strategy.timings.delayed && strategy.timings.delayed.length > 0) {
    const delay = strategy.timings.delayed[0]
    suggestions.push({
      timing: 'delayed', 
      delay,
      reason: '異なる時間帯のユーザーに向けた拡散',
      audience: `${Math.floor(delay / 60)}時間後のアクティブ層`,
      boostExpectation: 25,
      comment: strategy.commentSuggestions[Math.floor(Math.random() * strategy.commentSuggestions.length)]
    })
  }

  // ピーク時間RT提案
  if (strategy.timings.peak && strategy.timings.peak.length > 0) {
    const nextPeakTime = getNextPeakTime(postTime, strategy.timings.peak)
    if (nextPeakTime) {
      const delayMinutes = Math.floor((nextPeakTime.getTime() - postTime.getTime()) / (1000 * 60))
      suggestions.push({
        timing: 'peak',
        delay: delayMinutes,
        reason: 'ピーク時間帯での最大リーチ狙い',
        audience: 'ゴールデンタイムのアクティブユーザー',
        boostExpectation: 35,
        comment: strategy.commentSuggestions[Math.floor(Math.random() * strategy.commentSuggestions.length)]
      })
    }
  }

  return suggestions
}

function getNextPeakTime(fromTime: Date, peakTimes: string[]): Date | null {
  const fromTimeStr = `${fromTime.getHours().toString().padStart(2, '0')}:${fromTime.getMinutes().toString().padStart(2, '0')}`
  
  // 今日の残りのピーク時間を探す
  for (const peakTime of peakTimes) {
    if (peakTime > fromTimeStr) {
      const [hours, minutes] = peakTime.split(':').map(Number)
      const nextTime = new Date(fromTime)
      nextTime.setHours(hours, minutes, 0, 0)
      return nextTime
    }
  }
  
  // 今日にピーク時間がない場合は明日の最初のピーク時間
  const [hours, minutes] = peakTimes[0].split(':').map(Number)
  const tomorrowTime = new Date(fromTime)
  tomorrowTime.setDate(tomorrowTime.getDate() + 1)
  tomorrowTime.setHours(hours, minutes, 0, 0)
  return tomorrowTime
}

export function calculateSelfRTBoost(
  originalEngagement: number,
  rtStrategy: SelfRTSuggestion
): {
  expectedNewEngagement: number
  totalExpectedEngagement: number
  boostPercentage: number
} {
  const boostMultiplier = rtStrategy.boostExpectation / 100
  const expectedNewEngagement = originalEngagement * boostMultiplier
  const totalExpectedEngagement = originalEngagement + expectedNewEngagement
  
  return {
    expectedNewEngagement: Math.round(expectedNewEngagement),
    totalExpectedEngagement: Math.round(totalExpectedEngagement),
    boostPercentage: rtStrategy.boostExpectation
  }
}

export function formatSelfRTSchedule(schedule: SelfRTSchedule): string {
  const timeDiff = schedule.rtTime.getTime() - schedule.originalPostTime.getTime()
  const hoursDiff = Math.floor(timeDiff / (1000 * 60 * 60))
  const minutesDiff = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
  
  let timeStr = ''
  if (hoursDiff > 0) {
    timeStr = `${hoursDiff}時間${minutesDiff > 0 ? minutesDiff + '分' : ''}後`
  } else {
    timeStr = `${minutesDiff}分後`
  }
  
  return `${timeStr} - ${schedule.description} (期待上昇率: ${schedule.expectedBoost}%)`
}