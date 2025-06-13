import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    
    // セッション情報を取得
    const session = await prisma.gptAnalysis.findUnique({
      where: { id: sessionId }
    })
    
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    
    const config = (session.metadata as any)?.config || {}
    
    console.log('Step 1-A: Collecting articles with web search...')
    const startTime = Date.now()

    // モデルがGPT-4oかチェック
    const selectedModel = config.model || 'gpt-4o'
    const supportsWebSearch = selectedModel === 'gpt-4o'
    
    if (!supportsWebSearch) {
      return NextResponse.json(
        { error: 'Web検索はGPT-4oモデルのみサポートされています。' },
        { status: 400 }
      )
    }

    // Responses APIを使用してウェブ検索を実行（簡潔な出力）
    const response = await openai.responses.create({
      model: selectedModel,
      input: buildCollectionPrompt(config),
      tools: [
        {
          type: 'web_search' as any
        }
      ],
      instructions: `web_searchツールを使用して記事を検索し、URLとタイトルのリストをJSON形式で返してください。説明文は含めないでください。`
    } as any)

    const duration = Date.now() - startTime
    
    // レスポンスから記事リストを抽出
    let articleList = []
    try {
      const responseText = extractTextFromResponse(response)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        articleList = parsed.articles || []
      }
    } catch (e) {
      console.error('Failed to parse article list:', e)
    }

    console.log(`Collected ${articleList.length} articles in ${duration}ms`)

    return NextResponse.json({
      success: true,
      sessionId,
      articles: articleList,
      count: articleList.length,
      duration
    })

  } catch (error) {
    console.error('Article collection error:', error)
    return NextResponse.json(
      { error: '記事収集でエラーが発生しました' },
      { status: 500 }
    )
  }
}

function buildCollectionPrompt(config: any) {
  const today = new Date().toLocaleDateString('ja-JP')
  
  return `
現在の日付: ${today}
専門分野: ${config?.expertise || 'AI × 働き方'}

web_searchツールを使用して、以下のカテゴリから48時間以内の最新記事を検索してください：

1. AI・テクノロジーの最新動向
2. ビジネス・働き方の変革
3. 注目の企業ニュース
4. 話題の社会現象
5. クリエイティブ・デザイン業界
6. スタートアップ・イノベーション
7. 政策・規制の動き
8. 文化・エンターテイメント

各カテゴリから1-2件、合計10-15件の記事を収集し、以下のJSON形式で返してください：

{
  "articles": [
    {
      "title": "記事の正確なタイトル",
      "url": "https://実際のURL",
      "publishDate": "YYYY-MM-DD",
      "source": "メディア名",
      "category": "カテゴリ名"
    }
  ]
}

重要：実在する記事のURLのみを含めてください。`
}

function extractTextFromResponse(response: any): string {
  if (response.output_text) return response.output_text
  if (response.output && typeof response.output === 'string') return response.output
  if (Array.isArray(response)) {
    const messageItem = response.find((item: any) => item.type === 'message')
    if (messageItem?.content?.[0]?.text) {
      return messageItem.content[0].text
    }
  }
  return JSON.stringify(response)
}