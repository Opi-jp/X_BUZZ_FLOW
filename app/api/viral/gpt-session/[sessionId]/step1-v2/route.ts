import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// NewsAPI関数の定義
const newsSearchFunction = {
  name: "search_news",
  description: "Search for the latest news articles on specific topics",
  parameters: {
    type: "object",
    properties: {
      queries: {
        type: "array",
        items: {
          type: "string"
        },
        description: "Array of search queries for news"
      },
      language: {
        type: "string",
        enum: ["en", "ja"],
        description: "Language for news articles"
      }
    },
    required: ["queries"]
  }
}

// NewsAPIを実際に呼び出す関数
async function searchNews(queries: string[], language: string = 'en') {
  const newsApiKey = process.env.NEWSAPI_KEY
  if (!newsApiKey) {
    console.error('NewsAPI key not found')
    return []
  }

  const results = []
  
  for (const query of queries) {
    try {
      const response = await fetch(
        `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=${language}&sortBy=publishedAt&pageSize=5`,
        {
          headers: {
            'X-Api-Key': newsApiKey
          }
        }
      )
      
      if (response.ok) {
        const data = await response.json()
        results.push(...data.articles.map((article: any) => ({
          title: article.title,
          source: article.source.name,
          description: article.description,
          url: article.url,
          publishedAt: article.publishedAt
        })))
      }
    } catch (error) {
      console.error(`Failed to search news for query: ${query}`, error)
    }
  }
  
  return results
}

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
      return NextResponse.json(
        { error: 'セッションが見つかりません' },
        { status: 404 }
      )
    }

    const config = session.metadata as any

    console.log('Executing GPT Step 1 with news search...')
    const startTime = Date.now()

    // Step 1: GPTに検索クエリを考えさせる
    const searchCompletion = await openai.chat.completions.create({
      model: config.config.model || 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `あなたは、${config.config.expertise}の専門家で、最新トレンドに精通しています。
現在バズる可能性のある最新ニュースを検索するための検索クエリを生成してください。`
        },
        {
          role: 'user',
          content: `現在は${new Date().toLocaleDateString('ja-JP')}です。
以下の分野で最新のバズりそうなニュースを検索するための検索クエリを10個程度生成してください：
- AI・機械学習の最新動向
- テクノロジー企業の発表
- AIと働き方・雇用への影響
- AI規制・倫理
- 新製品・サービス発表

英語の検索クエリを生成してください。`
        }
      ],
      functions: [newsSearchFunction],
      function_call: { name: "search_news" }
    })

    // 検索クエリを実行
    const functionCall = searchCompletion.choices[0].message.function_call
    const args = JSON.parse(functionCall?.arguments || '{}')
    const newsArticles = await searchNews(args.queries || [], 'en')

    console.log(`Found ${newsArticles.length} news articles`)

    // Step 2: 取得したニュースを分析
    const analysisCompletion = await openai.chat.completions.create({
      model: config.config.model || 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `あなたは、${config.config.expertise}の専門家で、SNSトレンドアナリストです。
提供されたニュース記事を分析し、バイラルコンテンツの機会を特定してください。`
        },
        {
          role: 'user',
          content: buildAnalysisPrompt(config.config, newsArticles)
        }
      ],
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    })

    const duration = Date.now() - startTime
    const rawResponse = analysisCompletion.choices[0].message.content || '{}'
    
    let response
    try {
      response = JSON.parse(rawResponse)
      console.log('Parsed response - articleAnalysis count:', response.articleAnalysis?.length || 0)
    } catch (parseError) {
      console.error('Failed to parse GPT response:', parseError)
      throw new Error('GPT応答の解析に失敗しました')
    }

    // Step 1の結果を保存
    const currentResponse = session.response as Record<string, any> || {}
    const currentMetadata = session.metadata as Record<string, any> || {}
    
    await prisma.gptAnalysis.update({
      where: { id: sessionId },
      data: {
        response: {
          ...currentResponse,
          step1: response
        },
        tokens: (session.tokens || 0) + 
          (searchCompletion.usage?.total_tokens || 0) + 
          (analysisCompletion.usage?.total_tokens || 0),
        duration: (session.duration || 0) + duration,
        metadata: {
          ...currentMetadata,
          currentStep: 1,
          step1CompletedAt: new Date().toISOString(),
          newsArticlesFound: newsArticles.length
        }
      }
    })

    return NextResponse.json({
      success: true,
      sessionId,
      step: 1,
      response: {
        articleAnalysis: response.articleAnalysis || [],
        currentEvents: response.currentEvents,
        socialListening: response.socialListening,
        viralPatterns: response.viralPatterns,
        opportunityCount: response.opportunityCount,
        summary: response.summary,
        keyPoints: response.keyPoints || []
      },
      metrics: {
        duration,
        tokens: (searchCompletion.usage?.total_tokens || 0) + (analysisCompletion.usage?.total_tokens || 0),
        articlesFound: newsArticles.length
      },
      nextStep: {
        step: 2,
        url: `/api/viral/gpt-session/${sessionId}/step2`,
        description: 'トレンド評価・角度分析',
        message: response.nextStepMessage || `トレンド分析に基づき、今後48時間以内に${response.opportunityCount}件のバズるチャンスが出現すると特定しました。`
      }
    })

  } catch (error) {
    console.error('GPT Step 1 error:', error)
    
    return NextResponse.json(
      { error: 'Step 1 分析でエラーが発生しました' },
      { status: 500 }
    )
  }
}

