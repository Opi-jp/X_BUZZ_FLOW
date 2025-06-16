/**
 * Perplexity API Client
 * 
 * Perplexity APIを使用してリアルタイム情報を取得・分析
 */

interface PerplexityConfig {
  apiKey?: string
  model?: string
  temperature?: number
  maxTokens?: number
}

interface PerplexitySearchOptions {
  query: string
  systemPrompt?: string
  searchDomains?: string[]
  searchRecency?: 'day' | 'week' | 'month' | 'year'
}

interface PerplexityResponse {
  id: string
  model: string
  choices: Array<{
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export class PerplexityClient {
  private apiKey: string
  private baseUrl: string = 'https://api.perplexity.ai'
  private defaultModel: string = 'llama-3.1-sonar-large-128k-online'
  
  constructor(config?: PerplexityConfig) {
    this.apiKey = config?.apiKey || process.env.PERPLEXITY_API_KEY || ''
    
    if (!this.apiKey) {
      throw new Error('Perplexity API key is required')
    }
    
    if (config?.model) {
      this.defaultModel = config.model
    }
  }
  
  /**
   * Perplexity APIで検索・分析を実行
   */
  async searchWithContext(options: PerplexitySearchOptions): Promise<PerplexityResponse> {
    const {
      query,
      systemPrompt = '',
      searchDomains = [],
      searchRecency = 'week'
    } = options
    
    const messages = [
      {
        role: 'system',
        content: systemPrompt || 'You are a helpful assistant that analyzes web content.'
      },
      {
        role: 'user',
        content: query
      }
    ]
    
    const requestBody = {
      model: this.defaultModel,
      messages,
      temperature: 0.2,
      max_tokens: 2000,
      search_domain_filter: searchDomains.length > 0 ? searchDomains : undefined,
      search_recency_filter: searchRecency,
      return_citations: true,
      return_images: false
    }
    
    try {
      // Create AbortController for timeout (more compatible than AbortSignal.timeout)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 120000) // 120秒のタイムアウト（Perplexityは時間がかかるため）
      
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      })
      
      // Clear timeout if request completes
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Perplexity API error: ${response.status} - ${error}`)
      }
      
      const data = await response.json() as PerplexityResponse
      return data
      
    } catch (error) {
      console.error('[PerplexityClient] API call failed:', error)
      throw error
    }
  }
  
  /**
   * 複数のURLを分析
   */
  async analyzeUrls(
    urls: string[],
    analysisPrompt: string
  ): Promise<PerplexityResponse> {
    const query = `Analyze the following URLs and provide insights: ${urls.join(', ')}`
    
    return this.searchWithContext({
      query,
      systemPrompt: analysisPrompt,
      searchDomains: urls.map(url => new URL(url).hostname)
    })
  }
  
  /**
   * トレンド分析
   */
  async analyzeTrend(
    topic: string,
    theme: string,
    recency: 'day' | 'week' = 'week'
  ): Promise<PerplexityResponse> {
    const systemPrompt = `
You are a viral content strategist who identifies emerging trends and creates content concepts that ride the wave before it peaks.
Analyze current trends and discussions about the given topic in the context of ${theme}.
Focus on:
1. What people are talking about
2. Emotional reactions and controversies
3. Viral potential
4. Unique angles for content creation
`
    
    return this.searchWithContext({
      query: `What are the latest discussions and trends about ${topic}?`,
      systemPrompt,
      searchRecency: recency
    })
  }
}

/**
 * Perplexityレスポンスからバイラル要素を抽出
 */
export function extractViralElements(response: PerplexityResponse): {
  hasControversy: boolean
  emotionalIntensity: 'high' | 'medium' | 'low'
  timeSensitivity: boolean
  shareability: number // 0-1
} {
  const content = response.choices[0]?.message?.content || ''
  const lowerContent = content.toLowerCase()
  
  // 議論性の検出
  const controversyKeywords = ['debate', 'controversy', '議論', '賛否', 'divided', '批判']
  const hasControversy = controversyKeywords.some(keyword => lowerContent.includes(keyword))
  
  // 感情的強度の検出
  const highEmotionKeywords = ['outrage', '怒り', 'shocking', '驚き', 'anger', '熱狂']
  const mediumEmotionKeywords = ['concern', '懸念', 'worry', '心配', 'excited', '期待']
  
  let emotionalIntensity: 'high' | 'medium' | 'low' = 'low'
  if (highEmotionKeywords.some(keyword => lowerContent.includes(keyword))) {
    emotionalIntensity = 'high'
  } else if (mediumEmotionKeywords.some(keyword => lowerContent.includes(keyword))) {
    emotionalIntensity = 'medium'
  }
  
  // 時間的緊急性の検出
  const urgencyKeywords = ['breaking', '速報', 'just', 'now', '今', '緊急', 'urgent']
  const timeSensitivity = urgencyKeywords.some(keyword => lowerContent.includes(keyword))
  
  // シェア可能性の計算（0-1）
  let shareability = 0.3 // ベーススコア
  if (hasControversy) shareability += 0.2
  if (emotionalIntensity === 'high') shareability += 0.3
  else if (emotionalIntensity === 'medium') shareability += 0.15
  if (timeSensitivity) shareability += 0.2
  
  return {
    hasControversy,
    emotionalIntensity,
    timeSensitivity,
    shareability: Math.min(1, shareability)
  }
}