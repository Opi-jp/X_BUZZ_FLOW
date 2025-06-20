import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAvailableCharacters } from '@/lib/character-loader'
import { 
  CreatePostErrorHandler, 
  CreatePostPhase,
  withRetry,
  CreatePostError,
  CreatePostErrorType
} from '@/lib/create-post-error-handler'
import { 
  IDGenerator, 
  EntityType,
  DataTransformer
} from '@/lib/core/unified-system-manager'

type RouteParams = {
  params: Promise<{
    id: string
  }>
}

export async function POST(
  request: Request,
  { params }: RouteParams
) {
  const requestId = IDGenerator.generate(EntityType.ACTIVITY_LOG)
  
  try {
    const { id } = await params
    const body = await request.json()
    const { autoProgress = false } = body
    
    // セッション取得（エラーハンドリング付き）
    const session = await withRetry(
      async () => {
        const sess = await prisma.viralSession.findUnique({
          where: { id }
        })
        if (!sess) {
          throw new CreatePostError(
            'Session not found',
            CreatePostPhase.DRAFT,
            CreatePostErrorType.INVALID_SESSION_STATE,
            id,
            false
          )
        }
        return sess
      },
      CreatePostPhase.DRAFT,
      { sessionId: id }
    )

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

    // 現在のステータスに基づいて次のアクションを実行
    switch (session.status) {
      case 'CREATED':
        return await handleCreatedState(id, session, baseUrl)
        
      case 'COLLECTING':
        return await handleCollectingState(id, autoProgress)
        
      case 'TOPICS_COLLECTED':
        return await handleTopicsCollectedState(id, baseUrl)
        
      case 'GENERATING_CONCEPTS':
        return await handleGeneratingConceptsState(id, autoProgress)
        
      case 'ERROR':
        return NextResponse.json({
          action: 'error',
          message: 'エラーが発生しました。セッションを確認してください。',
          status: 'ERROR',
          errorDetails: session.errorDetails,
          requestId
        })
        
      case 'CONCEPTS_GENERATED':
        return await handleConceptsGeneratedState(id, session, body, autoProgress, baseUrl)
        
      case 'GENERATING_CONTENT':
      case 'GENERATING':
        return await handleGeneratingContentState(id, autoProgress)
        
      case 'CONTENTS_GENERATED':
      case 'COMPLETED':
        return await handleCompletedState(id, requestId)
        
      default:
        throw new CreatePostError(
          `Unknown session status: ${session.status}`,
          CreatePostPhase.DRAFT,
          CreatePostErrorType.INVALID_SESSION_STATE,
          id,
          false
        )
    }

  } catch (error) {
    const errorResponse = await CreatePostErrorHandler.handle(
      error,
      CreatePostPhase.DRAFT,
      undefined,
      undefined
    )
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

// 各状態のハンドラー関数

async function handleCreatedState(
  id: string,
  session: any,
  baseUrl: string
): Promise<NextResponse> {
  try {
    const response = await withRetry(
      async () => {
        const res = await fetch(
          `${baseUrl}/api/generation/content/sessions/${id}/collect`,
          { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              theme: session.theme,
              platform: session.platform,
              style: session.style
            }),
            signal: AbortSignal.timeout(30000) // 30秒タイムアウト
          }
        )
        
        if (!res.ok) {
          const errorText = await res.text()
          throw new CreatePostError(
            `Collect API failed: ${errorText}`,
            CreatePostPhase.PERPLEXITY,
            CreatePostErrorType.API_INVALID_RESPONSE,
            id,
            true,
            { statusCode: res.status, errorText }
          )
        }
        
        return res
      },
      CreatePostPhase.PERPLEXITY,
      { sessionId: id, maxRetries: 3 }
    )
    
    return NextResponse.json({
      action: 'collecting',
      message: 'トピック収集を開始しました'
    })
    
  } catch (error) {
    // エラーでもステータスは更新（非同期処理として継続）
    await prisma.viralSession.update({
      where: { id },
      data: { status: 'COLLECTING' }
    })
    
    return NextResponse.json({
      action: 'collecting',
      message: 'トピック収集を開始しました（バックグラウンド処理）',
      status: 'COLLECTING',
      warning: error instanceof Error ? error.message : 'Collection API unavailable'
    })
  }
}

async function handleCollectingState(
  id: string,
  autoProgress: boolean
): Promise<NextResponse> {
  if (autoProgress) {
    const updatedSession = await prisma.viralSession.findUnique({
      where: { id }
    })
    
    // Perplexityのレスポンスをチェック
    if (updatedSession?.topics) {
      try {
        // topicsがJSON文字列の場合はパース
        const topics = typeof updatedSession.topics === 'string' 
          ? JSON.parse(updatedSession.topics) 
          : updatedSession.topics
          
        if (topics && (Array.isArray(topics) || typeof topics === 'object')) {
          await prisma.viralSession.update({
            where: { id },
            data: { status: 'TOPICS_COLLECTED' }
          })
          
          return NextResponse.json({
            action: 'topics_collected',
            message: 'トピック収集が完了しました',
            status: 'TOPICS_COLLECTED',
            autoProgress: true
          })
        }
      } catch (error) {
        console.error('Topics parsing error:', error)
        // パースエラーの場合も収集中として扱う
      }
    }
  }
  
  return NextResponse.json({
    action: 'collecting',
    message: 'トピック収集中です',
    status: 'COLLECTING'
  })
}

