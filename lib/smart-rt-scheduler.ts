import { addHours, addDays, setHours, getHours, isWeekend, startOfDay } from 'date-fns'
import { prisma } from '@/lib/generated/prisma'
import type { CharacterProfile } from '@/types/character'

export interface RTStrategy {
  id: string
  name: string
  description: string
  hoursAfter: number
  addComment: boolean
  commentType?: 'insight' | 'question' | 'update' | 'character'
}

// RT戦略定義
export const RT_STRATEGIES: RTStrategy[] = [
  {
    id: '6h_spike',
    name: '6時間後スパイク',
    description: 'エンゲージメントのピークが過ぎた後に再活性化',
    hoursAfter: 6,
    addComment: false
  },
  {
    id: 'next_day_reminder',
    name: '翌日リマインダー',
    description: '翌日の朝か昼に追加情報付きでRT',
    hoursAfter: 24,
    addComment: true,
    commentType: 'update'
  },
  {
    id: 'weekend_revival',
    name: '週末リバイバル',
    description: '週末の時間がある時に深い洞察を追加',
    hoursAfter: 72,
    addComment: true,
    commentType: 'insight'
  },
  {
    id: 'cardi_comment',
    name: 'カーディの一言',
    description: 'カーディ・ダーレの皮肉な視点を追加',
    hoursAfter: 12,
    addComment: true,
    commentType: 'character'
  }
]

export class SmartRTScheduler {
  // 最適なRT時間を計算（深夜回避）
  calculateOptimalRTTime(originalPostTime: Date, hoursToAdd: number): Date {
    let targetTime = addHours(originalPostTime, hoursToAdd)
    const hour = getHours(targetTime)
    
    // 深夜時間帯（23時〜6時）を回避
    if (hour >= 23 || hour < 6) {
      // 翌日の9時に調整
      targetTime = setHours(startOfDay(addDays(targetTime, 1)), 9)
    }
    // 早朝（6時〜8時）も避ける
    else if (hour >= 6 && hour < 8) {
      targetTime = setHours(targetTime, 9)
    }
    
    // 週末の場合は少し遅めに調整
    if (isWeekend(targetTime)) {
      const weekendHour = getHours(targetTime)
      if (weekendHour < 10) {
        targetTime = setHours(targetTime, 10)
      }
    }
    
    return this.adjustToOptimalSlot(targetTime)
  }
  
  // 最適な時間帯に微調整
  private adjustToOptimalSlot(time: Date): Date {
    const hour = getHours(time)
    const optimalSlots = [9, 12, 15, 18, 21] // 最適投稿時間
    
    // 最も近い最適時間を見つける
    const closestSlot = optimalSlots.reduce((prev, curr) => {
      return Math.abs(curr - hour) < Math.abs(prev - hour) ? curr : prev
    })
    
    return setHours(time, closestSlot)
  }
  
  // RTコメント生成（キャラクター対応）
  async generateRTComment(
    originalContent: string,
    commentType: string,
    character?: CharacterProfile
  ): Promise<string> {
    switch (commentType) {
      case 'character':
        if (character?.id === 'cardi-dare') {
          return this.generateCardiComment(originalContent)
        }
        return this.generateDefaultComment(originalContent, 'insight')
        
      case 'update':
        return this.generateUpdateComment(originalContent)
        
      case 'question':
        return this.generateQuestionComment(originalContent)
        
      case 'insight':
      default:
        return this.generateDefaultComment(originalContent, 'insight')
    }
  }
  
  // カーディ・ダーレ風コメント生成
  private generateCardiComment(original: string): string {
    const templates = [
      "結局のところ、AIに振り回されてるのは俺たちの方なんだよな。",
      "酒でも飲みながらじゃないと、この現実は受け入れられないね。",
      "まあ、しかたねえだろ。時代はこうやって変わっていくんだから。",
      "AIが賢くなればなるほど、人間の愚かさが際立つってもんさ。",
      "この話、10年前だったら笑い話だったんだがな。"
    ]
    
    return templates[Math.floor(Math.random() * templates.length)]
  }
  
  // 更新情報コメント
  private generateUpdateComment(original: string): string {
    const templates = [
      "【続報】この件について新しい動きがありました👇",
      "昨日の投稿の補足です。重要なポイントを追加します：",
      "多くの反響をいただいたので、追加情報をシェアします📝",
      "この話題、さらに深掘りしてみました。興味深い発見が…"
    ]
    
    return templates[Math.floor(Math.random() * templates.length)]
  }
  
  // 質問形式のコメント
  private generateQuestionComment(original: string): string {
    const templates = [
      "みなさんはこの件についてどう思いますか？意見を聞かせてください💭",
      "これ、実際に体験した方いますか？リプライで教えてください！",
      "この変化、あなたの業界ではどう影響していますか？",
      "正直な感想を聞きたいです。これって本当に必要だと思います？"
    ]
    
    return templates[Math.floor(Math.random() * templates.length)]
  }
  
  // デフォルトコメント
  private generateDefaultComment(original: string, type: string): string {
    return "まだまだ多くの方に見ていただきたい内容です。"
  }
  
  // RT予約の作成
  async scheduleRT(
    postId: string,
    originalContent: string,
    strategy: RTStrategy,
    draftId?: string,
    draftType?: 'viral' | 'cot',
    character?: CharacterProfile
  ) {
    const now = new Date()
    const scheduledAt = this.calculateOptimalRTTime(now, strategy.hoursAfter)
    
    let commentText: string | null = null
    if (strategy.addComment && strategy.commentType) {
      commentText = await this.generateRTComment(
        originalContent,
        strategy.commentType,
        character
      )
    }
    
    const data: any = {
      originalPostId: postId,
      originalContent,
      scheduledAt,
      rtStrategy: strategy.id,
      addComment: strategy.addComment,
      commentText
    }
    
    // Draft IDの設定
    if (draftId && draftType === 'viral') {
      data.viralDraftId = draftId
    } else if (draftId && draftType === 'cot') {
      data.cotDraftId = draftId
    }
    
    return await prisma.scheduledRetweet.create({ data })
  }
  
  // 複数のRT戦略を一度に予約
  async scheduleMultipleRTs(
    postId: string,
    originalContent: string,
    strategyIds: string[],
    draftId?: string,
    draftType?: 'viral' | 'cot',
    character?: CharacterProfile
  ) {
    const strategies = RT_STRATEGIES.filter(s => strategyIds.includes(s.id))
    const scheduled = []
    
    for (const strategy of strategies) {
      const rt = await this.scheduleRT(
        postId,
        originalContent,
        strategy,
        draftId,
        draftType,
        character
      )
      scheduled.push(rt)
    }
    
    return scheduled
  }
  
  // おすすめRT戦略を提案
  suggestRTStrategies(
    contentType: string,
    hasHighEngagement: boolean = false
  ): RTStrategy[] {
    if (contentType === 'news') {
      return RT_STRATEGIES.filter(s => 
        ['6h_spike', 'next_day_reminder'].includes(s.id)
      )
    }
    
    if (contentType === 'thread') {
      return RT_STRATEGIES.filter(s => 
        ['next_day_reminder', 'weekend_revival'].includes(s.id)
      )
    }
    
    if (hasHighEngagement) {
      return RT_STRATEGIES.filter(s => 
        ['6h_spike', 'cardi_comment', 'weekend_revival'].includes(s.id)
      )
    }
    
    // デフォルト
    return [RT_STRATEGIES[0]] // 6h_spike
  }
}