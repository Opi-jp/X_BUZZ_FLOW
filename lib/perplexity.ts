import axios from 'axios'

export interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface PerplexityOptions {
  model?: string
  temperature?: number
  max_tokens?: number
  stream?: boolean
}

export class PerplexityClient {
  private apiKey: string
  private baseURL = 'https://api.perplexity.ai'

  constructor(apiKey?: string) {
    const key = apiKey || process.env.PERPLEXITY_API_KEY
    if (!key) {
      throw new Error('Perplexity API key is required')
    }
    this.apiKey = key
  }

  async createCompletion(
    messages: PerplexityMessage[],
    options: PerplexityOptions = {}
  ) {
    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: options.model || 'llama-3.1-sonar-large-128k-online',
          messages,
          temperature: options.temperature || 0.7,
          max_tokens: options.max_tokens || 4000,
          stream: options.stream || false,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      )

      return response.data
    } catch (error: any) {
      console.error('Perplexity API error:', error.response?.data || error.message)
      throw new Error(
        `Perplexity API error: ${error.response?.data?.error?.message || error.message}`
      )
    }
  }

  /**
   * シンプルな質問応答
   */
  async ask(question: string, systemPrompt?: string): Promise<string> {
    const messages: PerplexityMessage[] = []
    
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt,
      })
    }
    
    messages.push({
      role: 'user',
      content: question,
    })

    const response = await this.createCompletion(messages)
    return response.choices[0].message.content
  }
}