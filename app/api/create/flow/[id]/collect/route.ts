import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { PerplexityClient } from '@/lib/perplexity'
import { ErrorManager, DBManager, PromptManager } from '@/lib/core/unified-system-manager'
import { claudeLog } from '@/lib/core/claude-logger'

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
    // API キーのチェック
    if (!process.env.PERPLEXITY_API_KEY) {
      console.error('PERPLEXITY_API_KEY is not set in environment variables')
      return NextResponse.json(
        { 
          error: 'Configuration error',
          message: 'Perplexity API key is not configured'
        },
        { status: 500 }
      )
    }
    
    const { id } = await params
    
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

    // topicsデータが既に存在する場合はスキップ
    if (session.topics) {
      return NextResponse.json(
        { error: 'Topics already collected', success: true },
        { status: 200 }
      )
    }

    // ステータスを更新
    await DBManager.transaction(async (tx) => {
      await tx.viral_sessions.update({
        where: { id },
        data: {
          status: 'COLLECTING'
        }
      })
    })
    
    claudeLog('Starting topic collection', { sessionId: id, theme: session.theme })

    // プロンプトを読み込み
    let prompt: string
    try {
      prompt = await PromptManager.load(
        'perplexity/collect-topics.txt',
        {
          theme: session.theme,
          platform: session.platform || 'Twitter',
          style: session.style || 'エンターテイメント'
        },
        { validate: true, cache: true }
      )
    } catch (promptError) {
      const errorId = await ErrorManager.logError(promptError, {
        module: 'create-flow-collect',
        operation: 'load-prompt',
        sessionId: id
      })
      
      await DBManager.transaction(async (tx) => {
        await tx.viral_sessions.update({
          where: { id },
          data: { status: 'ERROR' }
        })
      })
      
      return NextResponse.json(
        { 
          error: 'プロンプトテンプレートの読み込みに失敗しました',
          errorId
        },
        { status: 500 }
      )
    }

    try {
      // Perplexityクライアントを初期化
      const perplexity = new PerplexityClient()
      
      // Perplexityでトピックを収集
      const response = await perplexity.searchWithContext({
        query: prompt,
        searchRecency: 'day' // 最新の情報を取得
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error('No content received from Perplexity')
      }

      claudeLog('Received Perplexity response', { 
        sessionId: id,
        contentLength: content.length 
      })
      
      // セッションを更新 - 生のコンテンツをtopicsに保存
      await DBManager.transaction(async (tx) => {
        await tx.viral_sessions.update({
          where: { id },
          data: {
            topics: content,
            status: 'TOPICS_COLLECTED'
          }
        })
      })

      claudeLog('Successfully collected topics', {
        sessionId: id,
        contentLength: content.length,
        theme: session.theme,
        platform: session.platform
      })
      
      return NextResponse.json({ 
        success: true,
        contentLength: content.length,
        sessionId: id
      })
    } catch (error) {
      const errorId = await ErrorManager.logError(error, {
        module: 'create-flow-collect',
        operation: 'perplexity-api',
        sessionId: id,
        theme: session.theme
      })
      
      // エラーをセッションに記録
      await DBManager.transaction(async (tx) => {
        await tx.viral_sessions.update({
          where: { id },
          data: { status: 'ERROR' }
        })
      })
      
      const userMessage = ErrorManager.getUserMessage(error, 'ja')

      return NextResponse.json(
        { 
          error: userMessage,
          errorId
        },
        { status: 500 }
      )
    }
  } catch (error) {
    const errorId = await ErrorManager.logError(error, {
      module: 'create-flow-collect',
      operation: 'request-processing'
    })
    
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