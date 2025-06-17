import { NextResponse } from 'next/server'
import { PrismaClient } from '@/lib/generated/prisma'
import { generateCharacterContentBatchV2 } from '@/lib/character-content-generator-v2'
import { DEFAULT_CHARACTERS } from '@/types/character'

const prisma = new PrismaClient()

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { 
      characterId, 
      voiceStyleMode = 'normal',
      format = 'simple' // simple or thread
    } = body

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

    // キャラクター取得
    const character = DEFAULT_CHARACTERS.find(c => c.id === characterId)
    if (!character) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      )
    }

    // コンセプトを取得
    const concepts = session.concepts as any[]
    
    // 選択されたコンセプトのみ処理
    const conceptsToProcess = session.selectedIds.length > 0
      ? concepts.filter(c => session.selectedIds.includes(c.conceptId))
      : concepts.slice(0, 5)

    console.log(`[Generate Character Contents V2] Processing ${conceptsToProcess.length} concepts with ${character.name} in ${format} format`)

    // キャラクターベースのコンテンツ生成
    const results = await generateCharacterContentBatchV2({
      character,
      concepts: conceptsToProcess,
      voiceMode: voiceStyleMode,
      topicInfo: session.topics ? {
        title: (session.topics as any).parsed?.[0]?.TOPIC || session.theme,
        url: (session.topics as any).parsed?.[0]?.url || ''
      } : undefined,
      format
    })

    // 生成されたコンテンツを保存
    const drafts = []
    for (const result of results) {
      if (!result.error) {
        if (format === 'simple' && result.mainPost) {
          // シンプルな2連投稿の場合
          const draft = await prisma.viralDraftV2.create({
            data: {
              sessionId: id,
              conceptId: result.conceptId,
              title: result.mainPost.substring(0, 50) + '...',
              content: JSON.stringify({
                mainPost: result.mainPost,
                replyPost: result.replyPost
              }),
              hashtags: result.hashtags,
              characterId: character.id,
              characterNote: result.characterNote,
              status: 'DRAFT'
            }
          })
          drafts.push(draft)
        } else if (format === 'thread' && result.threadPosts) {
          // スレッド形式の場合
          const draft = await prisma.viralDraftV2.create({
            data: {
              sessionId: id,
              conceptId: result.conceptId,
              title: result.threadPosts[0].substring(0, 50) + '...',
              content: JSON.stringify({
                threadPosts: result.threadPosts,
                sourcePost: result.sourcePost
              }),
              hashtags: result.hashtags,
              characterId: character.id,
              characterNote: result.characterNote,
              status: 'DRAFT'
            }
          })
          drafts.push(draft)
        } else if (result.content) {
          // 他のキャラクターの場合
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
      format,
      generatedCount: drafts.length,
      drafts: drafts.map(d => ({
        id: d.id,
        title: d.title,
        content: d.content,
        hashtags: d.hashtags
      }))
    })

  } catch (error) {
    console.error('[Generate Character Contents V2] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate character contents' },
      { status: 500 }
    )
  }
}