import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { loadPrompt } from '@/lib/prompt-loader'

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
    const { reuseTopics = false } = await request.json().catch(() => ({}))
    
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
    
    if (session.status !== 'CREATED' && !reuseTopics) {
      return NextResponse.json(
        { error: 'Session already processed' },
        { status: 400 }
      )
    }
    
    // 再利用モード: 同じテーマの最新のトピックを探す
    if (reuseTopics) {
      const recentSession = await prisma.viralSession.findFirst({
        where: {
          theme: session.theme,
          status: { in: ['TOPICS_COLLECTED', 'CONCEPTS_GENERATED', 'CONTENTS_GENERATED', 'COMPLETED'] },
          topics: { not: null },
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24時間以内
          }
        },
        orderBy: { createdAt: 'desc' }
      })
      
      if (recentSession && recentSession.topics) {
        // 既存のトピックを再利用
        await prisma.viralSession.update({
          where: { id },
          data: {
            status: 'TOPICS_COLLECTED',
            topics: recentSession.topics
          }
        })
        
        const topics = recentSession.topics as any
        return NextResponse.json({
          success: true,
          reused: true,
          sourceSessionId: recentSession.id,
          session: {
            id,
            theme: session.theme,
            status: 'TOPICS_COLLECTED',
            topics
          },
          topicsCount: topics.parsed?.length || 0
        })
      }
    }

    // ステータスを更新
    await prisma.viralSession.update({
      where: { id },
      data: { status: 'COLLECTING' }
    })

    // Perplexityプロンプトを構築
    const prompt = loadPrompt('perplexity/collect-topics.txt', {
      theme: session.theme,
      platform: session.platform,
      style: session.style
    })

    console.log('Calling Perplexity API...')
    
    // Perplexity APIを呼び出し
    const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [
          {
            role: 'system',
            content: '質問の意図を理解し、3つのトピックをJSON形式で提供してください。必ずURLと日付を含めてください。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.7,
        top_p: 0.9
      })
    })

    if (!perplexityResponse.ok) {
      const error = await perplexityResponse.text()
      console.error('Perplexity API error:', error)
      throw new Error('Perplexity API request failed')
    }

    const perplexityData = await perplexityResponse.json()
    const content = perplexityData.choices[0].message.content
    
    console.log('Perplexity response received:', content.length, 'characters')

    // レスポンスからトピックを抽出
    let topics = []
    try {
      // マークダウンコードブロック内のJSONを抽出
      const jsonCodeBlocks = content.matchAll(/```json\n([\s\S]*?)\n```/g)
      for (const match of jsonCodeBlocks) {
        try {
          const topic = JSON.parse(match[1])
          if (topic.TOPIC) {
            topics.push(topic)
          }
        } catch (e) {
          console.error('Failed to parse JSON block:', e)
        }
      }
      
      // コードブロックが見つからない場合は、通常のJSON抽出を試みる
      if (topics.length === 0) {
        const jsonMatches = content.matchAll(/\{[\s\S]*?\}/g)
        for (const match of jsonMatches) {
          try {
            const topic = JSON.parse(match[0])
            if (topic.TOPIC) {
              topics.push(topic)
            }
          } catch (e) {
            // 個別のJSONパースエラーは無視
          }
        }
      }
    } catch (error) {
      console.error('Error parsing topics:', error)
    }

    // トピックが見つからない場合は、content全体をパースしてみる
    if (topics.length === 0) {
      try {
        const parsed = JSON.parse(content)
        if (Array.isArray(parsed)) {
          topics = parsed
        } else if (parsed.topics) {
          topics = parsed.topics
        }
      } catch (e) {
        console.error('Failed to parse as single JSON:', e)
      }
    }

    console.log(`Found ${topics.length} topics`)

    // セッションを更新
    const updatedSession = await prisma.viralSession.update({
      where: { id },
      data: {
        topics: {
          raw: content,
          parsed: topics,
          sources: perplexityData.search_results || [],
          citations: perplexityData.citations || []
        },
        status: 'TOPICS_COLLECTED'
      }
    })

    return NextResponse.json({
      success: true,
      session: updatedSession,
      topicsCount: topics.length
    })
    
  } catch (error) {
    console.error('Error collecting topics:', error)
    
    // エラー時はセッションをリセット
    try {
      await prisma.viralSession.update({
        where: { id: (await params).id },
        data: { status: 'CREATED' }
      })
    } catch (e) {
      // リセットエラーは無視
    }
    
    return NextResponse.json(
      { error: 'Failed to collect topics' },
      { status: 500 }
    )
  }
}