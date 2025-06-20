/**
 * Google Gemini API統合クライアント
 * 統合分析とコンテンツ解析用
 */

interface GeminiAnalysisResult {
  keywords: string[]
  topics: string[]
  sentiment: 'positive' | 'negative' | 'neutral'
  viralPotential: number
  importance: number
  summary: string
  trendFactors: string[]
}

interface CrossAnalysisResult {
  correlations: Array<{
    newsId?: string
    buzzId?: string
    keyword: string
    relevance: number
    viralPotential: number
  }>
  trendingTopics: Array<{
    topic: string
    confidence: number
    sources: string[]
    viralFactors: string[]
  }>
  contentRecommendations: Array<{
    type: 'news_angle' | 'buzz_pattern' | 'hybrid'
    title: string
    strategy: string
    expectedEngagement: number
  }>
  summary: string
}

class GeminiAnalyzer {
  private apiKey: string
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent'

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || ''
    if (!this.apiKey) {
      console.warn('GEMINI_API_KEY not found, using fallback analysis')
    }
  }

  /**
   * ニュース記事の詳細分析
   */
  async analyzeNewsArticle(article: {
    title: string
    description?: string
    content?: string
    category?: string
  }): Promise<GeminiAnalysisResult> {
    if (!this.apiKey) {
      return this.fallbackNewsAnalysis(article)
    }

    try {
      const prompt = `
以下のニュース記事を分析して、バイラルコンテンツ作成の観点から詳細に解析してください。

記事情報:
タイトル: ${article.title}
説明: ${article.description || ''}
カテゴリ: ${article.category || '不明'}

以下の観点で分析し、JSON形式で回答してください:

1. キーワード抽出 (最大10個)
2. 主要トピック (最大5個)
3. 感情的トーン (positive/negative/neutral)
4. バイラル可能性 (0.0-1.0)
5. 重要度 (0.0-1.0)
6. 要約 (100文字以内)
7. バイラル要因 (話題になる理由)

{
  "keywords": ["キーワード1", "キーワード2"],
  "topics": ["トピック1", "トピック2"],
  "sentiment": "positive",
  "viralPotential": 0.8,
  "importance": 0.9,
  "summary": "記事の要約",
  "trendFactors": ["話題になる理由1", "話題になる理由2"]
}
`

      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      })

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`)
      }

      const data = await response.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text

      if (!text) {
        throw new Error('No response from Gemini')
      }

      // JSONを抽出
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      return JSON.parse(jsonMatch[0])

    } catch (error) {
      console.error('Gemini analysis error:', error)
      return this.fallbackNewsAnalysis(article)
    }
  }

  /**
   * バズ投稿の詳細分析
   */
  async analyzeBuzzPost(post: {
    content: string
    likes: number
    retweets: number
    replies: number
    hashtags?: string[]
  }): Promise<GeminiAnalysisResult> {
    if (!this.apiKey) {
      return this.fallbackBuzzAnalysis(post)
    }

    try {
      const prompt = `
以下のバズった投稿を分析して、なぜバズったのか、どんな要素が効果的だったかを詳細に解析してください。

投稿内容: ${post.content}
いいね数: ${post.likes}
リツイート数: ${post.retweets}
返信数: ${post.replies}
ハッシュタグ: ${post.hashtags?.join(', ') || ''}

以下の観点で分析し、JSON形式で回答してください:

1. 効果的なキーワード (最大10個)
2. 話題のトピック (最大5個)
3. 感情的インパクト (positive/negative/neutral)
4. バイラル要因の強さ (0.0-1.0)
5. コンテンツの重要度 (0.0-1.0)
6. バズ理由の要約 (100文字以内)
7. バイラル成功要因 (具体的な理由)

