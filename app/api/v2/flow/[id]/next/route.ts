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

    // 現在の状態に基づいて次のステップを決定
    let nextStep = ''
    let apiUrl = ''
    
    if (!session.topics) {
      // Step 1: Perplexity収集
      nextStep = 'collecting'
      apiUrl = `/api/generation/content/sessions/${id}/collect`
    } else if (!session.concepts) {
      // Step 2: GPTコンセプト生成
      nextStep = 'generating_concepts'
      apiUrl = `/api/generation/content/sessions/${id}/generate-concepts`
    } else if (!session.claudeData) {
      // Step 3: Claude投稿生成
      nextStep = 'generating_contents'
      
      // コンセプト選択が必要な場合
      if (!body.selectedConcepts) {
        return NextResponse.json({
          action: 'select_concepts',
          concepts: session.concepts,
          message: 'コンセプトを選択してください'
        })
      }
      
      // 選択されたコンセプトを保存
      await prisma.viralSession.update({
        where: { id },
        data: { selectedConcepts: body.selectedConcepts }
      })
      
      // キャラクター選択が必要な場合
      if (!body.characterId) {
        return NextResponse.json({
          action: 'select_character',
          characters: [
            { id: 'cardi-dare', name: 'カーディ・ダーレ' },
            { id: 'neutral', name: 'ニュートラル' }
          ],
          message: 'キャラクターを選択してください'
        })
      }
      
      // Claude生成を実行
      const generateResponse = await fetch(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/generation/content/sessions/${id}/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ characterId: body.characterId })
        }
      )
      
      if (!generateResponse.ok) {
        throw new Error('Content generation failed')
      }
      
      return NextResponse.json({
        status: 'generating',
        message: '投稿を生成中です'
      })
    } else {
      // すべて完了
      return NextResponse.json({
        status: 'completed',
        message: 'すべての処理が完了しました',
        drafts: await prisma.viralDraft.findMany({
          where: { sessionId: id },
          select: {
            id: true,
            content: true,
            metadata: true
          }
        })
      })
    }

    // 次のステップを実行
    if (apiUrl) {
      const response = await fetch(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}${apiUrl}`,
        { method: 'POST' }
      )
      
      if (!response.ok) {
        throw new Error(`Failed to execute ${nextStep}`)
      }
      
      return NextResponse.json({
        status: nextStep,
        message: `${nextStep}を開始しました`
      })
    }

  } catch (error) {
    console.error('Next step error:', error)
    return NextResponse.json(
      { error: 'Failed to proceed to next step' },
      { status: 500 }
    )
  }
}