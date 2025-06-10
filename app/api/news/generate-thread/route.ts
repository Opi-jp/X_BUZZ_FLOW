import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Anthropic Claude API
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'

interface ThreadGenerationResult {
  mainTweet: string
  newsItems: Array<{
    articleId: string
    rank: number
    tweetContent: string
    originalUrl: string
  }>
}

// POST: 重要度順にソートされたニュースからツリー投稿を生成
export async function POST(request: NextRequest) {
  try {
    // APIキーの確認
    if (!process.env.CLAUDE_API_KEY) {
      console.error('CLAUDE_API_KEY is not set')
      throw new Error('Claude API key is not configured')
    }
    
    const body = await request.json()
    const { date, limit = 10, timeRange = 24, requiredArticleIds = [] } = body

    // 指定日時から過去N時間の記事を取得
    const endDate = date ? new Date(date) : new Date()
    const startDate = new Date(endDate.getTime() - (timeRange * 60 * 60 * 1000))

    console.log('Generating thread with params:', {
      date,
      limit,
      timeRange,
      requiredArticleIds,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    })

    const articles = await prisma.newsArticle.findMany({
      where: {
        processed: true,
        importance: { not: null },
        publishedAt: {
          gte: startDate,
          lt: endDate,
        },
      },
      orderBy: {
        importance: 'desc',
      },
      take: Math.max(limit * 2, 50), // より多くの記事から選択できるように
      include: {
        source: true,
      },
    })

    console.log(`Found ${articles.length} analyzed articles`)

    if (articles.length === 0) {
      console.error('No analyzed articles found for the specified date range')
      return NextResponse.json(
        { error: 'No analyzed articles found for the specified date' },
        { status: 404 }
      )
    }

    // 必須記事を取得（選択された記事）
    let requiredArticles: typeof articles = []
    if (requiredArticleIds.length > 0) {
      requiredArticles = await prisma.newsArticle.findMany({
        where: {
          id: { in: requiredArticleIds },
          processed: true,
          importance: { not: null }
        },
        include: {
          source: true
        }
      })
    }

    // 必須記事以外の記事をフィルタリング
    const optionalArticles = articles.filter(
      article => !requiredArticleIds.includes(article.id)
    )

    // ソースの多様性を確保（同じソースからの記事が偏らないように）
    const maxPerSource = Math.max(3, Math.ceil(limit / 5)) // 最低3件、または全体の20%まで
    const articlesWithSourceDiversity = optionalArticles.reduce((acc: typeof articles, article) => {
      const sourceCount = acc.filter(a => a.sourceId === article.sourceId).length
      if (sourceCount < maxPerSource) {
        acc.push(article)
      }
      return acc
    }, [])

    // 必須記事を先頭に、その後重要度順で記事を選出
    const remainingSlots = Math.max(0, limit - requiredArticles.length)
    const selectedOptionalArticles = articlesWithSourceDiversity.slice(0, remainingSlots)
    const topArticles = [...requiredArticles, ...selectedOptionalArticles]

    // デバッグ情報
    console.log(`記事選択結果: 必須記事${requiredArticles.length}件, 選択記事${selectedOptionalArticles.length}件, 合計${topArticles.length}件`)

    // ツイート生成のプロンプト作成
    const articlesData = topArticles.map((article, index) => ({
      rank: index + 1,
      title: article.title,
      japaneseSummary: (article.metadata as any)?.analysis?.japaneseSummary || article.summary,
      sourceName: article.source.name,
      url: article.url,
      importance: article.importance,
    }))

    const prompt = `以下のAIニュースTOP${topArticles.length}からTwitterツリー投稿を生成してください。

収集期間: ${startDate.toLocaleString('ja-JP')} 〜 ${endDate.toLocaleString('ja-JP')}
分析済み記事数: ${articles.length}件から厳選

ニュース一覧:
${articlesData.map(a => `${a.rank}. ${a.title}
   日本語要約: ${a.japaneseSummary}
   ソース: ${a.sourceName}
   URL: ${a.url}
   重要度: ${a.importance}`).join('\n\n')}

要求事項:
1. メインツイート（1つ目）:
   - 「🤖 AIニュース${topArticles.length <= 10 ? `TOP${topArticles.length}` : `${topArticles.length}選`}」で始める
   - 最も重要な${Math.min(3, topArticles.length)}個のニュースをハイライト
   - 140文字以内（日本語なので）
   - 絵文字を効果的に使用
   - ${topArticles.length > 5 ? '「今日は特に重要なニュースが多数！」のような文言を含める' : ''}
   - ${requiredArticles.length > 0 ? '「厳選した重要ニュースを含む」ことを示唆する文言を含める' : ''}
   - 「続きはスレッドで👇」で終える

2. 個別ニュースツイート（各ニュースごと）:
   - 「【${topArticles.length <= 10 ? 'N位' : 'Pick ' + 'N'}】」で始める（Nは順位）
   - 日本語で要約（元が英語の場合は翻訳済みの要約を使用）
   - 重要ポイントを簡潔に
   - 該当する絵文字を追加
   - 140文字以内（日本語の場合）
   - ハッシュタグは使わない

以下のJSON形式で回答してください:
{
  "mainTweet": "メインツイートの内容",
  "newsItems": [
    {
      "rank": 1,
      "tweetContent": "個別ツイートの内容"
    }
  ]
}`

    console.log(`Generating thread with ${topArticles.length} articles`)

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
        max_tokens: 3000,
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
    const generationText = data.content[0].text

    // JSONをパース
    let generation: ThreadGenerationResult
    try {
      const jsonMatch = generationText.match(/```json\n([\s\S]*?)\n```/) || generationText.match(/{[\s\S]*}/)
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : generationText
      const parsed = JSON.parse(jsonStr)
      
      // 生成結果とarticle情報をマージ
      generation = {
        mainTweet: parsed.mainTweet,
        newsItems: parsed.newsItems.map((item: any) => ({
          articleId: topArticles[item.rank - 1].id,
          rank: item.rank,
          tweetContent: item.tweetContent,
          originalUrl: topArticles[item.rank - 1].url,
        })),
      }
    } catch (parseError) {
      console.error('Failed to parse Claude response:', generationText)
      throw new Error('Failed to parse thread generation')
    }

    // NewsThreadをデータベースに保存
    const thread = await prisma.newsThread.create({
      data: {
        title: `AIニュースTOP${topArticles.length} - ${new Date().toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' })}`,
        status: 'draft',
        scheduledAt: null,
        metadata: {
          date: startDate.toISOString(),
          articleCount: articles.length,
          requiredArticleIds: requiredArticleIds,
          totalArticles: topArticles.length,
        },
        items: {
          create: [
            {
              content: generation.mainTweet,
              position: 0,
              metadata: { type: 'main' },
            },
            ...generation.newsItems.map((item) => ({
              content: item.tweetContent,
              position: item.rank,
              articleId: item.articleId,
              metadata: { 
                type: 'news',
                originalUrl: item.originalUrl,
              },
            })),
          ],
        },
      },
      include: {
        items: {
          include: {
            article: true,
          },
          orderBy: {
            position: 'asc',
          },
        },
      },
    })

    return NextResponse.json({
      threadId: thread.id,
      title: thread.title,
      itemsCount: thread.items.length,
      mainTweet: generation.mainTweet,
      newsItems: generation.newsItems,
    })
  } catch (error) {
    console.error('Error generating thread:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: 'Failed to generate thread', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// GET: 生成済みスレッド一覧を取得
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: any = {}
    if (status) {
      where.status = status
    }

    const threads = await prisma.newsThread.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      include: {
        items: {
          include: {
            article: true,
          },
          orderBy: {
            position: 'asc',
          },
        },
        _count: {
          select: {
            items: true,
          },
        },
      },
    })

    // 確実に配列を返す
    return NextResponse.json(threads || [])
  } catch (error) {
    console.error('Error fetching threads:', error)
    // エラー時も空の配列を返す
    return NextResponse.json([], { status: 200 })
  }
}