{
  "keywords": ["効果的キーワード1", "効果的キーワード2"],
  "topics": ["話題トピック1", "話題トピック2"],
  "sentiment": "positive",
  "viralPotential": 0.9,
  "importance": 0.8,
  "summary": "バズった理由の要約",
  "trendFactors": ["成功要因1", "成功要因2"]
}
`

      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      })

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`)
      }

      const data = await response.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text

      if (!text) {
        throw new Error('No response from Gemini')
      }

      // JSONを抽出
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      return JSON.parse(jsonMatch[0])

    } catch (error) {
      console.error('Gemini buzz analysis error:', error)
      return this.fallbackBuzzAnalysis(post)
    }
  }

  /**
   * ニュース×バズの横断分析
   */
  async analyzeCrossCorrelation(
    newsArticles: any[],
    buzzPosts: any[]
  ): Promise<CrossAnalysisResult> {
    if (!this.apiKey) {
      return this.fallbackCrossAnalysis(newsArticles, buzzPosts)
    }

    try {
      const newsContext = newsArticles.map(a => 
        `[News] ${a.title}: ${a.description || ''}`
      ).join('\n')

      const buzzContext = buzzPosts.map(p => 
        `[Buzz] ${p.content} (${p.likesCount}❤️ ${p.retweetsCount}🔄)`
      ).join('\n')

      const prompt = `
以下のニュース記事とバズ投稿を分析して、相関関係とトレンドを特定し、効果的なバイラルコンテンツ作成の戦略を提案してください。

ニュース記事:
${newsContext}

バズ投稿:
${buzzContext}

以下の分析を実行し、JSON形式で回答してください:

1. 相関関係の特定 (ニュースとバズの共通キーワード・トピック)
2. トレンドトピックの抽出 (話題の中心テーマ)
3. コンテンツ推奨戦略 (具体的な作成アプローチ)
4. 全体サマリー

{
  "correlations": [
    {
      "newsId": "記事1",
      "buzzId": "投稿1", 
      "keyword": "共通キーワード",
      "relevance": 0.8,
      "viralPotential": 0.9
    }
  ],
  "trendingTopics": [
    {
      "topic": "トレンドトピック",
      "confidence": 0.9,
      "sources": ["ニュース", "バズ"],
      "viralFactors": ["バイラル要因1", "バイラル要因2"]
    }
  ],
  "contentRecommendations": [
    {
      "type": "hybrid",
      "title": "推奨コンテンツタイトル",
      "strategy": "具体的な戦略",
      "expectedEngagement": 0.8
    }
  ],
  "summary": "全体分析のサマリー"
}
`

      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      })

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`)
      }

      const data = await response.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text

      if (!text) {
        throw new Error('No response from Gemini')
      }

      // JSONを抽出
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      return JSON.parse(jsonMatch[0])

    } catch (error) {
      console.error('Gemini cross analysis error:', error)
      return this.fallbackCrossAnalysis(newsArticles, buzzPosts)
    }
  }

  // フォールバック分析機能

  private fallbackNewsAnalysis(article: any): GeminiAnalysisResult {
    const keywords = this.extractKeywords(article.title + ' ' + (article.description || ''))
    return {
      keywords,
      topics: keywords.slice(0, 3),
      sentiment: 'neutral',
      viralPotential: 0.5,
      importance: 0.6,
      summary: article.title.substring(0, 100),
      trendFactors: ['時事性', '社会的関心']
    }
  }

  private fallbackBuzzAnalysis(post: any): GeminiAnalysisResult {
    const keywords = this.extractKeywords(post.content)
    const engagementRate = (post.likes + post.retweets) / Math.max(post.likes + post.retweets + 100, 1)
    
    return {
      keywords,
      topics: keywords.slice(0, 3),
      sentiment: post.likes > post.replies ? 'positive' : 'neutral',
      viralPotential: Math.min(engagementRate * 2, 1.0),
      importance: Math.min(engagementRate * 1.5, 1.0),
      summary: post.content.substring(0, 100),
      trendFactors: ['高エンゲージメント', '共感性']
    }
  }

  private fallbackCrossAnalysis(newsArticles: any[], buzzPosts: any[]): CrossAnalysisResult {
    return {
      correlations: [],
      trendingTopics: [{
        topic: 'トレンドトピック',
        confidence: 0.7,
        sources: ['ニュース', 'バズ'],
        viralFactors: ['時事性', 'エンゲージメント']
      }],
      contentRecommendations: [{
        type: 'hybrid',
        title: '統合コンテンツ推奨',
        strategy: 'ニュースとバズの要素を組み合わせ',
        expectedEngagement: 0.7
      }],
      summary: `${newsArticles.length}件のニュースと${buzzPosts.length}件のバズ投稿を分析`
    }
  }

  private extractKeywords(text: string): string[] {
    return text.split(/[\s\p{P}]+/u)
      .filter(word => word.length > 2)
      .filter(word => !/^[@#]/.test(word))
      .slice(0, 10)
  }
}

export const geminiAnalyzer = new GeminiAnalyzer()
export type { GeminiAnalysisResult, CrossAnalysisResult }