async function handleTopicsCollectedState(
  id: string,
  baseUrl: string
): Promise<NextResponse> {
  try {
    const response = await withRetry(
      async () => {
        const res = await fetch(
          `${baseUrl}/api/generation/content/sessions/${id}/generate-concepts`,
          { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(60000) // 60秒タイムアウト（GPTは時間がかかる）
          }
        )
        
        if (!res.ok) {
          const errorText = await res.text()
          throw new CreatePostError(
            `Generate concepts API failed: ${errorText}`,
            CreatePostPhase.GPT,
            CreatePostErrorType.API_INVALID_RESPONSE,
            id,
            true,
            { statusCode: res.status, errorText }
          )
        }
        
        return res
      },
      CreatePostPhase.GPT,
      { sessionId: id, maxRetries: 3 }
    )
    
    return NextResponse.json({
      action: 'generating_concepts',
      message: 'コンセプト生成を開始しました',
      status: 'GENERATING_CONCEPTS'
    })
    
  } catch (error) {
    // エラーでもステータスは更新
    await prisma.viralSession.update({
      where: { id },
      data: { status: 'GENERATING_CONCEPTS' }
    })
    
    return NextResponse.json({
      action: 'generating_concepts',
      message: 'コンセプト生成を開始しました（バックグラウンド処理）',
      status: 'GENERATING_CONCEPTS',
      warning: error instanceof Error ? error.message : 'Concept generation API unavailable'
    })
  }
}

async function handleGeneratingConceptsState(
  id: string,
  autoProgress: boolean
): Promise<NextResponse> {
  if (autoProgress) {
    const updatedSession = await prisma.viralSession.findUnique({
      where: { id }
    })
    
    if (updatedSession?.concepts && Array.isArray(updatedSession.concepts) && updatedSession.concepts.length > 0) {
      await prisma.viralSession.update({
        where: { id },
        data: { status: 'CONCEPTS_GENERATED' }
      })
      
      return NextResponse.json({
        action: 'concepts_generated',
        message: 'コンセプト生成が完了しました',
        status: 'CONCEPTS_GENERATED',
        autoProgress: true
      })
    }
  }
  
  return NextResponse.json({
    action: 'generating_concepts',
    message: 'コンセプト生成中です',
    status: 'GENERATING_CONCEPTS'
  })
}

