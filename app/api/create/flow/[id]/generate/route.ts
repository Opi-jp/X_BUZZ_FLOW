import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { loadPrompt } from '@/lib/prompt-loader'
import Anthropic from '@anthropic-ai/sdk'
import { ErrorManager, DBManager, PromptManager, IDGenerator, EntityType } from '@/lib/core/unified-system-manager'
import { claudeLog } from '@/lib/core/claude-logger'

type RouteParams = {
  params: Promise<{
    id: string
  }>
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || ''
})

// キャラクターデータを自然文で表現
async function wrapCharacterProfile(characterId: string): Promise<string> {
  try {
    // キャラクターファイルを読み込み
    const fs = await import('fs/promises')
    const path = await import('path')
    const characterPath = path.join(process.cwd(), 'lib', 'prompts', 'characters', `${characterId}.json`)
    
    const characterData = await fs.readFile(characterPath, 'utf-8')
    const character = JSON.parse(characterData)
    
    // キャラクター情報を自然文に変換
    let profile = `あなたは「${character.name}」として投稿を作成します。\n\n`
    
    if (character.age) profile += `${character.name}（${character.age}歳）\n`
    if (character.background) profile += `- 経歴: ${character.background}\n`
    if (character.philosophy) profile += `- 哲学: 「${character.philosophy}」\n`
    if (character.personality) profile += `- 性格: ${character.personality}\n`
    if (character.tone) profile += `- 口調: ${character.tone}\n`
    if (character.traits) profile += `- 特徴: ${character.traits}`
    
    return profile
  } catch (error) {
    console.error(`Failed to load character profile: ${characterId}`, error)
    // デフォルトに戻る
    return `あなたはニュートラルで親しみやすいトーンで投稿を作成します。
情報を分かりやすく伝え、読者との共感を大切にしてください。`
  }
}

// コンセプトデータを自然文で表現
function wrapConceptData(concept: any): string {
  return `【コンセプト】${concept.conceptTitle}

選択されたフック: ${concept.selectedHook}
選択された角度: ${concept.selectedAngle}

物語構造:
1. オープニング: ${concept.structure.openingHook}
2. 背景: ${concept.structure.background}
3. メイン: ${concept.structure.mainContent}
4. 内省: ${concept.structure.reflection}
5. CTA: ${concept.structure.cta}

投稿形式: ${concept.format === 'thread' ? 'スレッド（複数投稿）' : '単独投稿'}
推奨ビジュアル: ${concept.visual}
投稿タイミング: ${concept.timing}`
}

