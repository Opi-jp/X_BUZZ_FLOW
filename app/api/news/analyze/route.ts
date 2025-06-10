import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Anthropic Claude API
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'

interface AnalysisResult {
  importance: number
  category: string
  summary: string
  japaneseSummary?: string
  keyPoints: string[]
  impact: 'low' | 'medium' | 'high'
}

// POST: Claude APIを使ってニュース記事を分析
export async function POST(request: NextRequest) {
  try {
    // APIキーの確認
    if (!process.env.CLAUDE_API_KEY) {
      console.error('CLAUDE_API_KEY is not set')
      throw new Error('Claude API key is not configured')
    }
    
    const body = await request.json()
    const { articleId, batchAnalyze } = body

    if (batchAnalyze) {
      // 未処理の記事を最大10件取得
      const articles = await prisma.newsArticle.findMany({
        where: {
          processed: false,
          importance: null,
        },
        orderBy: {
          publishedAt: 'desc',
        },
        take: 10,
        include: {
          source: true,
        },
      })

      const results = []
      for (const article of articles) {
        const result = await analyzeArticle(article)
        results.push(result)
      }

      return NextResponse.json({ 
        analyzed: results.length,
        results 
      })
    } else if (articleId) {
      // 単一記事を分析
      const article = await prisma.newsArticle.findUnique({
        where: { id: articleId },
        include: {
          source: true,
        },
      })

      if (!article) {
        return NextResponse.json(
          { error: 'Article not found' },
          { status: 404 }
        )
      }

      const result = await analyzeArticle(article)
      return NextResponse.json(result)
    } else {
      return NextResponse.json(
        { error: 'Missing articleId or batchAnalyze parameter' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error analyzing articles:', error)
    return NextResponse.json(
      { error: 'Failed to analyze articles', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function analyzeArticle(article: any): Promise<any> {
  try {
    // プロンプト構築
    const prompt = `以下のAI関連ニュース記事を分析してください。

タイトル: ${article.title}
内容: ${article.content || article.summary || ''}
ソース: ${article.source?.name || 'Unknown'}
URL: ${article.url}

以下の形式でJSONで回答してください：
{
  "importance": 0.0から1.0の数値（AIコミュニティへの重要度）,
  "category": "research" | "product" | "business" | "regulation" | "opinion" | "other",
  "summary": "記事の要約（100文字程度）",
  "japaneseSummary": "日本語での要約（100文字程度、タイトルが日本語の場合は同じ内容）",
  "keyPoints": ["重要ポイント1（必ず日本語で）", "重要ポイント2（必ず日本語で）", "重要ポイント3（必ず日本語で）"],
  "impact": "low" | "medium" | "high"
}

重要度の判断基準：
- 1.0: 画期的な研究成果、主要AI企業の重大発表
- 0.8-0.9: 新製品リリース、重要な技術進歩
- 0.6-0.7: 業界動向、投資ニュース
- 0.4-0.5: 一般的なアップデート、意見記事
- 0.2-0.3: 関連性の低いニュース

**重要**: keyPointsは必ず日本語で記載してください。英語の記事でも、ポイントは日本語に翻訳して出力してください。`

    // Claude API呼び出し
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Claude API error:', response.status, errorData)
      throw new Error(`Claude API error: ${response.status}`)
    }

    const data = await response.json()
    const analysisText = data.content[0].text

    // JSONをパース
    let analysis: AnalysisResult
    try {
      // JSONコードブロックを除去
      const jsonMatch = analysisText.match(/```json\n([\s\S]*?)\n```/) || analysisText.match(/{[\s\S]*}/)
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : analysisText
      analysis = JSON.parse(jsonStr)
    } catch (parseError) {
      console.error('Failed to parse Claude response:', analysisText)
      // デフォルト値を設定
      analysis = {
        importance: 0.5,
        category: 'other',
        summary: article.summary || article.title,
        japaneseSummary: article.summary || article.title,
        keyPoints: [],
        impact: 'medium'
      }
    }

    // データベース更新
    const updatedArticle = await prisma.newsArticle.update({
      where: { id: article.id },
      data: {
        importance: analysis.importance,
        processed: true,
        metadata: {
          ...(article.metadata as any || {}),
          analysis: {
            category: analysis.category,
            summary: analysis.summary,
            japaneseSummary: analysis.japaneseSummary,
            keyPoints: analysis.keyPoints,
            impact: analysis.impact,
            analyzedAt: new Date().toISOString(),
          }
        }
      },
    })

    return {
      articleId: article.id,
      title: article.title,
      importance: analysis.importance,
      category: analysis.category,
      summary: analysis.summary,
      japaneseSummary: analysis.japaneseSummary,
      keyPoints: analysis.keyPoints,
      impact: analysis.impact,
    }
  } catch (error) {
    console.error('Error in analyzeArticle:', error)
    // エラーの場合もprocessedをtrueにして再処理を防ぐ
    await prisma.newsArticle.update({
      where: { id: article.id },
      data: {
        processed: true,
        importance: 0.3, // デフォルトの低重要度
      },
    })
    throw error
  }
}