async function handleConceptsGeneratedState(
  id: string,
  session: any,
  body: any,
  autoProgress: boolean,
  baseUrl: string
): Promise<NextResponse> {
  // コンセプト選択が必要かチェック
  if (!session.selectedIds || session.selectedIds.length === 0) {
    // autoProgressの場合は自動的に最初の3つを選択
    if (autoProgress) {
      const concepts = session.concepts as any[]
      if (!concepts || concepts.length === 0) {
        throw new CreatePostError(
          'No concepts available for selection',
          CreatePostPhase.GPT,
          CreatePostErrorType.DATA_MISSING_REQUIRED,
          id,
          false
        )
      }
      
      const selectedIds = concepts.slice(0, 3).map(concept => concept.conceptId)
      
      await prisma.viralSession.update({
        where: { id },
        data: { selectedIds }
      })
      
      // 自動的にデフォルトキャラクターで次へ進む
      const characters = await getAvailableCharacters()
      const defaultCharacterId = characters[0]?.id || 'cardi-dare'
      
      try {
        const generateResponse = await withRetry(
          async () => {
            const res = await fetch(
              `${baseUrl}/api/generation/content/sessions/${id}/generate`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ characterId: defaultCharacterId }),
                signal: AbortSignal.timeout(45000) // 45秒タイムアウト
              }
            )
            
            if (!res.ok) {
              throw new CreatePostError(
                'Generate content failed',
                CreatePostPhase.CLAUDE,
                CreatePostErrorType.API_INVALID_RESPONSE,
                id,
                true
              )
            }
            
            return res
          },
          CreatePostPhase.CLAUDE,
          { sessionId: id, maxRetries: 3 }
        )
        
        return NextResponse.json({
          action: 'generating_content',
          message: '投稿を自動生成中です',
          selectedIds,
          characterId: defaultCharacterId,
          autoProgress: true
        })
      } catch (error) {
        return NextResponse.json({
          action: 'generating_content',
          message: '投稿生成を開始しました（バックグラウンド処理）',
          selectedIds,
          characterId: defaultCharacterId,
          autoProgress: true,
          warning: error instanceof Error ? error.message : 'Content generation unavailable'
        })
      }
    }
    
    // 手動モード: コンセプト選択が必要
    if (!body.selectedConcepts || body.selectedConcepts.length === 0) {
      return NextResponse.json({
        action: 'select_concepts',
        concepts: session.concepts,
        message: 'コンセプトを選択してください（最大3つ）'
      })
    }
    
    // 選択されたコンセプトからIDを抽出して保存
    const selectedIds = body.selectedConcepts.map((concept: any) => concept.conceptId)
    await prisma.viralSession.update({
      where: { id },
      data: { selectedIds }
    })
    
    return NextResponse.json({
      action: 'concepts_selected',
      message: 'コンセプトを選択しました'
    })
  }
  
  // selectedIdsがある場合は次のステップへ
  if (autoProgress) {
    const characters = await getAvailableCharacters()
    const defaultCharacterId = body.characterId || characters[0]?.id || 'cardi-dare'
    
    try {
      const generateResponse = await withRetry(
        async () => {
          const res = await fetch(
            `${baseUrl}/api/generation/content/sessions/${id}/generate`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ characterId: defaultCharacterId }),
              signal: AbortSignal.timeout(45000)
            }
          )
          
          if (!res.ok) {
            throw new CreatePostError(
              'Generate content failed',
              CreatePostPhase.CLAUDE,
              CreatePostErrorType.API_INVALID_RESPONSE,
              id,
              true
            )
          }
          
          return res
        },
        CreatePostPhase.CLAUDE,
        { sessionId: id }
      )
      
      return NextResponse.json({
        action: 'generating_content',
        message: '投稿を自動生成中です',
        characterId: defaultCharacterId,
        autoProgress: true
      })
    } catch (error) {
      return NextResponse.json({
        action: 'generating_content',
        message: '投稿生成を開始しました（バックグラウンド処理）',
        characterId: defaultCharacterId,
        autoProgress: true,
        warning: error instanceof Error ? error.message : 'Content generation unavailable'
      })
    }
  }
  
  // 手動モード: キャラクター選択
  if (!body.characterId) {
    const characters = await getAvailableCharacters()
    return NextResponse.json({
      action: 'select_character',
      characters: characters.map(char => ({
        id: char.id,
        name: char.name,
        description: char.description
      })),
      message: 'キャラクターを選択してください'
    })
  }
  
  // Claude生成
  const generateResponse = await withRetry(
    async () => {
      const res = await fetch(
        `${baseUrl}/api/generation/content/sessions/${id}/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ characterId: body.characterId }),
          signal: AbortSignal.timeout(45000)
        }
      )
      
      if (!res.ok) {
        throw new CreatePostError(
          'Failed to generate content',
          CreatePostPhase.CLAUDE,
          CreatePostErrorType.API_INVALID_RESPONSE,
          id,
          true
        )
      }
      
      return res
    },
    CreatePostPhase.CLAUDE,
    { sessionId: id }
  )
  
  return NextResponse.json({
    action: 'generating_content',
    message: '投稿を生成中です'
  })
}

async function handleGeneratingContentState(
  id: string,
  autoProgress: boolean
): Promise<NextResponse> {
  if (autoProgress) {
    const updatedSession = await prisma.viralSession.findUnique({
      where: { id }
    })
    
    // contentsが既に存在する場合は次のステップへ
    if (updatedSession?.contents && Array.isArray(updatedSession.contents) && updatedSession.contents.length > 0) {
      await prisma.viralSession.update({
        where: { id },
        data: { status: 'CONTENTS_GENERATED' }
      })
      
      return NextResponse.json({
        action: 'contents_generated',
        message: 'コンテンツ生成が完了しました',
        status: 'CONTENTS_GENERATED',
        autoProgress: true
      })
    }
    
    // draftsが存在する場合も完了とみなす
    const drafts = await prisma.viralDraftV2.findMany({
      where: { sessionId: id }
    })
    
    if (drafts.length > 0) {
      await prisma.viralSession.update({
        where: { id },
        data: { status: 'COMPLETED' }
      })
      
      return NextResponse.json({
        action: 'completed',
        message: 'すべての処理が完了しました',
        drafts: drafts.map(draft => DataTransformer.toDisplayData(draft, EntityType.DRAFT)),
        autoProgress: true
      })
    }
  }
  
  return NextResponse.json({
    action: 'generating_content',
    message: 'コンテンツ生成中です',
    status: 'GENERATING_CONTENT'
  })
}

async function handleCompletedState(
  id: string,
  requestId: string
): Promise<NextResponse> {
  const drafts = await prisma.viralDraftV2.findMany({
    where: { sessionId: id },
    select: {
      id: true,
      title: true,
      content: true,
      hashtags: true,
      characterId: true,
      status: true,
      createdAt: true
    }
  })
  
  return NextResponse.json({
    action: 'completed',
    message: 'すべての処理が完了しました',
    drafts: drafts.map(draft => DataTransformer.toDisplayData(draft, EntityType.DRAFT)),
    requestId
  })
}