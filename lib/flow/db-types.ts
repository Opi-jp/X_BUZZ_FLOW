// DBスキーマと整合性のある型定義
// viral_sessionsテーブルの構造に基づく

export interface ViralSessionDB {
  id: string
  theme: string
  platform: string
  style: string
  status: 'CREATED' | 'COLLECTING' | 'TOPICS_COLLECTED' | 'GENERATING_CONCEPTS' | 'CONCEPTS_GENERATED' | 'DRAFTS_CREATED'
  created_at: Date
  topics?: any // JSON
  concepts?: any // JSON
  selected_ids: string[] // 選択されたコンセプトID
  contents?: any // JSON
  character_profile_id?: string
  voice_style_mode?: string
}

// viral_draftsテーブルの構造
export interface ViralDraftDB {
  id: string
  session_id: string
  concept_id: string
  title: string
  content: string
  edited_content?: string
  is_edited: boolean
  edited_at?: Date
  hashtags: string[]
  visual_note?: string
  status: string
  scheduled_at?: Date
  posted_at?: Date
  tweet_id?: string
  source_tweets?: any // JSON
  thread_structure?: any // JSON
  post_history?: any // JSON
  created_at: Date
  updated_at: Date
  character_id?: string
  character_note?: string
  source_url?: string
  news_article_id?: string
}

// APIレスポンスとDBの変換マッピング
export const DB_STATUS_TO_FLOW_STATUS: Record<string, string> = {
  'CREATED': 'initializing',
  'COLLECTING': 'collecting_topics',
  'TOPICS_COLLECTED': 'topics_collected',
  'GENERATING_CONCEPTS': 'generating_concepts',
  'CONCEPTS_GENERATED': 'awaiting_concept_selection',
  'DRAFTS_CREATED': 'completed'
}

// フロー状態からDBステータスへの変換
export const FLOW_STATUS_TO_DB_STATUS: Record<string, string> = {
  'initializing': 'CREATED',
  'collecting_topics': 'COLLECTING',
  'topics_collected': 'TOPICS_COLLECTED',
  'generating_concepts': 'GENERATING_CONCEPTS',
  'awaiting_concept_selection': 'CONCEPTS_GENERATED',
  'awaiting_character_selection': 'CONCEPTS_GENERATED',
  'generating_contents': 'CONCEPTS_GENERATED',
  'completed': 'DRAFTS_CREATED'
}

// セッションの進捗状況を判定
export function getSessionProgress(session: ViralSessionDB) {
  return {
    phase1_collecting: session.status !== 'CREATED' && session.topics != null,
    phase2_concepts: ['GENERATING_CONCEPTS', 'CONCEPTS_GENERATED', 'DRAFTS_CREATED'].includes(session.status) && session.concepts != null,
    phase3_contents: session.status === 'DRAFTS_CREATED' && session.contents != null,
    completed: session.status === 'DRAFTS_CREATED'
  }
}

// 次のアクションを判定
export function getNextAction(session: ViralSessionDB): string | null {
  switch (session.status) {
    case 'CREATED':
      return 'collect_topics'
    case 'TOPICS_COLLECTED':
      return 'generate_concepts'
    case 'CONCEPTS_GENERATED':
      if (session.selected_ids.length === 0) {
        return 'select_concepts'
      }
      if (!session.contents) {
        return 'select_character'
      }
      return null
    case 'DRAFTS_CREATED':
      return null
    default:
      return null
  }
}

// DBフィールド名の変換ヘルパー
export const fieldNameMap = {
  // Frontend -> DB
  toDb: {
    selectedIds: 'selected_ids',
    characterProfileId: 'character_profile_id',
    voiceStyleMode: 'voice_style_mode',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    editedAt: 'edited_at',
    scheduledAt: 'scheduled_at',
    postedAt: 'posted_at',
    isEdited: 'is_edited'
  },
  // DB -> Frontend
  toFrontend: {
    selected_ids: 'selectedIds',
    character_profile_id: 'characterProfileId',
    voice_style_mode: 'voiceStyleMode',
    created_at: 'createdAt',
    updated_at: 'updatedAt',
    edited_at: 'editedAt',
    scheduled_at: 'scheduledAt',
    posted_at: 'postedAt',
    is_edited: 'isEdited'
  }
}

// DBデータをフロントエンド用に変換
export function transformSessionForFrontend(dbSession: ViralSessionDB): any {
  const progress = getSessionProgress(dbSession)
  const nextAction = getNextAction(dbSession)
  const currentStep = DB_STATUS_TO_FLOW_STATUS[dbSession.status] || 'initializing'
  
  return {
    id: dbSession.id,
    theme: dbSession.theme,
    currentStep,
    nextAction,
    progress,
    error: null,
    data: {
      topics: dbSession.topics,
      concepts: dbSession.concepts || [],
      selectedConcepts: dbSession.selected_ids || [],
      contents: dbSession.contents
    }
  }
}