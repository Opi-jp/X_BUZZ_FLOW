// Viral V2 Session Management Types

export interface ViralSession {
  id: string
  theme: string
  platform: string
  style: string
  status: SessionStatus
  createdAt: string
  updatedAt?: string
  characterProfileId?: string
  voiceStyleMode?: string
  topics?: TopicsData
  concepts?: Concept[]
  selectedIds: string[]
  contents?: any
  drafts?: Draft[]
  _count?: {
    drafts: number
  }
}

export enum SessionStatus {
  CREATED = 'CREATED',
  COLLECTING = 'COLLECTING',
  TOPICS_COLLECTED = 'TOPICS_COLLECTED',
  CONCEPTS_GENERATED = 'CONCEPTS_GENERATED',
  CONTENTS_GENERATED = 'CONTENTS_GENERATED',
  COMPLETED = 'COMPLETED'
}

export interface TopicsData {
  raw: string
  parsed: Topic[]
  sources?: any[]
  citations?: any[]
}

export interface Topic {
  TOPIC: string
  url: string
  date: string
  summary: string
  keyPoints: string[]
  perplexityAnalysis: string
  additionalSources?: {
    url: string
    title: string
    date: string
  }[]
}

export interface Concept {
  conceptId: string
  format: 'single' | 'thread' | 'carousel'
  hookType: string
  angle: string
  structure: {
    openingHook: string
    background: string
    mainContent: string
    reflection: string
    cta: string
  }
  visual: string
  timing: string
  hashtags: string[]
}

export interface Draft {
  id: string
  sessionId: string
  conceptId: string
  title: string
  content: string
  hashtags: string[]
  visualNote?: string
  status: 'draft' | 'scheduled' | 'posted'
  scheduledAt?: string
  postedAt?: string
  createdAt: string
  updatedAt: string
}

// API Response Types
export interface SessionResponse {
  session: ViralSession
  error?: never
}

export interface ErrorResponse {
  error: string
  session?: never
}

export type ApiResponse<T> = T | ErrorResponse

// Type Guards
export function isErrorResponse(response: any): response is ErrorResponse {
  return 'error' in response && !response.session
}

export function isValidSession(session: any): session is ViralSession {
  return (
    session &&
    typeof session.id === 'string' &&
    typeof session.theme === 'string' &&
    typeof session.platform === 'string' &&
    typeof session.style === 'string' &&
    typeof session.status === 'string'
  )
}

export function isValidSessionId(id: any): id is string {
  return typeof id === 'string' && id !== 'undefined' && id !== 'null' && id.length > 0
}