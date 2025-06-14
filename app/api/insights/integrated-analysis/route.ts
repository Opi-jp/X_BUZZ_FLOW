import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 本当の統合分析：収集したデータをPerplexityに渡して分析
export async function POST(request: NextRequest) {
  try {
    // 1. 最新のバズツイートを取得
    const recentBuzzPosts = await prisma.buzzPost.findMany({
      where: {
        postedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24時間以内
        },
        likesCount: { gte: 1000 } // 1000いいね以上
      },
      orderBy: { likesCount: 'desc' },
      take: 10,
      select: {
        content: true,
        authorUsername: true,
        likesCount: true,
        theme: true
      }
    })

    // 2. 最新のニュース記事を取得
    const recentNews = await prisma.newsArticle.findMany({
      where: {
        publishedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        },
        importance: { gte: 0.7 }
      },
      orderBy: { importance: 'desc' },
      take: 10,
      include: {
        source: true
      }
    })

    // 3. データがない場合
    if (recentBuzzPosts.length === 0 && recentNews.length === 0) {
      return NextResponse.json({
        error: '分析するデータがありません。まず収集を実行してください。',
        suggestion: '/collectページでバズツイートを収集するか、/newsページでニュースを収集してください'
      }, { status: 400 })
    }

    // 4. 収集したデータをPerplexityに渡して分析
    const analysisPrompt = `
以下は過去24時間の実際のデータです：

【バズツイート TOP ${recentBuzzPosts.length}】
${recentBuzzPosts.map((post, i) => 
  `${i + 1}. @${post.authorUsername}（${post.likesCount.toLocaleString()}いいね）
   "${post.content}"
   テーマ: ${post.theme}`
).join('\n\n')}

【重要ニュース TOP ${recentNews.length}】
${recentNews.map((news, i) => 
  `${i + 1}. ${news.title}（ソース: ${news.source.name}）
   要約: ${news.description || 'なし'}
   ポイント: ${(news.metadata as any)?.keyPoints?.join(', ') || 'なし'}`
).join('\n\n')}

これらの実データを基に：
1. 今まさにバズっているトピックの共通点を分析
2. ニュースとバズツイートの相関関係を発見
3. 50代クリエイティブディレクターが狙うべき「逆張りポイント」を提案
4. 今すぐRPすべき具体的なツイートを3つ選定（理由付き）
5. 明日バズりそうなトピックを予測

具体的かつ実践的にお願いします。`

    const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [
          {
            role: 'system',
            content: 'あなたは50代クリエイティブディレクターのSNS戦略アドバイザーです。実データに基づいた具体的な提案をしてください。'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.7
      })
    })

    if (!perplexityResponse.ok) {
      throw new Error(`Perplexity API error: ${perplexityResponse.status}`)
    }

    const perplexityData = await perplexityResponse.json()
    const analysis = perplexityData.choices[0]?.message?.content || '分析を取得できませんでした'

    // 5. 結果を返す
    return NextResponse.json({
      success: true,
      dataUsed: {
        buzzPosts: recentBuzzPosts.length,
        newsArticles: recentNews.length,
        timeRange: '過去24時間'
      },
      analysis,
      rawData: {
        topBuzzPost: recentBuzzPosts[0] || null,
        topNews: recentNews[0] || null
      },
      actionItems: [
        {
          type: 'immediate',
          action: 'Perplexityの分析結果を確認して、提案されたRPターゲットに投稿',
          priority: 'high'
        },
        {
          type: 'scheduled',
          action: '予測されたトピックについて、独自視点の投稿を準備',
          priority: 'medium'
        }
      ],
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Integrated analysis error:', error)
    return NextResponse.json(
      { error: '統合分析でエラーが発生しました', details: error instanceof Error ? error.message : '不明なエラー' },
      { status: 500 }
    )
  }
}