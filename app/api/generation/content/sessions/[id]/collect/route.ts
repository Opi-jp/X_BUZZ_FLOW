import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readFile } from 'fs/promises'
import { join } from 'path'
import Perplexity from '@perplexity-ai/sdk'

type RouteParams = {
  params: Promise<{
    id: string
  }>
}

const perplexity = new Perplexity({
  apiKey: process.env.PERPLEXITY_API_KEY || ''
})

export async function POST(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    
    // セッションを取得
    const session = await prisma.viralSession.findUnique({
      where: { id }
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    if (session.status !== 'created' && session.status !== 'CREATED') {
      return NextResponse.json(
        { error: 'Session already started' },
        { status: 400 }
      )
    }

    // ステータスを更新
    await prisma.viralSession.update({
      where: { id },
      data: {
        status: 'collecting',
        currentPhase: 'COLLECTING',
        updatedAt: new Date()
      }
    })

    // プロンプトファイルを読み込み
    const promptPath = join(
      process.cwd(),
      'lib',
      'prompts',
      'perplexity',
      'collect-topics.txt'
    )
    const promptTemplate = await readFile(promptPath, 'utf-8')
    
    // プロンプトの変数を置換
    const prompt = promptTemplate
      .replace('${theme}', session.theme)
      .replace('${platform}', session.platform || 'Twitter')
      .replace('${style}', session.style || 'エンターテイメント')

    try {
      // Perplexityでトピックを収集
      const response = await perplexity.chat.completions.create({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [{
          role: 'user',
          content: prompt
        }],
        temperature: 0.7,
        max_tokens: 3000
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error('No content received from Perplexity')
      }

      // JSONを抽出
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      const topicsData = JSON.parse(jsonMatch[0])
      
      // セッションを更新
      await prisma.viralSession.update({
        where: { id },
        data: {
          perplexityData: topicsData.topics || topicsData,
          status: 'topics_collected',
          currentPhase: 'TOPICS_COLLECTED',
          updatedAt: new Date()
        }
      })

      return NextResponse.json({ 
        success: true,
        topicsCount: Array.isArray(topicsData.topics) ? topicsData.topics.length : 0
      })
    } catch (error) {
      console.error('Perplexity API error:', error)
      
      // エラーをセッションに記録
      await prisma.viralSession.update({
        where: { id },
        data: {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          updatedAt: new Date()
        }
      })

      return NextResponse.json(
        { error: 'Failed to collect topics' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in collect topics:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}