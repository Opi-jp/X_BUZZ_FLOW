import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { opportunityIds } = body

    if (!opportunityIds || !Array.isArray(opportunityIds)) {
      return NextResponse.json(
        { error: '機会IDが指定されていません' },
        { status: 400 }
      )
    }

    // 指定された機会を取得
    const opportunities = await prisma.viralOpportunity.findMany({
      where: { id: { in: opportunityIds } }
    })

    if (opportunities.length === 0) {
      return NextResponse.json(
        { error: '指定された機会が見つかりません' },
        { status: 404 }
      )
    }

    // 各機会に対してコンテンツを生成
    const generatedPosts = await Promise.all(
      opportunities.map(async (opportunity) => {
        const prompt = buildGenerationPrompt(opportunity)
        
        // Claude API呼び出し
        const startTime = Date.now()
        const response = await fetch(CLAUDE_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.CLAUDE_API_KEY!,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-3-opus-20240229',
            max_tokens: 2000,
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.8
          })
        })

        if (!response.ok) {
          throw new Error(`Claude API error: ${response.status}`)
        }

        const data = await response.json()
        const duration = Date.now() - startTime
        const generatedContent = JSON.parse(data.content[0].text)

        // 分析ログを保存
        await prisma.viralAnalysisLog.create({
          data: {
            model: 'claude',
            phase: 'content_generation',
            prompt,
            response: generatedContent,
            duration,
            success: true
          }
        })

        // 生成された投稿をDBに保存
        const posts = await Promise.all(
          generatedContent.concepts.map(async (concept: any, index: number) => {
            return await prisma.viralPost.create({
              data: {
                opportunityId: opportunity.id,
                conceptType: `concept${index + 1}`,
                content: concept.content,
                threadContent: concept.threadContent || null,
                visualGuide: concept.visualGuide,
                hashtags: concept.hashtags,
                postType: concept.postType,
                platform: opportunity.platform,
                scheduledAt: calculateOptimalPostTime(concept.timing)
              }
            })
          })
        )

        // 機会のステータスを更新
        await prisma.viralOpportunity.update({
          where: { id: opportunity.id },
          data: { status: 'generated' }
        })

        return posts
      })
    )

    return NextResponse.json({
      success: true,
      posts: generatedPosts.flat(),
      count: generatedPosts.flat().length
    })

  } catch (error) {
    console.error('Content generation error:', error)
    
    await prisma.viralAnalysisLog.create({
      data: {
        model: 'claude',
        phase: 'content_generation',
        prompt: '',
        response: {},
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    })

    return NextResponse.json(
      { error: 'コンテンツ生成でエラーが発生しました' },
      { status: 500 }
    )
  }
}

// 生成プロンプトを構築
function buildGenerationPrompt(opportunity: any) {
  return `
あなたは50代のクリエイティブディレクターです。
23年の映像制作経験を持ち、最近はAIを活用した新しい働き方を模索しています。

以下のバズ機会に対して、3つの異なるアプローチでコンテンツを作成してください。

## バズ機会
トピック: ${opportunity.topic}
切り口: ${opportunity.angle}
キーワード: ${opportunity.keywords.join(', ')}
プラットフォーム: ${opportunity.platform}

## あなたの特徴
- 効率化の流れに逆らって「非効率の美学」を語る
- 1990年代のCG革命を経験し、今のAI革命と比較できる
- 若者優位の風潮に対して経験者の価値を主張
- ユーモアとエモーションを大切にする

## タスク
以下の形式でJSONで3つのコンテンツコンセプトを返してください：

{
  "concepts": [
    {
      "title": "コンセプトタイトル",
      "postType": "single" または "thread",
      "content": "140文字以内の完全な投稿文（単発の場合）",
      "threadContent": [
        "スレッド1つ目の投稿",
        "スレッド2つ目の投稿",
        ...
      ],
      "visualGuide": "ビジュアル作成ガイド",
      "hashtags": ["ハッシュタグ1", "ハッシュタグ2"],
      "timing": "morning" / "lunch" / "evening" / "night",
      "hook": "最初の一文でどう引き込むか",
      "emotionalTone": "エモーショナルトーン（例：皮肉、共感、挑発）"
    }
  ]
}

重要な制約：
- 必ず日本語で作成
- 文字数制限を厳守（Twitterは140文字）
- 絵文字は控えめに使用
- 上から目線にならないよう注意
- 経験を押し付けず、問いかけや共感を重視
`
}

// 最適な投稿時間を計算
function calculateOptimalPostTime(timing: string): Date {
  const now = new Date()
  const hours = now.getHours()
  
  const timingMap: { [key: string]: number[] } = {
    morning: [7, 8, 9],
    lunch: [12, 13],
    evening: [18, 19, 20],
    night: [21, 22, 23]
  }
  
  const targetHours = timingMap[timing] || [21]
  let targetHour = targetHours[0]
  
  // 現在時刻より後の最も近い時間を選択
  for (const hour of targetHours) {
    if (hour > hours) {
      targetHour = hour
      break
    }
  }
  
  // 今日の指定時刻を過ぎていたら明日に設定
  if (targetHour <= hours) {
    now.setDate(now.getDate() + 1)
  }
  
  now.setHours(targetHour, 0, 0, 0)
  return now
}