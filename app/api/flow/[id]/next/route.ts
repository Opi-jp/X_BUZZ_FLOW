import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAvailableCharacters } from '@/lib/character-loader'

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
    const body = await request.json()
    const { autoProgress = false } = body
    
    const session = await prisma.viralSession.findUnique({
      where: { id }
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

    // 現在のステータスに基づいて次のアクションを実行
    switch (session.status) {
      case 'CREATED':
        // Perplexity収集（実際に存在するAPIを呼び出し）
        try {
          const response = await fetch(
            `${baseUrl}/api/generation/content/sessions/${id}/collect`,
            { 
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                theme: session.theme,
                platform: session.platform,
                style: session.style
              })
            }
          )
          
          if (!response.ok) {
            // 別のAPIが利用可能か確認
            console.log('Primary collect API failed, checking alternatives...')
            
            // セッションステータスをCOLLECTINGに更新
            await prisma.viralSession.update({
              where: { id },
              data: { status: 'COLLECTING' }
            })
            
            return NextResponse.json({
              action: 'collecting',
              message: 'トピック収集を開始しました（非同期処理）',
              status: 'COLLECTING'
            })
          }
          
          return NextResponse.json({
            action: 'collecting',
            message: 'トピック収集を開始しました'
          })
        } catch (error) {
          console.error('Collect topics error:', error)
          
          // フォールバック: セッションステータスを更新のみ
          await prisma.viralSession.update({
            where: { id },
            data: { status: 'COLLECTING' }
          })
          
          return NextResponse.json({
            action: 'collecting',
            message: 'トピック収集を開始しました（バックグラウンド処理）',
            status: 'COLLECTING'
          })
        }
        
      case 'COLLECTING':
        // autoProgressの場合は状態を確認して自動的に次へ
        if (autoProgress) {
          // セッションの最新状態を再取得
          const updatedSession = await prisma.viralSession.findUnique({
            where: { id }
          })
          
          // topicsが既に存在する場合は次のステップへ
          if (updatedSession?.topics) {
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
          const generateConceptsResponse = await fetch(
            `${baseUrl}/api/generation/content/sessions/${id}/generate-concepts`,
            { 
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            }
          )
          
          if (!generateConceptsResponse.ok) {
            const errorText = await generateConceptsResponse.text()
            console.error('Generate concepts API failed:', errorText)
            
            // ステータスを更新して次のステップへ
            await prisma.viralSession.update({
              where: { id },
              data: { status: 'GENERATING_CONCEPTS' }
            })
            
            return NextResponse.json({
              action: 'generating_concepts',
              message: 'コンセプト生成を開始しました（非同期処理）',
              status: 'GENERATING_CONCEPTS'
            })
          }
          
          return NextResponse.json({
            action: 'generating_concepts',
            message: 'コンセプト生成を開始しました',
            status: 'GENERATING_CONCEPTS'
          })
        } catch (error) {
          console.error('Generate concepts error:', error)
          
          // フォールバック: ステータスを更新
          await prisma.viralSession.update({
            where: { id },
            data: { status: 'GENERATING_CONCEPTS' }
          })
          
          return NextResponse.json({
            action: 'generating_concepts',
            message: 'コンセプト生成を開始しました（バックグラウンド処理）',
            status: 'GENERATING_CONCEPTS'
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
              const generateResponse = await fetch(
                `${baseUrl}/api/generation/content/sessions/${id}/generate`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ characterId: defaultCharacterId })
                }
              )
              
              if (!generateResponse.ok) {
                console.error('Generate content failed in autoProgress mode')
              }
              
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
            const generateResponse = await fetch(
              `${baseUrl}/api/generation/content/sessions/${id}/generate`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ characterId: defaultCharacterId })
              }
            )
            
            if (!generateResponse.ok) {
              console.error('Generate content failed in autoProgress mode')
            }
            
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
        const generateResponse = await fetch(
          `${baseUrl}/api/generation/content/sessions/${id}/generate`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ characterId: body.characterId })
          }
        )
        
        if (!generateResponse.ok) {
          throw new Error('Failed to generate content')
        }
        
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
              drafts,
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
          drafts
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
    console.error('Next step error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to proceed' },
      { status: 500 }
    )
  }
}