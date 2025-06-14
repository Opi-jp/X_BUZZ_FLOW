import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'
import { Phase1Strategy, ChainOfThoughtOrchestrator } from '@/lib/orchestrated-cot-strategy'
import { extractTextFromResponse } from '@/lib/gpt-response-parser'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Web検索実行関数
async function executeWebSearch(queries: any[]): Promise<any> {
  const selectedModel = 'gpt-4o'
  
  console.log('Using GPT-4o web_search tool')
  const searchPrompts = queries.map(q => 
    `Search: "${q.query}" (${q.intent})`
  ).join('\n')
  
  try {
    const response = await openai.responses.create({
      model: selectedModel,
      input: `以下の検索クエリで最新の情報を検索してください：\n\n${searchPrompts}\n\n各クエリについて、関連する最新記事のタイトル、要約、URLを含めてください。`,
      tools: [{ type: 'web_search' as any }],
      instructions: `Search for the provided queries and return comprehensive results with titles, summaries, and URLs.`
    } as any)
    
    return extractTextFromResponse(response)
  } catch (error) {
    console.error('Web search failed:', error)
    // フォールバック: モック結果を返す
    return queries.map(q => ({
      query: q.query,
      results: []
    }))
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const startTime = Date.now()
  
  try {
    const { sessionId } = await params

    // セッション情報を取得
    const session = await prisma.gptAnalysis.findUnique({
      where: { id: sessionId }
    })

    if (!session) {
      return NextResponse.json(
        { error: 'セッションが見つかりません' },
        { status: 404 }
      )
    }

    const metadata = session.metadata as any
    const config = metadata?.config || {}

    console.log('=== Orchestrated Step 1 V2: Using Phase1Strategy ===')
    
    // Orchestratorのインスタンスを作成
    const orchestrator = new ChainOfThoughtOrchestrator(openai)
    
    // コンテキストを準備
    const context = {
      expertise: config.expertise || 'AI × 働き方',
      style: config.style || '教育的',
      platform: config.platform || 'Twitter'
    }
    
    // ============================================
    // Phase 1 (Think): 検索クエリ生成
    // ============================================
    console.log('Phase 1 (Think): Generating search queries...')
    
    const thinkPrompt = Phase1Strategy.think.prompt
      .replace(/{expertise}/g, context.expertise)
      .replace(/{style}/g, context.style)
      .replace(/{platform}/g, context.platform)
    
    const queryGenerationResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `あなたは、優秀なリサーチアシスタントです。`
        },
        {
          role: 'user',
          content: thinkPrompt
        }
      ],
      temperature: Phase1Strategy.think.temperature || 0.7,
      max_tokens: Phase1Strategy.think.maxTokens,
      response_format: { type: 'json_object' }
    })
    
    const queryGenResult = JSON.parse(queryGenerationResponse.choices[0].message.content || '{}')
    console.log(`Generated ${queryGenResult.queries?.length || 0} search queries`)

    // ============================================
    // Phase 2 (Execute): Web検索実行
    // ============================================
    console.log('Phase 2 (Execute): Performing web searches...')
    
    const searchResults = await executeWebSearch(queryGenResult.queries || [])
    
    // ============================================
    // Phase 3 (Integrate): 統合・分析
    // ============================================
    console.log('Phase 3 (Integrate): Analyzing and integrating results...')
    
    const integratePrompt = Phase1Strategy.integrate.prompt
      .replace(/{expertise}/g, context.expertise)
      .replace(/{style}/g, context.style)
      .replace(/{platform}/g, context.platform)
      .replace(/{searchResults}/g, searchResults)
    
    const analysisResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `あなたは、バズるコンテンツ戦略家です。`
        },
        {
          role: 'user',
          content: integratePrompt
        }
      ],
      temperature: Phase1Strategy.integrate.temperature || 0.5,
      max_tokens: Phase1Strategy.integrate.maxTokens,
      response_format: { type: 'json_object' }
    })

    const analysisResult = JSON.parse(analysisResponse.choices[0].message.content || '{}')
    const duration = Date.now() - startTime

    // 結果を保存
    const currentResponse = session.response as Record<string, any> || {}
    const currentMetadata = session.metadata as Record<string, any> || {}
    
    await prisma.gptAnalysis.update({
      where: { id: sessionId },
      data: {
        response: {
          ...currentResponse,
          step1: {
            ...analysisResult,
            searchQueries: queryGenResult.queries,
            queryReasoning: queryGenResult.reasoning,
            phaseDetails: {
              think: queryGenResult,
              execute: { searchCompleted: true },
              integrate: analysisResult
            }
          }
        },
        tokens: (session.tokens || 0) + 
                (queryGenerationResponse.usage?.total_tokens || 0) + 
                (analysisResponse.usage?.total_tokens || 0),
        duration: (session.duration || 0) + duration,
        metadata: {
          ...currentMetadata,
          currentStep: 1,
          step1CompletedAt: new Date().toISOString(),
          orchestratedApproach: true,
          version: 'v2'
        }
      }
    })

    return NextResponse.json({
      success: true,
      sessionId,
      step: 1,
      method: 'Orchestrated 3-Phase Approach V2',
      response: analysisResult,
      metrics: {
        duration,
        phases: {
          think: queryGenerationResponse.usage?.total_tokens || 0,
          execute: queryGenResult.queries?.length || 0,
          integrate: analysisResponse.usage?.total_tokens || 0
        }
      },
      nextStep: {
        step: 2,
        url: `/api/viral/gpt-session/${sessionId}/step2`,
        description: 'バズる機会評価',
        message: analysisResult.nextStepMessage || 'Step 1完了。続行してください。'
      }
    })

  } catch (error) {
    console.error('Orchestrated Step 1 V2 error:', error)
    
    return NextResponse.json(
      { 
        error: 'Step 1 分析でエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}