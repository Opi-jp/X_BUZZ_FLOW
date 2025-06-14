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
        analysis: true, // 分析結果も含める
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

    // 選択された記事のみから生成
    if (!requiredArticleIds || requiredArticleIds.length === 0) {
      return NextResponse.json(
        { error: '記事が選択されていません' },
        { status: 400 }
      )
    }

    const topArticles = await prisma.newsArticle.findMany({
      where: {
        id: { in: requiredArticleIds },
        processed: true,
        importance: { not: null }
      },
      include: {
        source: true,
        analysis: true,
      },
      orderBy: {
        importance: 'desc', // 重要度順にソート
      }
    })

    if (topArticles.length === 0) {
      return NextResponse.json(
        { error: '有効な分析済み記事が見つかりません' },
        { status: 404 }
      )
    }

    // デバッグ情報
    console.log(`選択された記事: ${topArticles.length}件`)

    // ツイート生成のプロンプト作成
    const articlesData = topArticles.map((article, index) => ({
      rank: index + 1,
      title: article.title,
      japaneseSummary: article.analysis?.summary || article.description,
      keywords: article.analysis?.keywords || [],
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
   キーポイント: ${a.keywords.length > 0 ? a.keywords.join(', ') : 'なし'}
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
   - ${requiredArticleIds.length > 0 ? '「厳選した重要ニュースを含む」ことを示唆する文言を含める' : ''}
   - 「続きはスレッドで👇」で終える

2. 個別ニュースツイート（各ニュースごと）:
   - 「【${topArticles.length <= 10 ? 'N位' : 'Pick ' + 'N'}】」で始める（Nは順位）
   - タイトルを簡潔に説明
   - **必須**: キーポイントがある場合は、必ず箇条書きで含める。形式: 改行して「・ポイント1
・ポイント2」のように表示
   - キーポイントがない場合は、要約を詳しく説明
   - 該当する絵文字を追加
   - **必須**: 最後に元記事のURLを含める。形式: 「🔗 URL」
   - URLは文字数にカウントされないため、本文は140文字以内で作成
   - ハッシュタグは使わない

以下のJSON形式で回答してください:
{
  "mainTweet": "メインツイートの内容",
  "newsItems": [
    {
      "rank": 1,
      "tweetContent": "【ランク】タイトル説明\n・キーポイント1\n・キーポイント2\n🔗 https://example.com"
    }
  ]
}

**ツイート作成のルール**:
1. キーポイントがある場合は必ず箇条書きで含める
2. 箇条書きは「・」で始め、改行で区切る
3. URLは必ず「🔗 」の後に置く
4. 本文（URLを除く）は140文字以内で作成`

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
    if (!data.content || !data.content[0] || !data.content[0].text) {
      console.error('Invalid Claude API response:', data)
      throw new Error('Invalid Claude API response format')
    }
    const generationText = data.content[0].text

    // JSONをパース
    let generation: ThreadGenerationResult
    try {
      console.log('Claude response:', generationText)
      
      // JSONブロックを抽出
      const jsonMatch = generationText.match(/```json\n([\s\S]*?)\n```/) || 
                       generationText.match(/```\n([\s\S]*?)\n```/) ||
                       generationText.match(/{[\s\S]*}/)
      
      if (!jsonMatch) {
        console.error('No JSON found in response')
        throw new Error('No JSON found in Claude response')
      }
      
      let jsonStr = jsonMatch[1] || jsonMatch[0]
      console.log('Extracted JSON length:', jsonStr.length)
      
      // JSON文字列を安全にパースするための処理
      let parsed
      try {
        // まず単純にパースを試みる
        parsed = JSON.parse(jsonStr)
        console.log('Successfully parsed JSON on first attempt')
      } catch (firstError) {
        console.log('First parse attempt failed:', firstError instanceof Error ? firstError.message : 'Unknown error')
        
        // JSON文字列内の改行文字を修正
        // 文字列リテラル内の実際の改行を\nにエスケープ
        const fixedJson = jsonStr.replace(/"((?:[^"\\]|\\.)*)"/g, (match: string, content: string) => {
          // 既にエスケープされている文字はそのまま、実際の改行文字をエスケープ
          const fixed = content
            .split('\\n').join('\u0001') // 一時的に既存の\nを保護
            .split('\\r').join('\u0002') // 一時的に既存の\rを保護
            .split('\\t').join('\u0003') // 一時的に既存の\tを保護
            .replace(/\n/g, '\\n')       // 実際の改行をエスケープ
            .replace(/\r/g, '\\r')       // 実際のCRをエスケープ
            .replace(/\t/g, '\\t')       // 実際のタブをエスケープ
            .split('\u0001').join('\\n') // 保護した\nを戻す
            .split('\u0002').join('\\r') // 保護した\rを戻す
            .split('\u0003').join('\\t') // 保護した\tを戻す
          return `"${fixed}"`
        })
        
        console.log('Attempting to parse fixed JSON...')
        try {
          parsed = JSON.parse(fixedJson)
          console.log('Successfully parsed fixed JSON')
        } catch (secondError) {
          const errorMessage = secondError instanceof Error ? secondError.message : 'Unknown error'
          console.error('Failed to parse even after fixing:', errorMessage)
          console.error('Problematic JSON snippet:', jsonStr.substring(0, 500))
          throw new Error(`JSON parse error: ${errorMessage}`)
        }
      }
      
      // 生成結果とarticle情報をマージ（URLが含まれていない場合は追加）
      generation = {
        mainTweet: parsed.mainTweet,
        newsItems: parsed.newsItems.map((item: any) => {
          const article = topArticles[item.rank - 1]
          let tweetContent = item.tweetContent
          
          // キーワードがある場合、箇条書きが含まれているか確認
          const keywords = article.analysis?.keywords || []
          
          if (keywords.length > 0 && !tweetContent.includes('・')) {
            // キーワードを箇条書きで追加
            const bulletPoints = keywords.slice(0, 2).map((point: string) => `・${point}`).join('\n')
            const titleMatch = tweetContent.match(/【[^】]+】(.+?)(?:\n|$)/)
            if (titleMatch) {
              // タイトルの後にキーワードを挿入
              const titlePart = titleMatch[0]
              const restPart = tweetContent.substring(titlePart.length)
              tweetContent = titlePart + '\n' + bulletPoints + restPart
            }
          }
          
          // Claude APIの生成結果にURLが含まれていることを確認
          // 含まれていない場合はエラーとする（URLは必須）
          if (!tweetContent.includes('http')) {
            console.error(`Tweet missing URL for article: ${article.title}`)
            console.error(`Generated tweet: ${tweetContent}`)
            throw new Error(`Generated tweet is missing required URL for article: ${article.title}`)
          }
          
          return {
            articleId: article.id,
            rank: item.rank,
            tweetContent: tweetContent,
            originalUrl: article.url,
          }
        }),
      }
    } catch (parseError) {
      console.error('Failed to parse Claude response:', parseError)
      console.error('Response text:', generationText)
      console.error('Parse error details:', parseError instanceof Error ? parseError.message : 'Unknown error')
      throw new Error('Failed to parse thread generation: ' + (parseError instanceof Error ? parseError.message : 'Unknown error'))
    }

    // NewsThreadをデータベースに保存
    const thread = await prisma.newsThread.create({
      data: {
        title: `AIニュースTOP${topArticles.length} - ${new Date().toLocaleString('ja-JP', { 
          timeZone: 'Asia/Tokyo',
          month: 'numeric', 
          day: 'numeric', 
          hour: 'numeric', 
          minute: 'numeric',
          hour12: false 
        })}`,
        status: 'draft',
        scheduledAt: null,
        metadata: {
          date: startDate.toISOString(),
          articleCount: articles.length,
          requiredArticleIds: requiredArticleIds,
          totalArticles: topArticles.length,
        } as any,
        items: {
          create: [
            {
              content: generation.mainTweet,
              order: 0,
              articleId: topArticles[0].id, // メインツイート用に最初の記事IDを使用
            },
            ...generation.newsItems.map((item) => ({
              content: item.tweetContent,
              order: item.rank,
              articleId: item.articleId,
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
            order: 'asc',
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
            order: 'asc',
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