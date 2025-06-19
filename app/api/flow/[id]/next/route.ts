import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

    // 現在の状態に基づいて次のアクションを実行
    if (!session.topics) {
      // Perplexity収集（通常は自動で開始されているはず）
      const response = await fetch(
        `${baseUrl}/api/generation/content/sessions/${id}/collect`,
        { method: 'POST' }
      )
      
      if (!response.ok) {
        throw new Error('Failed to collect topics')
      }
      
      return NextResponse.json({
        action: 'collecting',
        message: 'トピック収集を開始しました'
      })
      
    } else if (!session.concepts) {
      // GPTコンセプト生成
      const response = await fetch(
        `${baseUrl}/api/generation/content/sessions/${id}/generate-concepts`,
        { method: 'POST' }
      )
      
      if (!response.ok) {
        throw new Error('Failed to generate concepts')
      }
      
      return NextResponse.json({
        action: 'generating_concepts',
        message: 'コンセプト生成を開始しました'
      })
      
    } else if (!session.selectedIds || session.selectedIds.length === 0) {
      // コンセプト選択が必要
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
      
    } else if (!session.contents) {
      // キャラクター選択とClaude生成
      if (!body.characterId) {
        return NextResponse.json({
          action: 'select_character',
          characters: [
            { id: 'cardi-dare', name: 'カーディ・ダーレ', description: '53歳の元詐欺師、シニカルだが根は優しい' },
            { id: 'neutral', name: 'ニュートラル', description: '親しみやすく分かりやすいトーン' }
          ],
          message: 'キャラクターを選択してください'
        })
      }
      
      // Claude生成
      const response = await fetch(
        `${baseUrl}/api/generation/content/sessions/${id}/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ characterId: body.characterId })
        }
      )
      
      if (!response.ok) {
        throw new Error('Failed to generate content')
      }
      
      return NextResponse.json({
        action: 'generating_content',
        message: '投稿を生成中です'
      })
      
    } else {
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
    }

  } catch (error) {
    console.error('Next step error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to proceed' },
      { status: 500 }
    )
  }
}