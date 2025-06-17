import { NextResponse } from 'next/server'
import { PrismaClient } from '@/lib/generated/prisma'
import { generateCharacterContentBatch } from '@/lib/character-content-generator'
import { DEFAULT_CHARACTERS } from '@/types/character'

const prisma = new PrismaClient()

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
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
    
    const body = await request.json()
    const { characterId, voiceStyleMode = 'normal' } = body

    // セッション取得
    const session = await prisma.viralSession.findUnique({
      where: { id }
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    if (!session.concepts) {
      return NextResponse.json(
        { error: 'No concepts found in session' },
        { status: 400 }
      )
    }

    // キャラクター取得（現在はデフォルトキャラクターから）
    const character = DEFAULT_CHARACTERS.find(c => c.id === characterId)
    if (!character) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      )
    }

    // コンセプトを取得
    const concepts = session.concepts as any[]
    
    // 選択されたコンセプトのみ処理（selectedIdsがある場合）
    const conceptsToProcess = session.selectedIds.length > 0
      ? concepts.filter(c => session.selectedIds.includes(c.conceptId))
      : concepts.slice(0, 5) // デフォルトは最初の5つ

    console.log(`[Generate Character Contents] Processing ${conceptsToProcess.length} concepts with character: ${character.name}`)

    // キャラクターベースのコンテンツ生成
    const results = await generateCharacterContentBatch({
      character,
      concepts: conceptsToProcess,
      voiceMode: voiceStyleMode,
      topicInfo: session.topics ? {
        title: (session.topics as any).title || session.theme,
        url: (session.topics as any).url || ''
      } : undefined
    })

    // 生成されたコンテンツを保存
    const drafts = []
    for (const result of results) {
      if (!result.error) {
        const draft = await prisma.viralDraftV2.create({
          data: {
            sessionId: id,
            conceptId: result.conceptId,
            title: result.content.substring(0, 50) + '...',
            content: result.content,
            hashtags: result.hashtags,
            characterId: character.id,
            characterNote: result.characterNote,
            sourceUrl: result.sourceUrl,
            status: 'DRAFT'
          }
        })
        drafts.push(draft)
      }
    }

    // セッションを更新
    await prisma.viralSession.update({
      where: { id },
      data: {
        status: 'CONTENTS_GENERATED',
        characterProfileId: character.id,
        voiceStyleMode,
        contents: results
      }
    })

    return NextResponse.json({
      success: true,
      character: {
        id: character.id,
        name: character.name,
        catchphrase: character.catchphrase
      },
      generatedCount: drafts.length,
      drafts: drafts.map(d => ({
        id: d.id,
        title: d.title,
        content: d.content,
        hashtags: d.hashtags
      }))
    })

  } catch (error) {
    console.error('[Generate Character Contents] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate character contents' },
      { status: 500 }
    )
  }
}