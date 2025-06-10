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
    let prompt = customPrompt || ''
    if (pattern) {
      prompt = pattern.promptTemplate
    }
    
    if (refPost) {
      prompt = prompt || `以下の投稿を参考に、似たようなバズりそうな投稿を生成してください：\n\n${refPost.content}`
      prompt = prompt.replace('{{content}}', refPost.content)
      prompt = prompt.replace('{{likes}}', refPost.likesCount.toString())
      prompt = prompt.replace('{{retweets}}', refPost.retweetsCount.toString())
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
      prompt,
      patternUsed: pattern?.name,
    })
  } catch (error) {
    console.error('Error generating content:', error)
    return NextResponse.json(
      { error: 'Failed to generate content', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}