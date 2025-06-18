import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

type RouteParams = {
  params: Promise<{
    id: string
  }>
}

export async function POST(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    
    // Validate ID
    if (!id || id === 'undefined' || id === 'null') {
      return NextResponse.json(
        { error: 'Invalid session ID' },
        { status: 400 }
      )
    }
    
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
    
    if (!session.topics || session.status !== 'TOPICS_COLLECTED') {
      return NextResponse.json(
        { error: 'Topics not collected yet' },
        { status: 400 }
      )
    }

    // ステータスを更新
    await prisma.viralSession.update({
      where: { id },
      data: { status: 'GENERATING_CONCEPTS' }
    })

    const topics = (session.topics as any).parsed || []
    
    if (topics.length === 0) {
      throw new Error('No topics found in session')
    }

    // 最も有望な2つのトピックのみを処理
    const topicsToProcess = topics.slice(0, 2)
    console.log(`Processing ${topicsToProcess.length} most promising topics`)
    
    // 各トピックに対して3つのコンセプトを生成
    const conceptPromises = topicsToProcess.map(async (topic: any, topicIndex: number) => {
      const prompt = loadPrompt('gpt/generate-concepts.txt', {
        platform: session.platform,
        style: session.style,
        topicTitle: topic.TOPIC,
        topicAnalysis: topic.perplexityAnalysis,
        topicUrl: topic.url,
        topicIndex: topicIndex + 1
      })

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'JSON形式で正確に出力してください。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 3500
      })

      const content = response.choices[0].message.content || '[]'
      let concepts = []
      
      try {
        concepts = JSON.parse(content)
      } catch (e) {
        console.error('Failed to parse concepts:', e)
        // JSONブロックを探す
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          try {
            concepts = JSON.parse(jsonMatch[0])
          } catch (e2) {
            console.error('Failed to parse extracted JSON:', e2)
          }
        }
      }

      // トピック情報を各コンセプトに追加
      return concepts.map((concept: any) => ({
        ...concept,
        topicTitle: topic.TOPIC,
        topicUrl: topic.url,
        topicSummary: topic.summary
      }))
    })

    const allConceptsArrays = await Promise.all(conceptPromises)
    const allConcepts = allConceptsArrays.flat()

    console.log(`Generated ${allConcepts.length} concepts total`)

    // セッションを更新
    const updatedSession = await prisma.viralSession.update({
      where: { id },
      data: {
        concepts: allConcepts,
        status: 'CONCEPTS_GENERATED'
      }
    })

    return NextResponse.json({
      success: true,
      session: updatedSession,
      conceptsCount: allConcepts.length
    })
    
  } catch (error) {
    console.error('Error generating concepts:', error)
    
    // エラー時はステータスを戻す
    try {
      await prisma.viralSession.update({
        where: { id: (await params).id },
        data: { status: 'TOPICS_COLLECTED' }
      })
    } catch (e) {
      // リセットエラーは無視
    }
    
    return NextResponse.json(
      { error: 'Failed to generate concepts' },
      { status: 500 }
    )
  }
}