/**
 * GPT Responses APIのレスポンスを確実にパースするユーティリティ
 */

export interface ParsedResponse {
  success: boolean
  data?: any
  rawText?: string
  error?: string
}

/**
 * Responses APIのレスポンスからテキストを抽出
 */
export function extractTextFromResponse(response: any): string {
  // nullやundefinedのチェック
  if (!response) {
    console.warn('Response is null or undefined')
    return ''
  }
  
  // ケース1: 配列形式のレスポンス
  if (Array.isArray(response)) {
    const messageItem = response.find((item: any) => item.type === 'message')
    if (messageItem?.content?.[0]?.text) {
      return messageItem.content[0].text
    }
    
    // その他の配列要素から探す
    for (const item of response) {
      if (item.output && typeof item.output === 'string') return item.output
      if (item.text && typeof item.text === 'string') return item.text
      if (item.content && typeof item.content === 'string') return item.content
    }
  }
  
  // ケース2: Responses API形式（outputフィールドが配列）
  if (response.output && Array.isArray(response.output)) {
    // outputの中からmessageタイプを探す
    const messageItem = response.output.find((item: any) => 
      item.type === 'message' || item.type === 'msg'
    )
    if (messageItem?.content) {
      // contentが配列の場合
      if (Array.isArray(messageItem.content)) {
        const textContent = messageItem.content.find((c: any) => c.type === 'text')
        if (textContent?.text) return textContent.text
      }
      // contentが文字列の場合
      if (typeof messageItem.content === 'string') {
        return messageItem.content
      }
    }
    
    // web_search_resultタイプも確認
    const searchResult = response.output.find((item: any) => 
      item.type === 'web_search_result' || item.type === 'web_search_call'
    )
    if (searchResult?.result) {
      return JSON.stringify(searchResult.result)
    }
  }
  
  // ケース3: オブジェクト形式
  if (response.output_text) return response.output_text // Responses API v2形式
  if (response.output && typeof response.output === 'string') return response.output
  if (response.text) return response.text
  if (response.content) return response.content
  if (response.choices?.[0]?.message?.content) {
    return response.choices[0].message.content
  }
  
  // ケース4: 文字列そのもの
  if (typeof response === 'string') return response
  
  // フォールバック
  return JSON.stringify(response)
}

/**
 * テキストからJSONを抽出して解析
 */
export function extractJsonFromText(text: string): any {
  // 文字列チェック
  if (typeof text !== 'string') {
    console.warn('extractJsonFromText: input is not a string:', typeof text)
    return null
  }
  
  // 方法1: Markdownコードブロック（末尾にスペースがある場合も対応）
  const markdownJsonMatch = text.match(/```json\s*\n?([\s\S]*?)\n?\s*```/)
  if (markdownJsonMatch) {
    const jsonStr = markdownJsonMatch[1].trim()
    try {
      return JSON.parse(jsonStr)
    } catch (e) {
      console.warn('Markdown JSON parse failed:', e)
      console.warn('Failed JSON string:', jsonStr.substring(0, 100) + '...')
    }
  }
  
  // 方法2: 一般的なコードブロック
  const codeBlockMatch = text.match(/```\n?([\s\S]*?)\n?```/)
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1])
    } catch (e) {
      console.warn('Code block JSON parse failed:', e)
    }
  }
  
  // 方法3: 最初の{から最後の}まで
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      // ネストされたJSONにも対応
      let braceCount = 0
      let startIdx = -1
      let endIdx = -1
      
      for (let i = 0; i < text.length; i++) {
        if (text[i] === '{') {
          if (startIdx === -1) startIdx = i
          braceCount++
        } else if (text[i] === '}') {
          braceCount--
          if (braceCount === 0 && startIdx !== -1) {
            endIdx = i + 1
            break
          }
        }
      }
      
      if (startIdx !== -1 && endIdx !== -1) {
        const jsonStr = text.substring(startIdx, endIdx)
        return JSON.parse(jsonStr)
      }
    } catch (e) {
      console.warn('Brace matching JSON parse failed:', e)
    }
  }
  
  // 方法4: 配列の場合
  const arrayMatch = text.match(/\[[\s\S]*\]/)
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0])
    } catch (e) {
      console.warn('Array JSON parse failed:', e)
    }
  }
  
  // 方法5: テキスト全体を試す
  try {
    return JSON.parse(text.trim())
  } catch (e) {
    console.warn('Direct JSON parse failed:', e)
  }
  
  return null
}

/**
 * GPT Responses APIのレスポンスをパース
 */
export function parseGptResponse(response: any): ParsedResponse {
  try {
    const text = extractTextFromResponse(response)
    
    if (!text) {
      return {
        success: false,
        error: 'No text content found in response'
      }
    }
    
    const jsonData = extractJsonFromText(text)
    
    if (jsonData) {
      return {
        success: true,
        data: jsonData,
        rawText: text
      }
    }
    
    // JSONが見つからない場合でも、テキストは返す
    return {
      success: false,
      rawText: text,
      error: 'No valid JSON found in response'
    }
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      rawText: JSON.stringify(response)
    }
  }
}

/**
 * プロンプトにJSON形式の明確な指示を追加
 */
export function ensureJsonInstructions(prompt: string): string {
  const jsonInstructions = `

【重要】回答は必ず有効なJSON形式で提供してください。
- Markdownのコードブロック（\`\`\`json）は使用しないでください
- 説明テキストは含めないでください
- JSONのみを出力してください
- すべての文字列は適切にエスケープしてください`

  return prompt + jsonInstructions
}

/**
 * デバッグ用: レスポンスの構造を詳細に記録
 */
export function debugResponse(response: any, label: string = 'Response'): void {
  console.log(`=== ${label} Debug ===`)
  console.log('Type:', typeof response)
  console.log('Is Array:', Array.isArray(response))
  
  if (response && typeof response === 'object') {
    console.log('Keys:', Object.keys(response))
    
    if (Array.isArray(response)) {
      console.log('Array length:', response.length)
      response.forEach((item, index) => {
        console.log(`Item ${index} type:`, typeof item)
        if (item && typeof item === 'object') {
          console.log(`Item ${index} keys:`, Object.keys(item))
        }
      })
    }
  }
  
  console.log('Stringified (first 500 chars):', JSON.stringify(response).substring(0, 500))
  console.log(`=== End ${label} Debug ===`)
}