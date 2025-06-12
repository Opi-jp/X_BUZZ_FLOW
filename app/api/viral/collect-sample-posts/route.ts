import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      theme = 'AI × 働き方',
      count = 20,
      timeRange = '24時間'
    } = body

    // ChatGPTに最近のバズ投稿例を生成してもらう
    const prompt = `
現在の日時: ${new Date().toLocaleString('ja-JP')}

以下のテーマで、過去${timeRange}にバズったであろうツイートの例を${count}件生成してください。
テーマ: ${theme}

リアルな投稿として、以下の要素を含めてください：
- 実際にありそうなAI関連の話題
- 現実的なエンゲージメント数（いいね、リツイート、返信）
- 様々な視点（賛成、反対、中立、体験談など）
- 50代クリエイター目線で興味深い内容

以下の形式でJSONで返してください：

{
  "posts": [
    {
      "content": "投稿内容（140文字以内）",
      "authorUsername": "ユーザー名",
      "authorDisplayName": "表示名", 
      "likesCount": 数値,
      "retweetsCount": 数値,
      "repliesCount": 数値,
      "impressions": 数値,
      "postedAt": "YYYY-MM-DD HH:MM:SS",
      "theme": "テーマ分類",
      "sentiment": "positive|negative|neutral",
      "aiRelevance": 0.0-1.0,
      "buzzFactors": ["バズった理由1", "理由2"]
    }
  ]
}

重要: 
- 実際の有名人やインフルエンサーの名前は使わない
- 現実的で議論を呼びそうな内容
- エンゲージメント数は1000-50000の範囲
- 投稿時間は過去${timeRange}以内
- 様々な立場・年代の意見を含める
`

    const startTime = Date.now()
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'あなたは最新のSNSトレンドに詳しい分析家です。現実的で質の高いバズ投稿の例を生成してください。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    })

    const duration = Date.now() - startTime
    const response = JSON.parse(completion.choices[0].message.content || '{}')

    // 生成された投稿をDBに保存
    const savedPosts = await Promise.all(
      response.posts.map(async (post: any) => {
        return await prisma.buzzPost.create({
          data: {
            content: post.content,
            authorUsername: post.authorUsername,
            authorDisplayName: post.authorDisplayName,
            likesCount: post.likesCount,
            retweetsCount: post.retweetsCount,
            repliesCount: post.repliesCount,
            impressions: post.impressions,
            postedAt: new Date(post.postedAt),
            collectedAt: new Date(),
            theme: post.theme,
            metadata: {
              source: 'chatgpt_generated',
              sentiment: post.sentiment,
              aiRelevance: post.aiRelevance,
              buzzFactors: post.buzzFactors,
              generatedAt: new Date().toISOString(),
              prompt: theme
            }
          }
        })
      })
    )

    return NextResponse.json({
      success: true,
      message: `${savedPosts.length}件のサンプル投稿を生成しました`,
      posts: savedPosts,
      analysis: {
        theme,
        duration,
        tokens: completion.usage?.total_tokens,
        averageEngagement: savedPosts.reduce((sum, p) => sum + p.likesCount + p.retweetsCount, 0) / savedPosts.length
      }
    })

  } catch (error) {
    console.error('Sample posts generation error:', error)
    
    return NextResponse.json(
      { error: 'サンプル投稿生成でエラーが発生しました' },
      { status: 500 }
    )
  }
}