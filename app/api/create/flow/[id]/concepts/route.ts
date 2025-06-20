import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PerplexityResponseParser } from '@/lib/parsers/perplexity-response-parser'
import OpenAI from 'openai'
import { ErrorManager, DBManager, PromptManager, IDGenerator, EntityType } from '@/lib/core/unified-system-manager'
import { claudeLog } from '@/lib/core/claude-logger'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 120000, // 2分タイムアウト
})

export async function GET() {
  console.log('📍 Concepts API GET called - route exists!')
  return NextResponse.json({ message: 'Concepts API route exists' })
}

type RouteParams = {
  params: Promise<{
    id: string
  }>
}

export async function POST(
  request: Request,
  { params }: RouteParams
) {
  console.log('🚀 POST handler called!')
  console.log('Request URL:', request.url)
  console.log('Request method:', request.method)
  
  let id: string
  try {
    console.log('🔍 Attempting to extract ID from params...')
    const resolvedParams = await params
    id = resolvedParams.id
    console.log('✅ ID extracted:', id)
    
    // Environment variable check
    console.log('=== 🔧 GPT CONCEPTS API START ===')
    console.log('Session ID:', id)
    console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY)
    console.log('OPENAI_API_KEY length:', process.env.OPENAI_API_KEY?.length || 0)
    
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY is not set')
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }
    console.log('✅ Environment check passed')
    
    // Validate ID
    if (!id || id === 'undefined' || id === 'null') {
      return NextResponse.json(
        { error: 'Invalid session ID' },
        { status: 400 }
      )
    }
    
    // セッションを取得
    const session = await prisma.viral_sessions.findUnique({
      where: { id }
    })
    
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }
    
    if (!session.topics) {
      return NextResponse.json(
        { error: 'Topics not collected yet' },
        { status: 400 }
      )
    }
    
    // ステータスチェック: データがあれば処理を続行
    // ステータスに関わらず、topicsデータがあれば概念生成可能

    // ステータスを更新
    await DBManager.transaction(async (tx) => {
      await tx.viral_sessions.update({
        where: { id },
        data: { status: 'GENERATING_CONCEPTS' }
      })
    })
    
    claudeLog.info(
      { module: 'api', operation: 'generate-concepts' },
      'Starting concept generation',
      { sessionId: id }
    )

    // 既存のtopicsデータを直接使用（簡略化）
    let topics = []
    if (session.topics && typeof session.topics === 'object' && (session.topics as any).topics) {
      topics = (session.topics as any).topics
    } else {
      throw new Error('No valid topics found in session')
    }
    
    console.log('📋 Found topics:', topics.length)

    // テスト用: 1つのトピックのみ処理
    const topicsToProcess = topics.slice(0, 1)
    console.log('🧪 TEST: Processing only 1 topic for faster testing')
    
    // 各トピックに対して3つのコンセプトを生成
    const conceptPromises = topicsToProcess.map(async (topic: any, topicIndex: number) => {
      console.log('🔧 Loading prompt for topic:', topic.TOPIC)
      const prompt = await PromptManager.load(
        'gpt/generate-concepts.txt',
        {
          platform: session.platform,
          style: session.style,
          topicTitle: topic.TOPIC,
          topicSource: topic.source || 'Unknown',
          topicDate: topic.date || new Date().toISOString().split('T')[0],
          topicUrl: topic.url,
          topicSummary: topic.summary || '',
          topicKeyPoints: topic.keyPoints ? topic.keyPoints.map((point: string, i: number) => `${i + 1}. ${point}`).join('\n') : '',
          topicAnalysis: topic.perplexityAnalysis,
          topicIndex: topicIndex + 1
        },
        { validate: true, cache: true }
      )
      console.log('✅ Prompt loaded successfully, length:', prompt.length)
      console.log('🚀 Making OpenAI API call...')

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
        max_tokens: 1000  // テスト用に短縮
      })

      const content = response.choices[0].message.content || ''
      let concepts = []
      
      // 新しい形式：個別のコンセプトA、B、Cを抽出
      const conceptAMatch = content.match(/【コンセプトA】\s*(?:```json\s*)?(\{[\s\S]*?\})\s*(?:```\s*)?(?=【コンセプトB】|$)/);
      const conceptBMatch = content.match(/【コンセプトB】\s*(?:```json\s*)?(\{[\s\S]*?\})\s*(?:```\s*)?(?=【コンセプトC】|$)/);
      const conceptCMatch = content.match(/【コンセプトC】\s*(?:```json\s*)?(\{[\s\S]*?\})\s*(?:```\s*)?$/m);
      
      if (conceptAMatch) {
        try {
          concepts.push(JSON.parse(conceptAMatch[1]))
        } catch (e) {
          console.error('Failed to parse concept A:', e)
        }
      }
      
      if (conceptBMatch) {
        try {
          concepts.push(JSON.parse(conceptBMatch[1]))
        } catch (e) {
          console.error('Failed to parse concept B:', e)
        }
      }
      
      if (conceptCMatch) {
        try {
          concepts.push(JSON.parse(conceptCMatch[1]))
        } catch (e) {
          console.error('Failed to parse concept C:', e)
        }
      }
      
      // フォールバック: 旧形式の配列JSONを探す
      if (concepts.length === 0) {
        try {
          concepts = JSON.parse(content)
        } catch (e) {
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            try {
              concepts = JSON.parse(jsonMatch[0])
            } catch (e2) {
              console.error('Failed to parse any concepts:', e2)
            }
          }
        }
      }

      // トピック情報を各コンセプトに追加（ID付与）
      return concepts.map((concept: any) => ({
        ...concept,
        conceptId: IDGenerator.generate(EntityType.CONCEPT),
        topicTitle: topic.TOPIC,
        topicUrl: topic.url,
        topicSummary: topic.summary
      }))
    })

    const allConceptsArrays = await Promise.all(conceptPromises)
    const allConcepts = allConceptsArrays.flat()

    claudeLog.success(
      { module: 'api', operation: 'generate-concepts', sessionId: id },
      'Generated concepts',
      0,
      { conceptCount: allConcepts.length }
    )
    
    console.log('✅ GPT Concepts generated successfully:', allConcepts.length, 'concepts')
    console.log('📝 Sample concept:', JSON.stringify(allConcepts[0], null, 2))

    // セッションを更新
    const updatedSession = await DBManager.transaction(async (tx) => {
      return await tx.viral_sessions.update({
        where: { id },
        data: {
          concepts: allConcepts,
          status: 'CONCEPTS_GENERATED'
        }
      })
    })

    return NextResponse.json({
      success: true,
      session: updatedSession,
      conceptsCount: allConcepts.length
    })
    
  } catch (error) {
    console.error('🚨 Concepts API Error:', error)
    console.error('🚨 Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    const sessionId = (await params).id
    const errorId = await ErrorManager.logError(error, {
      module: 'create-flow-concepts',
      operation: 'generate-concepts',
      sessionId: sessionId
    })
    
    // エラー時はステータスを戻す
    try {
      await DBManager.transaction(async (tx) => {
        await tx.viral_sessions.update({
          where: { id: sessionId },
          data: { status: 'TOPICS_COLLECTED' }
        })
      })
    } catch (e) {
      // リセットエラーは無視
    }
    
    const userMessage = ErrorManager.getUserMessage(error, 'ja')
    
    return NextResponse.json(
      { 
        error: userMessage,
        errorId
      },
      { status: 500 }
    )
  }
}