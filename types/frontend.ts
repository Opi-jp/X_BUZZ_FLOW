/**
 * フロントエンド統一型定義
 * Create→Draft→Postフロー専用
 */

// === Core Flow Types ===
export interface FlowSession {
  id: string
  theme: string
  currentStep: FlowStep
  nextAction: NextAction | null
  progress: FlowProgress
  error?: string
  data: FlowData
  timestamp: string
}

export type FlowStep = 
  | 'initializing'
  | 'collecting_topics' 
  | 'generating_concepts'
  | 'awaiting_concept_selection'
  | 'awaiting_character_selection'
  | 'generating_contents'
  | 'completed'
  | 'error'

export type NextAction = 
  | 'collect_topics'
  | 'generate_concepts' 
  | 'select_concepts'
  | 'select_character'
  | 'generate_contents'
  | 'create_drafts'
  | null

export interface FlowProgress {
  phase1_collecting: boolean
  phase2_concepts: boolean
  phase3_contents: boolean
  completed: boolean
}

export interface FlowData {
  topics?: string | PerplexityTopics
  concepts?: ConceptOption[]
  selectedConcepts?: ConceptOption[]
  contents?: GeneratedContent[]
}

// === Content Generation Types ===
export interface PerplexityTopics {
  topic1: TopicData
  topic2: TopicData
}

export interface TopicData {
  TOPIC: string
  title: string
  source: string
  url: string
  date: string
  summary: string
  keyPoints: string[]
  perplexityAnalysis: string
}

export interface ConceptOption {
  conceptId: string
  conceptTitle: string
  topicTitle: string
  selectedHook: string
  selectedAngle: string
  viralScore: number
  structure: PostStructure
  format: 'single' | 'thread'
  timing: string
  visual: string
  hashtags: string[]
  topicUrl: string
  topicSummary: string
  viralFactors: string[]
  hookOptions: HookOption[]
  angleOptions: AngleOption[]
}

export interface PostStructure {
  openingHook: string
  background: string
  mainContent: string
  reflection: string
  cta: string
}

export interface HookOption {
  type: 'Surprise' | 'Urgency' | 'Identity' | 'Tension' | 'Clarity'
  description: string
}

export interface AngleOption {
  type: '予測・考察型' | 'ライフハック型' | '問題提起型' | 'データ駆動型' | 'わかりやすい解説型'
  description: string
}

export interface GeneratedContent {
  id: string
  content: string
  hashtags: string[]
  characterId: string
  conceptId: string
  format: 'single' | 'thread'
  estimatedImpact: number
}

// === Draft Management Types ===
export interface DraftItem {
  id: string
  sessionId: string
  content: string
  hashtags: string[]
  characterId: string
  status: 'DRAFT' | 'POSTED'
  scheduledAt?: string
  postedAt?: string
  twitterUrl?: string
  createdAt: string
  updatedAt: string
}

// === UI State Types ===
export interface UIState {
  loading: boolean
  error: string | null
  selectedConcepts: string[]
  selectedCharacter: string | null
  processingAction: boolean
}

// === API Response Types ===
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  timestamp: string
}

export interface FlowApiResponse extends ApiResponse<FlowSession> {}
export interface DraftApiResponse extends ApiResponse<DraftItem[]> {}

// === Character Types ===
export interface CharacterProfile {
  id: string
  name: string
  description: string
  tone: string
  style: string[]
  strengths: string[]
}

// === Error Types ===
export interface FrontendError {
  code: string
  message: string
  details?: any
  timestamp: string
  context: {
    component: string
    action: string
    sessionId?: string
  }
}

// === Constants ===
export const CHARACTERS: Record<string, CharacterProfile> = {
  'cardi-dare': {
    id: 'cardi-dare',
    name: 'カーディ・ダーレ',
    description: '53歳、元詐欺師・元王様（いまはただの飲んだくれ）',
    tone: 'シニカルだが愛のある毒舌',
    style: ['皮肉', '洞察', 'ユーモア'],
    strengths: ['人間の本質を見抜く', '複雑な話を簡潔に', '感情に訴える']
  },
  'neutral': {
    id: 'neutral',
    name: 'ニュートラル',
    description: '親しみやすく分かりやすいトーン',
    tone: '丁寧で親しみやすい',
    style: ['わかりやすさ', '共感', '建設的'],
    strengths: ['情報整理', '論理的説明', 'バランス感覚']
  }
}

export const FLOW_STEPS: Record<FlowStep, { label: string; icon: string; description: string }> = {
  initializing: { 
    label: '初期化中', 
    icon: '🚀', 
    description: 'セッションを準備しています' 
  },
  collecting_topics: { 
    label: 'トピック収集中', 
    icon: '🔍', 
    description: 'Perplexityで最新情報を収集中' 
  },
  generating_concepts: { 
    label: 'コンセプト生成中', 
    icon: '💡', 
    description: 'GPTでバイラルコンセプトを生成中' 
  },
  awaiting_concept_selection: { 
    label: 'コンセプト選択待ち', 
    icon: '🎯', 
    description: '生成されたコンセプトから選択してください' 
  },
  awaiting_character_selection: { 
    label: 'キャラクター選択待ち', 
    icon: '🎭', 
    description: '投稿のトーンを選択してください' 
  },
  generating_contents: { 
    label: '投稿生成中', 
    icon: '✍️', 
    description: 'Claudeで投稿文を生成中' 
  },
  completed: { 
    label: '完了', 
    icon: '✅', 
    description: '投稿の生成が完了しました' 
  },
  error: { 
    label: 'エラー', 
    icon: '❌', 
    description: 'エラーが発生しました' 
  }
}