import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { PerplexityClient } from '@/lib/perplexity'

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
    const session = await prisma.viralSession.findUnique({
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
    await prisma.viralSession.update({
      where: { id },
      data: {
        status: 'COLLECTING'
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
    
    let promptTemplate: string
    try {
      promptTemplate = await readFile(promptPath, 'utf-8')
    } catch (fileError) {
      console.error('Failed to read prompt file:', promptPath, fileError)
      
      await prisma.viralSession.update({
        where: { id },
        data: {
          status: 'ERROR'
        }
      })
      
      return NextResponse.json(
        { 
          error: 'Configuration error',
          message: 'Prompt template file not found',
          path: promptPath
        },
        { status: 500 }
      )
    }
    
    // プロンプトの変数を置換
    const prompt = promptTemplate
      .replace('${theme}', session.theme)
      .replace('${platform}', session.platform || 'Twitter')
      .replace('${style}', session.style || 'エンターテイメント')

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

      console.log(`Received Perplexity response with ${content.length} characters`)
      
      // セッションを更新 - 生のコンテンツをtopicsに保存
      await prisma.viralSession.update({
        where: { id },
        data: {
          topics: content,
          status: 'TOPICS_COLLECTED'
        }
      })

      console.log(`Successfully collected topics for session ${id}:`, {
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
      console.error('Perplexity API error:', error)
      
      // エラー詳細を取得
      let errorMessage = 'Unknown error'
      let errorDetails = {}
      
      if (error instanceof Error) {
        errorMessage = error.message
        
        // Perplexity SDKのエラーレスポンスを詳しく記録
        if ('response' in error && error.response) {
          errorDetails = {
            status: (error.response as any).status,
            statusText: (error.response as any).statusText,
            data: (error.response as any).data
          }
          console.error('Perplexity API response details:', errorDetails)
        } else if ('cause' in error && error.cause) {
          // 他のエラー原因も記録
          errorDetails = {
            cause: error.cause
          }
          console.error('Error cause:', error.cause)
        }
      }
      
      // エラーをセッションに記録
      await prisma.viralSession.update({
        where: { id },
        data: {
          status: 'ERROR'
        }
      })

      return NextResponse.json(
        { 
          error: 'Failed to collect topics',
          message: errorMessage,
          details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in collect topics:', error)
    
    let errorMessage = 'Failed to process request'
    let errorDetails = {}
    
    if (error instanceof Error) {
      errorMessage = error.message
      
      // スタックトレースも記録（開発環境のみ）
      if (process.env.NODE_ENV === 'development') {
        errorDetails = {
          name: error.name,
          stack: error.stack
        }
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to process request',
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
      },
      { status: 500 }
    )
  }
}