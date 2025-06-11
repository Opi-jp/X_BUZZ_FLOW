import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Anthropic Claude API
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'

// POST: Claude APIを使って投稿文案生成
export async function POST(request: NextRequest) {
  try {
    // APIキーの確認
    if (!process.env.CLAUDE_API_KEY) {
      console.error('CLAUDE_API_KEY is not set')
      throw new Error('Claude API key is not configured')
    }
    
    const body = await request.json()
    const { refPostId, patternId, customPrompt } = body

    // 参照投稿取得
    const refPost = refPostId ? await prisma.buzzPost.findUnique({
      where: { id: refPostId },
    }) : null

    // AIパターン取得
    const pattern = patternId ? await prisma.aiPattern.findUnique({
      where: { id: patternId },
    }) : null

    // プロンプト構築
    let systemPrompt = `あなたは大屋友紀雄のSNS投稿アシスタントです。
大屋友紀雄のプロフィール：
- 25歳で映像制作会社NAKEDを設立、23年にわたりクリエイティブ・ディレクター／プロデューサーとして活動
- プロジェクションマッピングなど映像技術の専門家
- 現在は「AIと働き方の未来」をテーマに情報発信
- 目標：Xのサブスクライブ機能で収益化（フォロワー2000人、3ヶ月で500万インプレッション）

重要な指示：
1. 必ず事実に基づいた内容を書く（嘘や誇張は厳禁）
2. 参照元の投稿がある場合は、その事実やデータを正確に引用する
3. 自分の意見や解釈を加える場合は、明確に区別する
4. 日本語で140文字以内
5. ハッシュタグは最大2つまで

バズ投稿作成の鉄則（ライアン氏の方法論より）：
【最重要】1行目で必ず読者の手を止める
- 異常値系：具体的な数値で驚きを与える（例：1日3時間を週7、月商2億円）
- トレンドワード：生成AI、ChatGPT、働き方改革など
- 常識への逆張り：会社員の常識と逆のことを言う

【投稿の型】
- ひとくちトリビア系：学びのある小話を適度な文量で
- 自分語り誘発系：読者が自分の経験を語りたくなる内容

【滞在時間を延ばす工夫】
- 情報量を多めに（でも読みやすく）
- 具体例や数字を必ず入れる
- 続きが気になる構成にする`

    let userPrompt = customPrompt || ''
    if (pattern) {
      userPrompt = pattern.promptTemplate
    }
    
    if (refPost) {
      const basePrompt = `参照投稿の分析：
- 内容: ${refPost.content}
- エンゲージメント: いいね${refPost.likesCount} RT${refPost.retweetsCount} 返信${refPost.repliesCount}
- インプレッション: ${refPost.impressionsCount}

この投稿の要素を参考に、以下の点を意識して新しい投稿を作成してください：
1. なぜこの投稿がバズったのかを分析
2. 同じトピックについて、あなた独自の視点や経験を加える
3. 事実やデータがある場合は正確に引用
4. クリエイティブ業界での経験を活かした具体例を入れる
5. 読者に価値を提供する（気づき、学び、行動のきっかけ）`
      
      userPrompt = userPrompt || basePrompt
      userPrompt = userPrompt.replace('{{content}}', refPost.content)
      userPrompt = userPrompt.replace('{{likes}}', refPost.likesCount.toString())
      userPrompt = userPrompt.replace('{{retweets}}', refPost.retweetsCount.toString())
    }

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
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Claude API error:', response.status, errorData)
      throw new Error(`Claude API error: ${response.status} - ${errorData}`)
    }

    const data = await response.json()
    const generatedContent = data.content[0].text

    // パターンの使用回数を更新
    if (pattern) {
      await prisma.aiPattern.update({
        where: { id: pattern.id },
        data: { usageCount: pattern.usageCount + 1 },
      })
    }

    return NextResponse.json({
      generatedContent,
      prompt: userPrompt,
      systemPrompt,
      patternUsed: pattern?.name,
      refPost: refPost ? {
        content: refPost.content,
        metrics: {
          likes: refPost.likesCount,
          retweets: refPost.retweetsCount,
          impressions: refPost.impressionsCount,
          engagementRate: refPost.impressionsCount > 0 
            ? ((refPost.likesCount + refPost.retweetsCount + refPost.repliesCount) / refPost.impressionsCount * 100).toFixed(2)
            : 0
        }
      } : null
    })
  } catch (error) {
    console.error('Error generating content:', error)
    return NextResponse.json(
      { error: 'Failed to generate content', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}