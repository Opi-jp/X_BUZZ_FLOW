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
  DataTransformer,
  CommonSchemas,
  ModuleSchemas
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
    
    // IDのバリデーション
    if (!IDGenerator.validate(id, EntityType.VIRAL_SESSION)) {
      throw new CreatePostError(
        'Invalid session ID format',
        CreatePostPhase.DRAFT,
        CreatePostErrorType.DATA_VALIDATION_ERROR,
        id,
        false
      )
    }
    
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
        // Perplexity収集（実際に存在するAPIを呼び出し）
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
        
      case 'COLLECTING':
        // autoProgressの場合は状態を確認して自動的に次へ
        if (autoProgress) {
          // セッションの最新状態を再取得
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
        
        // 収集中の場合は待機
        return NextResponse.json({
          action: 'collecting',
          message: 'トピック収集中です',
          status: 'COLLECTING'
        })
        
      case 'TOPICS_COLLECTED':
        // GPTコンセプト生成
        try {
          const generateConceptsResponse = await withRetry(
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
        
      case 'GENERATING_CONCEPTS':
        // autoProgressの場合は状態を確認して自動的に次へ
        if (autoProgress) {
          // セッションの最新状態を再取得
          const updatedSession = await prisma.viralSession.findUnique({
            where: { id }
          })
          
          // conceptsが既に存在する場合は次のステップへ
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
        
        // コンセプト生成中の場合は待機
        return NextResponse.json({
          action: 'generating_concepts',
          message: 'コンセプト生成中です',
          status: 'GENERATING_CONCEPTS'
        })
        
      case 'ERROR':
        // エラー状態の場合
        return NextResponse.json({
          action: 'error',
          message: 'エラーが発生しました。セッションを確認してください。',
          status: 'ERROR'
        })
        
      case 'CONCEPTS_GENERATED':
        // コンセプト選択が必要かチェック
        if (!session.selectedIds || session.selectedIds.length === 0) {
          // autoProgressがtrueの場合は自動的に最初の3つを選択
          if (autoProgress) {
            const concepts = session.concepts as any[]
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
              console.error('Auto generate content error:', error)
              return NextResponse.json({
                action: 'generating_content',
                message: '投稿生成を開始しました（バックグラウンド処理）',
                selectedIds,
                characterId: defaultCharacterId,
                autoProgress: true
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
        // autoProgressの場合は自動的に進む
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
            console.error('Auto generate content error:', error)
            return NextResponse.json({
              action: 'generating_content',
              message: '投稿生成を開始しました（バックグラウンド処理）',
              characterId: defaultCharacterId,
              autoProgress: true
            })
          }
        }
        
        // 手動モード: キャラクター選択とClaude生成
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
        
      case 'GENERATING_CONTENT':
      case 'GENERATING':
        // autoProgressの場合は状態を確認して自動的に次へ
        if (autoProgress) {
          // セッションの最新状態を再取得
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
        
        // 生成中の場合は待機
        return NextResponse.json({
          action: 'generating_content',
          message: 'コンテンツ生成中です',
          status: 'GENERATING_CONTENT'
        })
        
      case 'CONTENTS_GENERATED':
      case 'COMPLETED':
        // すべて完了
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
        
      default:
        // 未知のステータス
        return NextResponse.json({
          action: 'error',
          message: `Unknown session status: ${session.status}`,
          status: session.status
        })
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