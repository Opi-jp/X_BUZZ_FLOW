/**
 * Perplexityレスポンスパーサー
 * Markdown形式で返されるPerplexityのレスポンスからJSONを抽出する
 */

export interface PerplexityTopic {
  TOPIC: string
  title: string
  source: string
  url: string
  date: string
  summary: string
  keyPoints: string[]
  perplexityAnalysis: string
  additionalSources: Array<{
    url: string
    title: string
    source: string
    date: string
  }>
}

export class PerplexityResponseParser {
  /**
   * Markdown形式のレスポンスからトピックを抽出
   */
  static parseTopics(markdownResponse: string): PerplexityTopic[] {
    if (!markdownResponse || typeof markdownResponse !== 'string') {
      throw new Error('Invalid response: expected string')
    }

    console.log('Parsing Perplexity response, length:', markdownResponse.length)
    const topics: PerplexityTopic[] = []

    // コードブロック内のJSONを抽出
    // ```で囲まれたブロックを探す（前後の空白も考慮）
    const codeBlockRegex = /```\s*(?:json)?\s*\n([\s\S]*?)\n```/g
    let match

    while ((match = codeBlockRegex.exec(markdownResponse)) !== null) {
      const jsonContent = match[1].trim()
      console.log('Found code block, first 100 chars:', jsonContent.substring(0, 100))
      
      try {
        // JSONパース前の前処理
        let processedJson = jsonContent
        
        // 不完全なJSONを検出（最後のフィールドが切れている場合）
        if (processedJson.includes('...') && !processedJson.trim().endsWith('}')) {
          console.warn('Detected truncated JSON, attempting to fix...')
          // 最後の不完全な行を削除
          const lines = processedJson.split('\n')
          let lastValidLine = lines.length - 1
          
          // 最後の有効な行を探す
          while (lastValidLine >= 0 && !lines[lastValidLine].includes('}') && !lines[lastValidLine].includes(']')) {
            lastValidLine--
          }
          
          if (lastValidLine >= 0) {
            // 不完全な部分を削除して、JSONを閉じる
            processedJson = lines.slice(0, lastValidLine + 1).join('\n')
            
            // 必要に応じて閉じタグを追加
            const openBraces = (processedJson.match(/{/g) || []).length
            const closeBraces = (processedJson.match(/}/g) || []).length
            const openBrackets = (processedJson.match(/\[/g) || []).length
            const closeBrackets = (processedJson.match(/\]/g) || []).length
            
            // 閉じタグを追加
            if (openBrackets > closeBrackets) {
              processedJson += '\n]'
            }
            if (openBraces > closeBraces) {
              processedJson += '\n}'
            }
          }
        }
        
        // 改行文字のエスケープ処理
        // すべての文字列値内の改行をエスケープ
        processedJson = processedJson.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (match) => {
          return match.replace(/\n/g, '\\n').replace(/\r/g, '\\r')
        })
        
        // JSONをパース
        const topic = JSON.parse(processedJson) as PerplexityTopic
        
        // 必須フィールドの検証
        this.validateTopic(topic)
        
        topics.push(topic)
      } catch (error) {
        console.error('Failed to parse JSON block:', error)
        console.error('JSON content:', jsonContent.substring(0, 200) + '...')
        // パースエラーでも処理を続行（他のトピックは正常かもしれない）
      }
    }

    console.log('Total topics parsed:', topics.length)
    
    if (topics.length === 0) {
      console.error('No topics found. Response preview:', markdownResponse.substring(0, 500))
      throw new Error('No valid topics found in response')
    }

    return topics
  }

  /**
   * トピックの必須フィールドを検証
   */
  private static validateTopic(topic: any): void {
    const requiredFields = [
      'TOPIC',
      'title',
      'source',
      'url',
      'date',
      'summary',
      'keyPoints',
      'perplexityAnalysis'
    ]

    for (const field of requiredFields) {
      if (!topic[field]) {
        throw new Error(`Missing required field: ${field}`)
      }
    }

    // keyPointsは配列である必要がある
    if (!Array.isArray(topic.keyPoints)) {
      throw new Error('keyPoints must be an array')
    }

    // 文字数の検証
    if (topic.summary.length < 350 || topic.summary.length > 450) {
      console.warn(`Summary length out of range: ${topic.summary.length} characters`)
    }

    if (topic.perplexityAnalysis.length < 150 || topic.perplexityAnalysis.length > 250) {
      console.warn(`PerplexityAnalysis length out of range: ${topic.perplexityAnalysis.length} characters`)
    }
  }

  /**
   * 旧形式のレスポンスを処理（後方互換性のため）
   */
  static parseLegacyFormat(response: any): PerplexityTopic[] {
    // レスポンスがオブジェクトで、parsedプロパティを持つ場合
    if (response && typeof response === 'object' && response.parsed) {
      return response.parsed
    }

    // その他の形式はエラー
    throw new Error('Unsupported response format')
  }
}