import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withErrorHandling, NotFoundError, ValidationError } from '@/lib/api/error-handler'
import { env } from '@/lib/config/env'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'

// 10大ニュース生成API
export const POST = withErrorHandling(async (request: Request) => {
  const body = await request.json()
  const { 
    theme = 'AI', 
    characterId,
    format = 'thread',
    useExisting = true // 既存のニュースを使用するか
  } = body

  try {
    // 1. ニュース記事を取得（既存 or 新規収集）
    let articles
    
    if (useExisting) {
      // 既存のニュース記事から取得
      articles = await prisma.newsArticle.findMany({
        where: {
          category: theme,
          importance: { gte: 0.7 },
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24時間以内
          }
        },
        orderBy: { importance: 'desc' },
        take: 20, // 多めに取得して選別
        include: {
          analysis: true
        }
      })
    } else {
      // NewsAPIから新規収集
      if (!env.NEWSAPI_KEY || env.NEWSAPI_KEY === 'demo') {
        throw new ValidationError('NewsAPI key is not configured')
      }
      
      // TODO: NewsAPI収集ロジック
      articles = []
    }
    
    if (articles.length < 10) {
      throw new NotFoundError('十分なニュース記事が見つかりません')
    }
    
    // 2. GPT-4で10大ニュースを選定・ランキング
    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })
    
    const rankingPrompt = `
あなたは${theme}分野のニュースキュレーターです。
以下のニュース記事から、今日の最も重要な10個を選び、重要度順にランキングしてください。

選定基準:
1. インパクトの大きさ
2. 新規性・話題性
3. 将来への影響度
4. 読者の関心度

ニュース記事:
${articles.map((a, i) => `
[${i + 1}]
タイトル: ${a.title}
要約: ${a.description || a.analysis?.summary || 'なし'}
重要度スコア: ${a.importance || 'なし'}
`).join('\n')}

以下のJSON形式で出力してください:
{
  "top10": [
    {
      "rank": 1,
      "articleIndex": 記事のインデックス番号,
      "reason": "選定理由（日本語で簡潔に）",
      "impactScore": 1-10の数値
    }
  ]
}
`

    const rankingResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: rankingPrompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3
    })
    
    const ranking = JSON.parse(rankingResponse.choices[0].message.content || '{}')
    const top10Articles = ranking.top10.map((item: any) => ({
      ...item,
      article: articles[item.articleIndex - 1]
    }))
    
    // 3. キャラクターでコンテンツ生成（オプション）
    let content
    
    if (characterId) {
      const character = await prisma.characterProfile.findUnique({
        where: { id: characterId }
      })
      
      if (!character) {
        throw new NotFoundError('Character profile', characterId)
      }
      
      // Claude APIでキャラクター視点のコンテンツ生成
      const anthropic = new Anthropic({ apiKey: env.CLAUDE_API_KEY })
      
      const characterPrompt = `
あなたは${character.name}です。
${character.tone}

今日の${theme}10大ニュースについて、あなたの視点でTwitterスレッドを作成してください。

キャラクター設定:
- 年齢: ${character.age}歳
- キャッチフレーズ: ${character.catchphrase}
- 哲学: ${character.philosophy || 'なし'}

10大ニュース:
${top10Articles.map((item: any) => `
${item.rank}. ${item.article.title}
${item.reason}
`).join('\n')}

フォーマット: ${format === 'thread' ? '5-10ツイートのスレッド形式' : '1ツイートでまとめる'}

出力形式:
{
  "posts": [
    {
      "content": "ツイート内容（140文字以内）",
      "type": "main" | "reply"
    }
  ],
  "totalCharacters": 合計文字数
}
`

      const characterResponse = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: characterPrompt }],
        max_tokens: 2000
      })
      
      content = JSON.parse(characterResponse.content[0].text || '{}')
    } else {
      // デフォルトフォーマットで生成
      content = {
        posts: [
          {
            content: `📰 本日の${theme}10大ニュース\n\n${top10Articles.slice(0, 3).map((item: any, i: number) => 
              `${['🥇', '🥈', '🥉'][i]} ${item.article.title}`
            ).join('\n')}\n\n詳細はスレッドで👇`,
            type: 'main'
          },
          ...top10Articles.map((item: any) => ({
            content: `${item.rank}位: ${item.article.title}\n\n${item.reason}\n\nインパクト: ${'⭐'.repeat(Math.floor(item.impactScore / 2))}`,
            type: 'reply'
          }))
        ]
      }
    }
    
    // 4. NewsThreadとして保存
    const thread = await prisma.newsThread.create({
      data: {
        title: `${new Date().toLocaleDateString('ja-JP')}の${theme}10大ニュース`,
        status: 'draft',
        metadata: {
          theme,
          characterId,
          format,
          ranking: ranking.top10,
          content
        },
        items: {
          create: top10Articles.map((item: any, index: number) => ({
            articleId: item.article.id,
            order: index + 1,
            content: content.posts[index + 1]?.content || null
          }))
        }
      },
      include: {
        items: {
          include: {
            article: true
          }
        }
      }
    })
    
    return {
      success: true,
      thread: {
        id: thread.id,
        title: thread.title,
        theme,
        characterId,
        format,
        posts: content.posts,
        articles: top10Articles.map((item: any) => ({
          rank: item.rank,
          title: item.article.title,
          url: item.article.url,
          reason: item.reason,
          impactScore: item.impactScore
        }))
      }
    }
    
  } catch (error) {
    console.error('Top 10 news generation error:', error)
    throw error
  }
}, {
  requiredEnvVars: ['DATABASE_URL', 'OPENAI_API_KEY']
})