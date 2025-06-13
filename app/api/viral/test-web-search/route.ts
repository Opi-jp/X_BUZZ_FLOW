import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function GET(request: NextRequest) {
  try {
    console.log('=== Web Search Test ===')
    
    const response = await openai.responses.create({
      model: 'gpt-4o',
      input: 'AI × 働き方の最新ニュースを検索してください。実際のURLを含めて3つの記事を教えてください。',
      tools: [
        { type: 'web_search' as any }
      ],
      instructions: `
現在の日時: ${new Date().toLocaleDateString('ja-JP')}

web_searchツールを使用して、「AI 働き方 最新ニュース 2025年6月」を検索し、実際の記事を3つ見つけてください。

各記事について以下を含めてください：
- 記事タイトル
- 実際のURL（必須）
- 簡単な要約
- 公開日
      ` as any
    })

    const outputText = response.output_text || 'No output'
    
    // URLを抽出
    const urlMatches = outputText.match(/https?:\/\/[^\s\)]+/g) || []
    
    return NextResponse.json({
      success: true,
      outputText: outputText,
      extractedUrls: urlMatches,
      urlCount: urlMatches.length,
      hasRealUrls: urlMatches.some((url: string) => !url.includes('example.com')),
      toolCalls: (response as any).tool_calls?.length || 0
    })

  } catch (error) {
    console.error('Web search test error:', error)
    return NextResponse.json(
      { error: 'Web search test failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}