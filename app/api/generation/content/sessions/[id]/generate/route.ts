import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readFile } from 'fs/promises'
import { join } from 'path'
import Anthropic from '@anthropic-ai/sdk'

type RouteParams = {
  params: Promise<{
    id: string
  }>
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || ''
})

// キャラクターデータを自然文で表現
function wrapCharacterProfile(characterId: string): string {
  const profiles: Record<string, string> = {
    'cardi-dare': `あなたは「カーディ・ダーレ」として投稿を作成します。

カーディ・ダーレ（53歳）
- 経歴: 元詐欺師 → 元王様 → 現在はただの飲んだくれ
- 哲学: 「人間は最適化できない。それが救いだ」
- 性格: シニカルで辛辣、しかし根は優しい。人生経験豊富
- 口調: ぶっきらぼうで皮肉っぽいが、時折優しさが滲む
- 特徴: ツイートに酒の話題がよく出る。理想主義者を小馬鹿にしつつも、その純粋さを密かに羨んでいる`,
    
    'default': `あなたはニュートラルで親しみやすいトーンで投稿を作成します。
情報を分かりやすく伝え、読者との共感を大切にしてください。`
  }
  
  return profiles[characterId] || profiles['default']
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
    const session = await prisma.viralSession.findUnique({
      where: { id }
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    const selectedConcepts = session.selectedConcepts as any[]
    if (!selectedConcepts || selectedConcepts.length === 0) {
      return NextResponse.json(
        { error: 'No selected concepts found' },
        { status: 400 }
      )
    }

    // プロンプトファイルを読み込み
    const promptPath = join(
      process.cwd(),
      'lib',
      'prompts',
      'claude',
      'character-profiles',
      `${characterId}.txt`
    )
    
    let promptTemplate = ''
    try {
      promptTemplate = await readFile(promptPath, 'utf-8')
    } catch (error) {
      // デフォルトプロンプトを使用
      promptTemplate = await readFile(
        join(process.cwd(), 'lib', 'prompts', 'claude', 'generate-post.txt'),
        'utf-8'
      )
    }

    // 生成された投稿を格納
    const generatedPosts = []

    // 各コンセプトに対して投稿を生成
    for (const concept of selectedConcepts) {
      const characterProfile = wrapCharacterProfile(characterId)
      const conceptData = wrapConceptData(concept)
      
      // プロンプトの変数を置換
      const prompt = promptTemplate
        .replace('${characterProfile}', characterProfile)
        .replace('${conceptData}', conceptData)
        .replace('${platform}', session.platform || 'Twitter')
        .replace('${theme}', session.theme || '')

      try {
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
          const postData = JSON.parse(content.text)
          generatedPosts.push({
            conceptId: concept.conceptId,
            conceptTitle: concept.conceptTitle,
            characterId,
            ...postData
          })
        }
      } catch (error) {
        console.error(`Error generating post for concept ${concept.conceptId}:`, error)
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
    const updatedSession = await prisma.viralSession.update({
      where: { id },
      data: {
        claudeData: generatedPosts,
        currentPhase: 'COMPLETED',
        status: 'completed',
        updatedAt: new Date()
      }
    })

    // 下書きを作成
    for (const post of generatedPosts) {
      await prisma.viralDraft.create({
        data: {
          sessionId: id,
          conceptId: post.conceptId,
          characterId: post.characterId,
          content: post.format === 'thread' 
            ? post.posts.map((p: any) => p.content).join('\n\n') 
            : post.content,
          format: post.format,
          posts: post.posts,
          metadata: {
            conceptTitle: post.conceptTitle,
            tone: post.tone,
            callToAction: post.callToAction,
            engagementHooks: post.engagementHooks
          },
          status: 'draft'
        }
      })
    }

    return NextResponse.json({ 
      success: true,
      generatedCount: generatedPosts.length,
      session: updatedSession
    })
  } catch (error) {
    console.error('Error generating content:', error)
    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    )
  }
}