import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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
    const { selectedIds } = body
    
    if (!selectedIds || !Array.isArray(selectedIds) || selectedIds.length === 0) {
      return NextResponse.json(
        { error: 'selectedIds is required and must be a non-empty array' },
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
    
    if (!session.concepts || session.status !== 'CONCEPTS_GENERATED') {
      return NextResponse.json(
        { error: 'Concepts not generated yet' },
        { status: 400 }
      )
    }

    // ステータスと選択されたIDを更新
    await prisma.viralSession.update({
      where: { id },
      data: { 
        status: 'GENERATING_CONTENTS',
        selectedIds 
      }
    })

    const allConcepts = session.concepts as any[]
    const selectedConcepts = allConcepts.filter(concept => 
      selectedIds.includes(concept.conceptId)
    )
    
    if (selectedConcepts.length === 0) {
      throw new Error('No matching concepts found for selected IDs')
    }

    // 各選択されたコンセプトに対してコンテンツを生成
    const contentPromises = selectedConcepts.map(async (concept) => {
      let prompt = `あなたは、新たなトレンドを特定し、流行の波がピークに達する前にその波に乗るコンテンツのコンセプトを作成するバズるコンテンツ戦略家です。

以下のコンセプトを元に、【${session.platform}】で【${session.style}】スタイルの投稿を作成してください。

トピック: ${concept.topicTitle}
形式: ${concept.format}
フックタイプ: ${concept.hookType || '未指定'}
角度: ${concept.angle}

【コンセプトの投稿構造】
${concept.structure ? `
1. オープニングフック: ${concept.structure.openingHook}
2. 背景／問題提起: ${concept.structure.background}
3. 具体的な中身: ${concept.structure.mainContent}
4. 内省・共感・まとめ: ${concept.structure.reflection}
5. CTA: ${concept.structure.cta}
` : `
フック: ${concept.hook || ''}
キーポイント: ${concept.keyPoints ? concept.keyPoints.join(', ') : ''}
`}

推奨ハッシュタグ: ${concept.hashtags ? concept.hashtags.join(', ') : 'なし'}
推奨ビジュアル: ${concept.visual || 'なし'}
推奨投稿タイミング: ${concept.timing || 'なし'}

物語性のある魅力的な投稿を作成してください。単なる情報伝達ではなく、読者の感情を動かし、共感を生み、シェアしたくなる物語として構成してください。

要件:
- ${session.style}スタイルを意識した文体
- 適切な絵文字の使用
- ハッシュタグは3-5個
- 元記事へのリンクを含める（${concept.topicUrl}）
- CTAを含める
- 【重要】投稿は140文字ギリギリまで使い切るように作成してください。135-140文字の範囲で最適化し、伝えたい内容を最大限に詰め込んでください`

      // フォーマット別の追加指示
      if (concept.format === 'thread') {
        prompt += `

スレッド形式の要件:
- 3-5個のツイートに分割
- 【重要】各ツイートは135-140文字の範囲で最適化（文字数を最大限活用）
- 「1/5」のような番号を付ける
- 各ツイートは独立しても意味が通じるように
- 最初のツイートにフックを配置
- 最後のツイートにCTAとURLを配置

以下のJSON形式で出力してください:
{
  "tweets": [
    {
      "number": "1/5",
      "content": "ツイート本文",
      "charCount": 文字数
    }
  ],
  "hashtags": ["ハッシュタグ1", "ハッシュタグ2"],
  "visualNote": "必要な画像や動画の説明"
}`
      } else {
        prompt += `

以下のJSON形式で出力してください:
{
  "content": "投稿本文（改行、絵文字、ハッシュタグ含む）",
  "hashtags": ["ハッシュタグ1", "ハッシュタグ2"],
  "visualNote": "必要な画像や動画の説明"
}`
      }

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `あなたは、新たなトレンドを特定し、流行の波がピークに達する前にその波に乗るコンテンツのコンセプトを作成するバズるコンテンツ戦略家です。文字数を最大限活用し、各投稿を135-140文字の範囲で最適化することが重要です。短い投稿は避け、伝えたい内容を最大限に詰め込んでください。JSON形式で正確に出力してください。`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.9,
        max_tokens: 2000
      })

      const content = response.choices[0].message.content || '{}'
      let parsedContent = {}
      
      try {
        parsedContent = JSON.parse(content)
      } catch (e) {
        console.error('Failed to parse content:', e)
        // JSONブロックを探す
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsedContent = JSON.parse(jsonMatch[0])
          } catch (e2) {
            console.error('Failed to parse extracted JSON:', e2)
          }
        }
      }

      return {
        conceptId: concept.conceptId,
        concept,
        generatedContent: parsedContent
      }
    })

    const allContents = await Promise.all(contentPromises)

    console.log(`Generated ${allContents.length} contents`)

    // 下書きを作成
    const draftPromises = allContents.map(async (item) => {
      const { concept, generatedContent } = item
      
      // コンテンツテキストの取得
      let contentText = ''
      if (concept.format === 'thread' && generatedContent.tweets) {
        contentText = generatedContent.tweets
          .map((t: any) => t.content)
          .join('\n\n')
      } else {
        contentText = generatedContent.content || ''
      }

      return prisma.viralDraftV2.create({
        data: {
          sessionId: id,
          conceptId: concept.conceptId,
          title: concept.hook.substring(0, 100),
          content: contentText,
          hashtags: generatedContent.hashtags || [],
          visualNote: generatedContent.visualNote || null,
          status: 'DRAFT'
        }
      })
    })

    const drafts = await Promise.all(draftPromises)

    // セッションを更新
    const updatedSession = await prisma.viralSession.update({
      where: { id },
      data: {
        contents: allContents,
        status: 'COMPLETED'
      }
    })

    return NextResponse.json({
      success: true,
      session: updatedSession,
      draftsCreated: drafts.length
    })
    
  } catch (error) {
    console.error('Error generating contents:', error)
    
    // エラー時はステータスを戻す
    try {
      await prisma.viralSession.update({
        where: { id: (await params).id },
        data: { status: 'CONCEPTS_GENERATED' }
      })
    } catch (e) {
      // リセットエラーは無視
    }
    
    return NextResponse.json(
      { error: 'Failed to generate contents' },
      { status: 500 }
    )
  }
}