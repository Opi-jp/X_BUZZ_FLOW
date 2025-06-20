import { prisma } from '@/lib/prisma'
import { addMinutes, startOfDay, endOfDay, isWithinInterval } from 'date-fns'

export interface RTCandidate {
  id: string
  content: string
  originalPostId: string
  originalAuthor: string
  score: number
  scheduledAt?: Date
}

export interface TimeSlot {
  hour: number
  weight: number
  maxPosts: number
}

// 最適な投稿時間帯（日本時間）
const OPTIMAL_TIME_SLOTS: TimeSlot[] = [
  { hour: 7, weight: 0.8, maxPosts: 2 },   // 通勤時間帯
  { hour: 8, weight: 0.9, maxPosts: 3 },   
  { hour: 12, weight: 1.0, maxPosts: 3 },  // 昼休み
  { hour: 13, weight: 0.9, maxPosts: 2 },
  { hour: 18, weight: 0.8, maxPosts: 2 },  // 帰宅時間帯
  { hour: 19, weight: 1.0, maxPosts: 3 },
  { hour: 20, weight: 0.9, maxPosts: 3 },
  { hour: 21, weight: 0.8, maxPosts: 2 },
  { hour: 22, weight: 0.7, maxPosts: 2 },
]

export class SmartRTScheduler {
  /**
   * RT候補をスマートにスケジューリング
   */
  async schedulePosts(candidates: RTCandidate[]): Promise<RTCandidate[]> {
    // スコア順にソート
    const sortedCandidates = [...candidates].sort((a, b) => b.score - a.score)
    
    // 今日の投稿済み数を取得
    const today = new Date()
    const todayPosts = await this.getTodayPostCount()
    
    // 各時間帯の空き枠を計算
    const availableSlots = await this.calculateAvailableSlots(today)
    
    // 候補をスケジューリング
    const scheduled: RTCandidate[] = []
    let slotIndex = 0
    
    for (const candidate of sortedCandidates) {
      if (slotIndex >= availableSlots.length) break
      
      const slot = availableSlots[slotIndex]
      const scheduledAt = this.getScheduledTime(today, slot)
      
      scheduled.push({
        ...candidate,
        scheduledAt,
      })
      
      // スロットの残り枠を減らす
      slot.remaining--
      if (slot.remaining <= 0) {
        slotIndex++
      }
    }
    
    return scheduled
  }

  /**
   * 今日の投稿数を取得
   */
  private async getTodayPostCount(): Promise<number> {
    const start = startOfDay(new Date())
    const end = endOfDay(new Date())
    
    return await prisma.scheduledPost.count({
      where: {
        postedAt: {
          gte: start,
          lte: end,
        },
      },
    })
  }

  /**
   * 利用可能なスロットを計算
   */
  private async calculateAvailableSlots(date: Date): Promise<Array<TimeSlot & { remaining: number }>> {
    const slots: Array<TimeSlot & { remaining: number }> = []
    const now = new Date()
    
    for (const slot of OPTIMAL_TIME_SLOTS) {
      const slotTime = new Date(date)
      slotTime.setHours(slot.hour, 0, 0, 0)
      
      // 過去の時間帯はスキップ
      if (slotTime < now) continue
      
      // その時間帯の既存投稿数を取得
      const existingCount = await this.getSlotPostCount(slotTime)
      const remaining = slot.maxPosts - existingCount
      
      if (remaining > 0) {
        slots.push({
          ...slot,
          remaining,
        })
      }
    }
    
    return slots
  }

  /**
   * 特定時間帯の投稿数を取得
   */
  private async getSlotPostCount(slotTime: Date): Promise<number> {
    const start = new Date(slotTime)
    const end = addMinutes(start, 59)
    
    return await prisma.scheduledPost.count({
      where: {
        scheduledAt: {
          gte: start,
          lte: end,
        },
      },
    })
  }

  /**
   * スケジュール時刻を計算
   */
  private getScheduledTime(date: Date, slot: TimeSlot): Date {
    const scheduledAt = new Date(date)
    scheduledAt.setHours(slot.hour)
    
    // 時間内でランダムに分散
    const randomMinutes = Math.floor(Math.random() * 45) + 5 // 5-50分
    scheduledAt.setMinutes(randomMinutes)
    scheduledAt.setSeconds(0)
    scheduledAt.setMilliseconds(0)
    
    return scheduledAt
  }

  /**
   * RTスコアを計算
   */
  calculateRTScore(post: any): number {
    let score = 0
    
    // 基本スコア
    score += post.likeCount * 1
    score += post.retweetCount * 2
    score += post.replyCount * 0.5
    
    // エンゲージメント率
    const totalEngagement = post.likeCount + post.retweetCount + post.replyCount
    const engagementRate = totalEngagement / (post.impressionCount || 1)
    score *= (1 + engagementRate * 10)
    
    // フォロワー数による調整
    if (post.authorFollowerCount > 10000) {
      score *= 1.5
    } else if (post.authorFollowerCount > 1000) {
      score *= 1.2
    }
    
    return Math.round(score)
  }

  /**
   * 複数のRT戦略を予約
   */
  async scheduleMultipleRTs(
    postId: string,
    originalContent: string,
    strategies: any[],
    draftId?: string,
    draftType?: 'viral' | 'cot',
    character?: any
  ) {
    const scheduledRTs = []
    
    for (const strategy of strategies) {
      const scheduledAt = new Date(strategy.scheduledAt)
      const scheduledRT = await prisma.scheduledRetweet.create({
        data: {
          originalPostId: postId,
          originalContent,
          scheduledAt,
          rtStrategy: strategy.type,
          addComment: strategy.comment !== undefined,
          commentText: strategy.comment,
          characterId: character?.id,
          status: 'SCHEDULED',
          ...(draftId && draftType === 'viral' && {
            viralDraftId: draftId
          }),
          ...(draftId && draftType === 'cot' && {
            cotDraftId: draftId
          })
        }
      })
      
      scheduledRTs.push(scheduledRT)
    }
    
    return scheduledRTs
  }
}