export async function POST(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { characterId } = body

    if (!characterId) {
      return NextResponse.json(
        { error: 'Character ID is required' },
        { status: 400 }
      )
    }

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

    // selectedIds配列から実際のコンセプトデータを取得
    const selectedConceptIds = session.selectedIds as string[]
    if (!selectedConceptIds || selectedConceptIds.length === 0) {
      return NextResponse.json(
        { error: 'No selected concepts found' },
        { status: 400 }
      )
    }

    const allConcepts = session.concepts as any[]
    if (!allConcepts || allConcepts.length === 0) {
      return NextResponse.json(
        { error: 'No concepts available' },
        { status: 400 }
      )
    }

    // 選択されたコンセプトのみを抽出
    const selectedConcepts = allConcepts.filter(concept => 
      selectedConceptIds.includes(concept.conceptId)
    )

    // 生成された投稿を格納
    const generatedPosts = []

    // 各コンセプトに対して投稿を生成
    for (const concept of selectedConcepts) {
      let prompt = '' // スコープを外に出す
      try {
        claudeLog('Processing concept', { 
          sessionId: id,
          conceptId: concept.conceptId,
          format: concept.format 
        })
        
        // formatに基づいてプロンプトパスを決定
        const formatSuffix = concept.format === 'thread' ? 'thread' : 'simple'
        const promptPath = `claude/character-profiles/${characterId}-${formatSuffix}.txt`
        
        const characterProfile = await wrapCharacterProfile(characterId)
        const conceptData = wrapConceptData(concept)
        
        claudeLog('Loading prompt', { promptPath })
        
        // プロンプトローダーで変数を展開
        prompt = await PromptManager.load(
          promptPath,
          {
            character: characterProfile,
            concept: conceptData,
            platform: session.platform || 'Twitter',
            theme: session.theme || ''
          },
          { validate: true, cache: true }
        )

        claudeLog('Prompt loaded', { promptLength: prompt.length })

        const response = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-latest',
          max_tokens: 2000,
          temperature: 0.8,
          messages: [{
            role: 'user',
            content: prompt
          }]
        })

        const content = response.content[0]
        if (content.type === 'text') {
          claudeLog('Claude response received', { 
            responseLength: content.text.length,
            preview: content.text.substring(0, 200)
          })
          
          // Claudeのレスポンスが直接テキストの場合
          const responseText = content.text.trim()
          
          // formatに応じてレスポンスを処理
          let postData
          if (concept.format === 'thread') {
            // スレッド形式の場合はJSONパース
            try {
              const threadData = JSON.parse(responseText)
              // post1-post5形式をpostsの配列に変換
              const posts = []
              for (let i = 1; i <= 5; i++) {
                const postKey = `post${i}`
                if (threadData[postKey]) {
                  posts.push(threadData[postKey])
                }
              }
              postData = { 
                posts,
                format: 'thread'
              }
            } catch (parseError) {
              console.error('Failed to parse thread JSON:', parseError)
              // エラーの場合はスキップ
              continue
            }
          } else {
            // シングル形式の場合はテキストをそのまま使用
            postData = { 
              content: responseText,
              format: 'single'
            }
          }
          
          generatedPosts.push({
            conceptId: concept.conceptId,
            conceptTitle: concept.conceptTitle,
            characterId,
            ...postData
          })
        }
      } catch (error) {
        console.error(`Error generating post for concept ${concept.conceptId}:`, error)
        console.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          conceptTitle: concept.conceptTitle,
          characterId,
          promptLength: prompt ? prompt.length : 0
        })
        // エラーがあってもスキップして続行
      }
    }

    if (generatedPosts.length === 0) {
      return NextResponse.json(
        { error: 'Failed to generate any posts' },
        { status: 500 }
      )
    }

    // セッションを更新
    const updatedSession = await DBManager.transaction(async (tx) => {
      return await tx.viral_sessions.update({
        where: { id },
        data: {
          contents: generatedPosts,
          status: 'COMPLETED'
        }
      })
    })

    // 下書きを作成（ViralDraftV2を使用）
    await DBManager.transaction(async (tx) => {
      for (const post of generatedPosts) {
        // コンセプトから関連するハッシュタグを取得
        const matchingConcept = selectedConcepts.find(c => c.conceptId === post.conceptId)
        const hashtags = matchingConcept?.hashtags || ['#AI', '#働き方', '#未来']
        
        const draftId = IDGenerator.generate(EntityType.DRAFT)
        
        if (post.format === 'thread') {
          // スレッド形式の場合は、posts配列をJSONとして保存
          await tx.viral_drafts_v2.create({
            data: {
              id: draftId,
              sessionId: id,
              conceptId: post.conceptId,
              title: post.conceptTitle || 'Generated Thread',
              content: JSON.stringify({
                format: 'thread',
                posts: post.posts
              }),
              hashtags: hashtags,
              visualNote: matchingConcept?.visual,
              characterId: post.characterId,
              characterNote: `Generated as ${post.characterId} (thread)`,
              status: 'DRAFT'
            }
          })
        } else {
          // シングル形式の場合は、contentをそのまま保存
          await tx.viral_drafts_v2.create({
            data: {
              id: draftId,
              sessionId: id,
              conceptId: post.conceptId,
              title: post.conceptTitle || 'Generated Content',
              content: post.content,
              hashtags: hashtags,
              visualNote: matchingConcept?.visual,
              characterId: post.characterId,
              characterNote: `Generated as ${post.characterId} (single)`,
              status: 'DRAFT'
            }
          })
        }
      }
    })
    
    claudeLog('Content generation completed', { 
      sessionId: id,
      generatedCount: generatedPosts.length 
    })

    return NextResponse.json({ 
      success: true,
      generatedCount: generatedPosts.length,
      session: updatedSession
    })
  } catch (error) {
    const errorId = await ErrorManager.logError(error, {
      module: 'create-flow-generate',
      operation: 'generate-content',
      sessionId: id,
      characterId: body?.characterId
    })
    
    const userMessage = ErrorManager.getUserMessage(error, 'ja')
    
    return NextResponse.json(
      { error: userMessage, errorId },
      { status: 500 }
    )
  }
}