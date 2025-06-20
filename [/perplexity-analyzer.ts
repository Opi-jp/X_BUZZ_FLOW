/**
 * Perplexity API を使用した記事詳細分析モジュール
 * 
 * Google検索で取得した記事URLを、Perplexityで詳細分析し、
 * バイラルトピック抽出に必要な情報を補強する
 */

import { PerplexityClient } from './perplexity'

interface ArticleAnalysisRequest {
  title: string
  url: string
  snippet: string
  query: string
}

interface ArticleAnalysisResponse {
  title: string
  url: string
  originalSnippet: string
  perplexityAnalysis: {
    summary: string          // 200-300文字の要約
    keyPoints: string[]      // 主要ポイント（3-5個）
    emotionalTone: string    // 感情的トーン（議論的、共感的、中立的など）
    controversyLevel: string // 議論性レベル（高/中/低）
    viralElements: {
      hasStrongOpinions: boolean
      hasEmotionalTriggers: boolean
      hasTimeSensitivity: boolean
      hasRelatability: boolean
    }
    themeRelevance: string // テーマとの関連性
    quotes: string[]         // 重要な引用（あれば）
  }
  analysisQuality: {
    success: boolean
    limitations?: string[]
  }
}

export class PerplexityAnalyzer {
  private client: PerplexityClient

  constructor() {
    this.client = new PerplexityClient()
  }

  /**
   * 複数の記事を並列で分析
   */
  async analyzeArticles(
    articles: ArticleAnalysisRequest[],
    theme: string,
    batchSize: number = 5
  ): Promise<ArticleAnalysisResponse[]> {
    console.log(`[PerplexityAnalyzer] 分析開始: ${articles.length}記事`)
    
    const results: ArticleAnalysisResponse[] = []
    
    // バッチ処理で並列実行
    for (let i = 0; i < articles.length; i += batchSize) {
      const batch = articles.slice(i, i + batchSize)
      const batchPromises = batch.map(article => 
        this.analyzeArticle(article, theme)
      )
      
      try {
        const batchResults = await Promise.all(batchPromises)
        results.push(...batchResults)
        console.log(`[PerplexityAnalyzer] バッチ ${Math.floor(i/batchSize) + 1} 完了`)
      } catch (error) {
        console.error(`[PerplexityAnalyzer] バッチエラー:`, error)
        // エラーが発生してもfallback結果を返す
        const fallbackResults = batch.map(article => 
          this.createFallbackResponse(article)
        )
        results.push(...fallbackResults)
      }
    }
    
    return results
  }

  /**
   * 単一記事の詳細分析
   */
  private async analyzeArticle(
    article: ArticleAnalysisRequest,
    theme: string
  ): Promise<ArticleAnalysisResponse> {
    const prompt = `
以下の記事を分析し、「${theme}」というテーマでバイラルコンテンツを作成する機会を評価してください。

記事タイトル: ${article.title}
URL: ${article.url}
検索クエリ: ${article.query}
概要: ${article.snippet}

この記事について以下を分析してください：

1. **要約**（200-300文字）
   - 記事の主要な内容
   - なぜこれが話題になっているか

2. **キーポイント**（3-5個）
   - 最も重要な情報や主張

3. **感情的要素**
   - 記事のトーン（議論的/共感的/警告的/楽観的など）
   - 読者の感情を刺激する要素

4. **議論性**
   - 賛否両論を呼ぶ可能性（高/中/低）
   - 具体的な論点

5. **バイラル要素**
   - 強い意見や主張があるか
   - 感情的なトリガーがあるか
   - 時間的な緊急性があるか
   - 多くの人が共感できる内容か

6. **${theme}との関連性**
   - このテーマに関連してバズを生み出せるポイント
   - 独自の視点や切り口を加えられる部分

7. **重要な引用**（あれば）
   - 記事内の印象的な発言や数字

注意：記事全体を読み込んで、snippetでは分からない詳細な文脈も含めて分析してください。`

    try {
      const response = await this.client.searchWithContext({
        query: `記事を読んで分析: ${article.url}`,
        systemPrompt: prompt,
        searchDomains: [new URL(article.url).hostname]
      })

      return this.parsePerplexityResponse(article, response)
    } catch (error) {
      console.error(`[PerplexityAnalyzer] 記事分析エラー: ${article.url}`, error)
      return this.createFallbackResponse(article)
    }
  }

  /**
   * Perplexityのレスポンスを構造化
   */
  private parsePerplexityResponse(
    article: ArticleAnalysisRequest,
    response: any
  ): ArticleAnalysisResponse {
    // Perplexityの応答から構造化データを抽出
    const content = response.choices?.[0]?.message?.content || ''
    
    // 簡易的なパース（実際にはより高度な解析が必要）
    const analysis = {
      summary: this.extractSection(content, '要約') || article.snippet,
      keyPoints: this.extractBulletPoints(content, 'キーポイント'),
      emotionalTone: this.extractValue(content, '感情的要素') || '不明',
      controversyLevel: this.extractValue(content, '議論性') || '中',
      viralElements: {
        hasStrongOpinions: content.includes('強い意見') || content.includes('主張'),
        hasEmotionalTriggers: content.includes('感情') || content.includes('怒り') || content.includes('喜び'),
        hasTimeSensitivity: content.includes('緊急') || content.includes('今すぐ'),
        hasRelatability: content.includes('共感') || content.includes('多くの人')
      },
      themeRelevance: this.extractSection(content, '関連性') || '',
      quotes: this.extractQuotes(content)
    }

    return {
      title: article.title,
      url: article.url,
      originalSnippet: article.snippet,
      perplexityAnalysis: analysis,
      analysisQuality: {
        success: true,
        limitations: content.length < 200 ? ['分析が不完全な可能性があります'] : undefined
      }
    }
  }

  /**
   * エラー時のフォールバック応答
   */
  private createFallbackResponse(
    article: ArticleAnalysisRequest
  ): ArticleAnalysisResponse {
    return {
      title: article.title,
      url: article.url,
      originalSnippet: article.snippet,
      perplexityAnalysis: {
        summary: article.snippet, // snippetをそのまま使用
        keyPoints: [],
        emotionalTone: '不明',
        controversyLevel: '不明',
        viralElements: {
          hasStrongOpinions: false,
          hasEmotionalTriggers: false,
          hasTimeSensitivity: false,
          hasRelatability: false
        },
        themeRelevance: '',
        quotes: []
      },
      analysisQuality: {
        success: false,
        limitations: ['Perplexity APIでの分析に失敗しました']
      }
    }
  }

  // ヘルパーメソッド
  private extractSection(content: string, sectionName: string): string {
    const regex = new RegExp(`${sectionName}[：:：]?\\s*([^\\n]+(?:\\n(?!\\d+\\.|\\*)[^\\n]+)*)`, 'i')
    const match = content.match(regex)
    return match ? match[1].trim() : ''
  }

  private extractBulletPoints(content: string, sectionName: string): string[] {
    const sectionRegex = new RegExp(`${sectionName}[：:：]?\\s*([^]+?)(?=\\n\\d+\\.|\\n\\*\\*|$)`, 'i')
    const sectionMatch = content.match(sectionRegex)
    if (!sectionMatch) return []
    
    const bulletRegex = /[・•\-\*]\s*(.+)/g
    const bullets: string[] = []
    let match
    while ((match = bulletRegex.exec(sectionMatch[1])) !== null) {
      bullets.push(match[1].trim())
    }
    return bullets.slice(0, 5) // 最大5個
  }

  private extractValue(content: string, label: string): string {
    const regex = new RegExp(`${label}[：:：]?\\s*([^\\n,，。]+)`, 'i')
    const match = content.match(regex)
    return match ? match[1].trim() : ''
  }

  private extractQuotes(content: string): string[] {
    const quoteRegex = /「([^」]+)」/g
    const quotes: string[] = []
    let match
    while ((match = quoteRegex.exec(content)) !== null) {
      if (match[1].length > 20) { // 意味のある引用のみ
        quotes.push(match[1])
      }
    }
    return quotes.slice(0, 3) // 最大3個
  }
}

/**
 * 分析結果の品質を評価
 */
export function evaluateAnalysisQuality(
  results: ArticleAnalysisResponse[]
): {
  successRate: number
  averageQuality: number
  recommendations: string[]
} {
  const successful = results.filter(r => r.analysisQuality.success).length
  const successRate = successful / results.length
  
  // 品質スコアの計算（0-1）
  const qualityScores = results.map(r => {
    let score = 0
    if (r.analysisQuality.success) score += 0.3
    if (r.perplexityAnalysis.summary.length > 150) score += 0.2
    if (r.perplexityAnalysis.keyPoints.length >= 3) score += 0.2
    if (r.perplexityAnalysis.emotionalTone !== '不明') score += 0.15
    if (r.perplexityAnalysis.quotes.length > 0) score += 0.15
    return score
  })
  
  const averageQuality = qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
  
  const recommendations: string[] = []
  if (successRate < 0.8) {
    recommendations.push('Perplexity APIの接続を確認してください')
  }
  if (averageQuality < 0.7) {
    recommendations.push('分析プロンプトの改善を検討してください')
  }
  
  return { successRate, averageQuality, recommendations }
}