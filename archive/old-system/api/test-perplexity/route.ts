import { NextRequest, NextResponse } from 'next/server'

// シンプルなPerplexityテストAPI
export async function GET(request: NextRequest) {
  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'user',
            content: '今日のAI関連の最新ニュースを3つ教えてください。日本語で簡潔に。'
          }
        ],
        max_tokens: 500,
        temperature: 0.2
      })
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Perplexity API error: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || 'データが取得できませんでした'

    return NextResponse.json({
      success: true,
      content,
      raw: data
    })

  } catch (error) {
    console.error('Perplexity test error:', error)
    return NextResponse.json(
      { error: 'テストAPIでエラーが発生しました' },
      { status: 500 }
    )
  }
}