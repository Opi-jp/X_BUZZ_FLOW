import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function GET() {
  try {
    console.log('Testing viral analysis with web search...')
    const startTime = Date.now()

    const prompt = `
現在時刻: ${new Date().toLocaleString('ja-JP')}
今日の日付: 2025年6月6日

web_searchツールを使用して、以下の分析を行ってください。各カテゴリーで実際のニュースURLを含めて報告してください。

## 1. 現在の出来事の分析
以下のカテゴリーから最新ニュースを検索し、URLを含めて報告：
- AI・テクノロジーの最新発表（「AI news June 2025」で検索）
- ビジネスニュースと企業論争（「business AI controversy June 2025」で検索）
- 政治的展開とAI規制（「AI regulation policy June 2025」で検索）

## 2. ソーシャルリスニング研究
- 現在話題になっているAI関連のトレンド
- ソーシャルメディアでの反応や議論

## 3. ウイルスパターン認識
各ニュースについて以下を評価（0-1スケール）：
- 論争レベル
- 感情の強さ
- 共感性要因
- 共有可能性
- タイミングの敏感さ

以下のJSON形式で回答してください：
{
  "currentEvents": [
    {
      "category": "カテゴリー名",
      "title": "実際の記事タイトル",
      "source": "ソース名",
      "url": "実際のURL",
      "publishDate": "公開日",
      "summary": "要約"
    }
  ],
  "socialListening": {
    "topTrends": ["トレンド1", "トレンド2"],
    "sentiment": "全体的な感情分析"
  },
  "viralPatterns": [
    {
      "topic": "トピック名",
      "articleUrl": "関連記事URL",
      "scores": {
        "controversy": 0.0-1.0,
        "emotion": 0.0-1.0,
        "relatability": 0.0-1.0,
        "shareability": 0.0-1.0,
        "timing": 0.0-1.0
      },
      "viralPotential": "バズる可能性の説明"
    }
  ]
}
`

    // Responses APIを使用
    const response = await openai.responses.create({
      model: 'gpt-4o',
      input: prompt,
      tools: [{ type: 'web_search' as any }]
    })

    const duration = Date.now() - startTime
    console.log(`Analysis completed in ${duration}ms`)

    // レスポンスを処理
    let analysisResult = null
    if (Array.isArray(response)) {
      const messageItem = response.find((item: any) => item.type === 'message')
      if (messageItem && messageItem.content && messageItem.content[0]) {
        const text = messageItem.content[0].text || ''
        console.log('Response text length:', text.length)
        
        // JSON部分を抽出
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          try {
            analysisResult = JSON.parse(jsonMatch[0])
          } catch (e) {
            console.error('Failed to parse JSON:', e)
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
      analysis: analysisResult,
      rawResponse: response,
      metadata: {
        model: 'gpt-4o',
        tools: ['web_search'],
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Viral analysis test error:', error)
    
    return NextResponse.json(
      { 
        error: 'Viral analysis test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}