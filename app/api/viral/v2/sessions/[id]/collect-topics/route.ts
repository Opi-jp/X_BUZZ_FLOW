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
    const { reuseTopics = false } = await request.json().catch(() => ({}))
    
    // Validate ID
    if (!id || id === 'undefined' || id === 'null') {
      return NextResponse.json(
        { error: 'Invalid session ID' },
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
    
    if (session.status !== 'CREATED' && !reuseTopics) {
      return NextResponse.json(
        { error: 'Session already processed' },
        { status: 400 }
      )
    }
    
    // 再利用モード: 同じテーマの最新のトピックを探す
    if (reuseTopics) {
      const recentSession = await prisma.viralSession.findFirst({
        where: {
          theme: session.theme,
          status: { in: ['TOPICS_COLLECTED', 'CONCEPTS_GENERATED', 'CONTENTS_GENERATED', 'COMPLETED'] },
          topics: { not: null },
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24時間以内
          }
        },
        orderBy: { createdAt: 'desc' }
      })
      
      if (recentSession && recentSession.topics) {
        // 既存のトピックを再利用
        await prisma.viralSession.update({
          where: { id },
          data: {
            status: 'TOPICS_COLLECTED',
            topics: recentSession.topics
          }
        })
        
        const topics = recentSession.topics as any
        return NextResponse.json({
          success: true,
          reused: true,
          sourceSessionId: recentSession.id,
          session: {
            id,
            theme: session.theme,
            status: 'TOPICS_COLLECTED',
            topics
          },
          topicsCount: topics.parsed?.length || 0
        })
      }
    }

    // ステータスを更新
    await prisma.viralSession.update({
      where: { id },
      data: { status: 'COLLECTING' }
    })

    // Perplexityプロンプトを構築
    const prompt = `あなたは、新たなトレンドを特定し、流行の波がピークに達する前にその波に乗るコンテンツのコンセプトを作成するバズるコンテンツ戦略家です。

【${session.theme}】について【${session.platform}】において【${session.style}】で発信するためのバズるコンテンツを作成したいです。

以下の視点でトレンド情報を収集・分析し、直近でバズリそうなトピックを3つ特定してください。

重要な要件：
- 必ず最低でも1つは48時間以内のニュースソースを含めてください
- 判断の元となったニュースソースのURLを全て明記してください（複数可）
- 各トピックごとに複数のソースがある場合は、additionalSourcesフィールドに含めてください

A：現在の出来事の分析
- ${session.theme}に関する最新ニュース（特に感情的な反応を引き起こしているもの）
- この分野での有名人の発言や事件と、それに対する世間の強い反応
- ${session.theme.split('と')[0]}と${session.theme.split('と')[1] || '社会'}に関する政治的議論で意見が分かれているもの

B：テクノロジーの発表とテクノロジードラマ
- ${session.theme.split('と')[0]}導入を巡る企業の対立や論争
- ${session.theme}の変化に関する文化的な衝突や社会運動
- 予想外の展開や驚きを生んだ事例
- インターネット上で話題になっているドラマチックな出来事

C：ソーシャルリスニング研究
- ${session.platform}で急速に広がっている${session.theme}のトレンドやハッシュタグ
- TikTokで話題の${session.theme.split('と')[0]}関連のサウンドやチャレンジ
- Redditで感情的な議論が起きている投稿
- 急上昇しているGoogleトレンド
- バズっているYouTube動画
- ニュース記事のコメント欄で熱い議論になっているトピック

D：バイラルパターン認識
特に以下の要素を含むトピックを重点的に探してください：
- 強い意見の対立がある（賛成派vs反対派）
- 感情を強く刺激する（怒り、喜び、驚き、憤慨）
- 多くの人が共感できる体験談
- 思わずシェアしたくなる驚きの事実
- 今すぐ知らないと損するタイムリーな話題
- ${session.platform}文化に合った面白さやミーム性

なお、出力は下記のJSON形式で出力してください。

{
  "TOPIC": "トピックのタイトル",
  "url": "メインの記事URL",
  "date": "公開日（YYYY-MM-DD形式）",
  "summary": "記事の詳細な要約（400文字）",
  "keyPoints": [
    "重要ポイント1",
    "重要ポイント2",
    "重要ポイント3",
    "重要ポイント4",
    "重要ポイント5"
  ],
  "perplexityAnalysis": "なぜこれがバズる可能性があるのか、感情的な要素や対立構造を含めて分析（200文字）",
  "additionalSources": [
    {
      "url": "追加ソースURL1",
      "title": "記事タイトル",
      "date": "公開日"
    }
  ]
}`

    console.log('Calling Perplexity API...')
    
    // Perplexity APIを呼び出し
    const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [
          {
            role: 'system',
            content: '質問の意図を理解し、3つのトピックをJSON形式で提供してください。必ずURLと日付を含めてください。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.7,
        top_p: 0.9
      })
    })

    if (!perplexityResponse.ok) {
      const error = await perplexityResponse.text()
      console.error('Perplexity API error:', error)
      throw new Error('Perplexity API request failed')
    }

    const perplexityData = await perplexityResponse.json()
    const content = perplexityData.choices[0].message.content
    
    console.log('Perplexity response received:', content.length, 'characters')

    // レスポンスからトピックを抽出
    let topics = []
    try {
      // マークダウンコードブロック内のJSONを抽出
      const jsonCodeBlocks = content.matchAll(/```json\n([\s\S]*?)\n```/g)
      for (const match of jsonCodeBlocks) {
        try {
          const topic = JSON.parse(match[1])
          if (topic.TOPIC) {
            topics.push(topic)
          }
        } catch (e) {
          console.error('Failed to parse JSON block:', e)
        }
      }
      
      // コードブロックが見つからない場合は、通常のJSON抽出を試みる
      if (topics.length === 0) {
        const jsonMatches = content.matchAll(/\{[\s\S]*?\}/g)
        for (const match of jsonMatches) {
          try {
            const topic = JSON.parse(match[0])
            if (topic.TOPIC) {
              topics.push(topic)
            }
          } catch (e) {
            // 個別のJSONパースエラーは無視
          }
        }
      }
    } catch (error) {
      console.error('Error parsing topics:', error)
    }

    // トピックが見つからない場合は、content全体をパースしてみる
    if (topics.length === 0) {
      try {
        const parsed = JSON.parse(content)
        if (Array.isArray(parsed)) {
          topics = parsed
        } else if (parsed.topics) {
          topics = parsed.topics
        }
      } catch (e) {
        console.error('Failed to parse as single JSON:', e)
      }
    }

    console.log(`Found ${topics.length} topics`)

    // セッションを更新
    const updatedSession = await prisma.viralSession.update({
      where: { id },
      data: {
        topics: {
          raw: content,
          parsed: topics,
          sources: perplexityData.search_results || [],
          citations: perplexityData.citations || []
        },
        status: 'TOPICS_COLLECTED'
      }
    })

    return NextResponse.json({
      success: true,
      session: updatedSession,
      topicsCount: topics.length
    })
    
  } catch (error) {
    console.error('Error collecting topics:', error)
    
    // エラー時はセッションをリセット
    try {
      await prisma.viralSession.update({
        where: { id: (await params).id },
        data: { status: 'CREATED' }
      })
    } catch (e) {
      // リセットエラーは無視
    }
    
    return NextResponse.json(
      { error: 'Failed to collect topics' },
      { status: 500 }
    )
  }
}