function buildAnalysisPrompt(config: any, newsArticles: any[]) {
  const newsSection = newsArticles.map((article, i) => 
    `${i + 1}. 【${article.source}】${article.title}
    説明: ${article.description || '詳細なし'}
    公開日: ${new Date(article.publishedAt).toLocaleDateString('ja-JP')}`
  ).join('\n\n')

  return `
現在時刻: ${new Date().toLocaleString('ja-JP')}
専門分野: ${config?.expertise || 'AI × 働き方'}
プラットフォーム: ${config?.platform || 'Twitter'}
スタイル: ${config?.style || '解説 × エンタメ'}

## 取得した最新ニュース（${newsArticles.length}件）
${newsSection}

## タスク: データ収集・初期分析

以下の観点で包括的な分析を行ってください：

### 1. 現在の出来事の分析
### 2. ソーシャルリスニング研究
### 3. ウイルスパターン認識

以下のJSON形式で回答してください。
**重要: すべての内容を日本語で記述してください。**

{
  "articleAnalysis": [
    {
      "title": "記事タイトル（元のタイトルをそのまま使用）",
      "source": "ソース名",
      "category": "AI/ビジネス/規制/研究/製品発表等",
      "importance": 0.0-1.0,
      "summary": "この記事の内容を100文字程度で要約",
      "keyPoints": [
        "重要ポイント1",
        "重要ポイント2",
        "重要ポイント3"
      ],
      "viralPotential": "なぜこの記事がバズる可能性があるか"
    }
  ],
  "currentEvents": {
    "latestNews": [{"title": "...", "impact": 0.0-1.0, "category": "..."}],
    "techAnnouncements": [...],
    "businessNews": [...]
  },
  "socialListening": {
    "twitter": {"trends": [...], "velocity": 0.0-1.0},
    "reddit": {"hotPosts": [...], "sentiment": "..."}
  },
  "viralPatterns": {
    "topOpportunities": [
      {
        "topic": "具体的なトピック名",
        "scores": {
          "controversy": 0.0-1.0,
          "emotion": 0.0-1.0,
          "relatability": 0.0-1.0,
          "shareability": 0.0-1.0,
          "timing": 0.0-1.0,
          "platformFit": 0.0-1.0
        },
        "overallScore": 0.0-1.0
      }
    ]
  },
  "opportunityCount": 数値,
  "summary": "全体的な分析サマリー",
  "keyPoints": ["ポイント1", "ポイント2", "ポイント3", "ポイント4", "ポイント5"]
}
`
}