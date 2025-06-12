import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function GET() {
  try {
    console.log('Testing Assistants API with web_search...')
    const startTime = Date.now()

    // Step 1: Assistantを作成（web_searchツール付き）
    const assistant = await openai.beta.assistants.create({
      name: 'Web Search Test Assistant',
      instructions: `You are a helpful assistant that MUST use the web_search tool to answer questions.
Always search for the latest information before responding.
Respond in Japanese.`,
      tools: [{ type: 'web_search' as any }],
      model: 'gpt-4o'
    })

    console.log('Assistant created:', assistant.id)

    // Step 2: Threadを作成
    const thread = await openai.beta.threads.create()
    console.log('Thread created:', thread.id)

    // Step 3: メッセージを追加してRunを開始
    const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: assistant.id,
      additional_messages: [{
        role: 'user',
        content: 'web_searchツールを使って、OpenAIの最新ニュース（2025年12月）を3件教えてください。各ニュースについて、記事タイトル、ソース、日付を含めてください。'
      }],
      instructions: 'Remember to use the web_search tool for this query.',
      tools: [{ type: 'web_search' as any }]
    })

    console.log('Run completed:', run.id, run.status)

    if (run.status !== 'completed') {
      console.error('Run failed:', run)
      throw new Error(`Run failed with status: ${run.status}`)
    }

    // Step 6: 回答を取得
    const messages = await openai.beta.threads.messages.list(thread.id)
    const assistantMessages = messages.data.filter(msg => msg.role === 'assistant')
    
    console.log(`Found ${assistantMessages.length} assistant messages`)

    const response = assistantMessages[0]?.content[0]?.type === 'text' 
      ? assistantMessages[0].content[0].text.value 
      : 'No response'

    // クリーンアップ
    await openai.beta.assistants.del(assistant.id)
    console.log('Assistant deleted')

    const duration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
      runStatus: run.status,
      usage: run.usage,
      response,
      metadata: {
        assistantId: assistant.id,
        threadId: thread.id,
        runId: run.id,
        model: 'gpt-4o',
        tools: ['web_search']
      }
    })

  } catch (error) {
    console.error('Web search test error:', error)
    
    return NextResponse.json(
      { 
        error: 'Web search test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}