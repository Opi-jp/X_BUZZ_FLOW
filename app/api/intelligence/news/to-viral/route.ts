import { NextResponse } from 'next/server'
import { prisma } from '@/lib/generated/prisma'
import { withErrorHandling, ValidationError, NotFoundError } from '@/lib/api/error-handler'
import { env } from '@/lib/config/env'
import OpenAI from 'openai'

// ニュースからバイラルコンテンツ生成
export const POST = withErrorHandling(async (request: Request) => {
  const body = await request.json()
  const { 
    newsArticleIds,
    sessionId,
    theme,
    platform = 'Twitter',
    style = '洞察的'
  } = body
  
  if (!newsArticleIds || newsArticleIds.length === 0) {
    throw new ValidationError('newsArticleIds is required')
  }
  
  try {
    // 1. ニュース記事を取得
    const articles = await prisma.newsArticle.findMany({
      where: {
        id: { in: newsArticleIds }
      },
      include: {
        analysis: true
      }
    })
    
    if (articles.length === 0) {
      throw new NotFoundError('News articles')
    }
    
    // 2. 既存セッションを使用 or 新規作成
    let session
    if (sessionId) {
      session = await prisma.viralSession.findUnique({
        where: { id: sessionId }
      })
      if (!session) {
        throw new NotFoundError('Session', sessionId)
      }
    } else {
      // 新規セッション作成
      session = await prisma.viralSession.create({
        data: {
          theme: theme || `${articles[0].category || 'ニュース'}関連`,
          platform,
          style,
          status: 'CREATED'
        }
      })
    }
    
    // 3. ニュースとセッションを関連付け
    await Promise.all(
      articles.map(article =>
        prisma.newsViralRelation.upsert({
          where: {
            newsId_sessionId: {
              newsId: article.id,
              sessionId: session.id
            }
          },
          update: {
            relevanceScore: 1.0,
            usedInContent: true
          },
          create: {
            newsId: article.id,
            sessionId: session.id,
            relevanceScore: 1.0,
            usedInContent: true
          }
        })
      )
    )
    
    // 4. GPT-4でバイラルコンセプト生成
    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })
    
    const conceptPrompt = `
あなたはバイラルコンテンツ戦略家です。
以下のニュース記事から、${platform}でバズる可能性の高いコンテンツコンセプトを3つ生成してください。

プラットフォーム: ${platform}
スタイル: ${style}
テーマ: ${session.theme}

ニュース記事:
${articles.map((a, i) => `
[${i + 1}] ${a.title}
${a.description || a.analysis?.summary || ''}
URL: ${a.url}
`).join('\n')}

コンセプト生成の方針:
1. ニュースの本質を捉えながら、新しい視点を提供
2. 感情に訴える要素を含める
3. 議論や共感を呼ぶ内容にする
4. ${platform}の特性を活かす

以下のJSON形式で出力:
{
  "concepts": [
    {
      "id": "concept-1",
      "title": "コンセプトタイトル",
      "hook": "読者を惹きつけるフック（1-2文）",
      "angle": "どのような切り口で展開するか",
      "format": "single/thread/visual",
      "newsReferences": [記事番号の配列],
      "viralPotential": {
        "score": 1-10,
        "reason": "バズる理由"
      }
    }
  ]
}
`

    const conceptResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: conceptPrompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7
    })
    
    const generatedConcepts = JSON.parse(conceptResponse.choices[0].message.content || '{}')
    
    // 5. セッションにコンセプトを保存
    await prisma.viralSession.update({
      where: { id: session.id },
      data: {
        concepts: generatedConcepts.concepts,
        status: 'CONCEPTS_GENERATED'
      }
    })
    
    // 6. アクティビティログ
    await prisma.sessionActivityLog.create({
      data: {
        sessionId: session.id,
        sessionType: 'VIRAL',
        activityType: 'NEWS_TO_VIRAL',
        details: {
          newsArticleIds,
          conceptCount: generatedConcepts.concepts.length
        }
      }
    })
    
    return {
      success: true,
      session: {
        id: session.id,
        theme: session.theme,
        platform: session.platform,
        style: session.style
      },
      concepts: generatedConcepts.concepts,
      newsArticles: articles.map(a => ({
        id: a.id,
        title: a.title,
        url: a.url
      }))
    }
    
  } catch (error) {
    console.error('News to viral error:', error)
    throw error
  }
}, {
  requiredEnvVars: ['DATABASE_URL', 'OPENAI_API_KEY']
})