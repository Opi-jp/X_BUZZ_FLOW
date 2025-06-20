import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { loadPrompt } from '@/lib/prompt-loader'
import { PerplexityResponseParser } from '@/lib/parsers/perplexity-response-parser'
import OpenAI from 'openai'
import { ErrorManager, DBManager, PromptManager, IDGenerator, EntityType } from '@/lib/core/unified-system-manager'
import { claudeLog } from '@/lib/core/claude-logger'

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
    
    claudeLog('Starting concept generation', { sessionId: id })

    // topicsフィールドをパース
    let topics = []
    try {
      claudeLog('Parsing topics', { 
        sessionId: id,
        topicsType: typeof session.topics,
        topicsSample: JSON.stringify(session.topics).substring(0, 200)
      })
      
      if (typeof session.topics === 'string') {
        // Markdown形式のレスポンスをパース
        topics = PerplexityResponseParser.parseTopics(session.topics)
      } else if (Array.isArray(session.topics)) {
        // 既にパース済みの配列
        topics = session.topics
      } else if (session.topics && typeof session.topics === 'object') {
        // 旧形式のレスポンスを処理
        topics = PerplexityResponseParser.parseLegacyFormat(session.topics)
      } else {
        throw new Error('Invalid topics format')
      }
    } catch (parseError) {
      console.error('Error parsing topics:', parseError)
      throw new Error(`Failed to parse topics data: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`)
    }
    
    if (topics.length === 0) {
      throw new Error('No topics found in session')
    }

    // 最も有望な2つのトピックのみを処理
    const topicsToProcess = topics.slice(0, 2)
    claudeLog('Processing topics', { 
      sessionId: id,
      topicCount: topicsToProcess.length 
    })
    
    // 各トピックに対して3つのコンセプトを生成
    const conceptPromises = topicsToProcess.map(async (topic: any, topicIndex: number) => {
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

    claudeLog('Generated concepts', { 
      sessionId: id,
      conceptCount: allConcepts.length 
    })

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
    const errorId = await ErrorManager.logError(error, {
      module: 'create-flow-concepts',
      operation: 'generate-concepts',
      sessionId: id
    })
    
    // エラー時はステータスを戻す
    try {
      await DBManager.transaction(async (tx) => {
        await tx.viral_sessions.update({
          where: { id: (await params).id },
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