import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    
    console.log('=== Continue Step 4: 完全なコンテンツ作成 ===')
    console.log('Session ID:', sessionId)
    
    // セッション情報を取得
    let session = null
    let step1Results = null
    let step2Results = null
    let step3Results = null
    let config = {
      expertise: 'AIと働き方',
      platform: 'Twitter', 
      style: '洞察的'
    }
    
    try {
      session = await prisma.gptAnalysis.findUnique({
        where: { id: sessionId }
      })
      
      if (session) {
        const response = session.response as any
        step1Results = response?.step1
        step2Results = response?.step2
        step3Results = response?.step3
        const metadata = session.metadata as any
        if (metadata?.config) {
          config = metadata.config
        }
      }
    } catch (dbError) {
      console.warn('Database error, using mock data:', dbError instanceof Error ? dbError.message : 'Unknown error')
      // モックデータ
      step1Results = { summary: "バズ機会特定完了" }
      step2Results = { summary: "機会評価完了" }
      step3Results = { summary: "コンセプト作成完了" }
    }

    if (!step1Results || !step2Results || !step3Results) {
      return NextResponse.json(
        { error: 'Step 1-3をすべて先に完了してください' },
        { status: 400 }
      )
    }

    const startTime = Date.now()
    
    // Chain of Thought Step 4プロンプト
    const step4Prompt = buildStep4ChainPrompt(config, step1Results, step2Results, step3Results)
    
    console.log('Executing Step 4 with Chain of Thought context...')
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `あなたはバイラルコンテンツ戦略家です。Chain of Thoughtプロセスの第4段階を実行してください。

これまでの3段階で開発したコンセプトを基に、すぐに投稿できる完全なコンテンツを作成します。
専門分野: ${config.config?.expertise || config.expertise || 'AIと働き方'}
プラットフォーム: ${config.config?.platform || config.platform || 'Twitter'}
スタイル: ${config.config?.style || config.style || '洞察的'}

重要: コピー&ペーストでそのまま投稿できる形式で作成してください。`
        },
        {
          role: 'user', 
          content: step4Prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 4000
    })

    const duration = Date.now() - startTime
    const responseText = completion.choices[0].message.content || ''
    
    // Step 4結果の構造化
    const step4Results = {
      readyToPostContent: extractReadyToPostContent(responseText),
      contentDetails: extractContentDetails(responseText),
      postingInstructions: extractPostingInstructions(responseText),
      summary: responseText,
      nextStepPrompt: '続行', // ChatGPTスタイル
      completedAt: new Date().toISOString()
    }

    // Step 4結果を保存
    if (session) {
      try {
        const currentResponse = session.response as any || {}
        await prisma.gptAnalysis.update({
          where: { id: sessionId },
          data: {
            response: {
              ...currentResponse,
              step4: step4Results
            },
            tokens: (session.tokens || 0) + (completion.usage?.total_tokens || 0),
            duration: (session.duration || 0) + duration,
            metadata: {
              ...(session.metadata as any || {}),
              currentStep: 4,
              step4CompletedAt: new Date().toISOString()
            }
          }
        })
      } catch (dbError) {
        console.warn('Failed to save Step 4 results:', dbError instanceof Error ? dbError.message : 'Unknown error')
      }
    }

    return NextResponse.json({
      success: true,
      sessionId,
      step: 4,
      phase: 'continue',
      response: step4Results,
      metrics: {
        duration,
        tokens: completion.usage?.total_tokens
      },
      nextStep: {
        step: 5,
        url: `/api/viral/gpt-session/${sessionId}/continue-step5`,
        description: '実行戦略',
        action: 'continue',
        message: '投稿できる完全なバズるコンテンツができました。実行戦略については「続行」と入力してください。'
      }
    })

  } catch (error) {
    console.error('Continue Step 4 error:', error)
    
    return NextResponse.json(
      { 
        error: 'Step 4 続行処理でエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

function buildStep4ChainPrompt(config: any, step1Results: any, step2Results: any, step3Results: any) {
  return `【Chain of Thoughtプロセス - Step 4: 完全なコンテンツ作成】

前段階の結果:
**Step 1**: ${step1Results.summary}
**Step 2**: ${step2Results.summary}  
**Step 3**: ${step3Results.summary}

【Step 4の完全コンテンツ生成】

Step 3で開発した3つのコンセプトについて、以下の要件でコピー&ペースト可能な完全コンテンツを作成してください：

**作成要件**

1. **${config.config?.platform || config.platform || 'Twitter'}最適化**
   - 文字数制限内（Twitter: 280文字/投稿）
   - プラットフォーム慣習に準拠
   - エンゲージメント最大化設計

2. **完全装備コンテンツ**
   - 絵文字の効果的配置
   - ハッシュタグの最適配置
   - 改行・スペーシング最適化
   - 読みやすさ・視認性確保

3. **${config.config?.style || config.style || '洞察的'}トーン統一**
   - 一貫したブランドボイス
   - ターゲット層に響く表現
   - 専門性と親しみやすさのバランス

4. **エンゲージメント要素**
   - いいね・RT誘発設計
   - コメント促進要素
   - 共有動機の提供

5. **スレッド形式対応**
   - 必要に応じて複数投稿構成
   - 各投稿の独立性確保
   - 全体の流れ・ストーリー性

**出力形式**

以下の形式で3つのコンテンツを作成してください：

**コンセプト1**: [タイトル]
[完全な投稿文（絵文字・ハッシュタグ込み、そのままコピペ可能）]

[スレッドの場合は投稿2、3も続ける]

**コンセプト2**: [タイトル]
[完全な投稿文（絵文字・ハッシュタグ込み、そのままコピペ可能）]

**コンセプト3**: [タイトル]  
[完全な投稿文（絵文字・ハッシュタグ込み、そのままコピペ可能）]

**各コンテンツの付加情報**
- 最適投稿時間
- 期待エンゲージメント
- フォローアップ戦略

重要: 
- ${config.config?.expertise || config.expertise || 'AIと働き方'}の専門性を活かした内容
- 50代クリエイティブディレクターのペルソナ反映
- 実際のトレンド・ニュースに基づいた内容
- バズる要素（論争性・感情喚起・共感性・共有性）の組み込み

最後に以下のメッセージで締めくくってください：
「投稿できる完全なバズるコンテンツができました。実行戦略については「続行」と入力してください。」`
}

function extractReadyToPostContent(text: string) {
  // テキストからコンセプト別のコンテンツを抽出
  const concepts = []
  const conceptMatches = text.match(/\*\*コンセプト\d+\*\*:[\s\S]*?(?=\*\*コンセプト\d+\*\*:|$)/g)
  
  if (conceptMatches) {
    conceptMatches.forEach((match, index) => {
      const titleMatch = match.match(/\*\*コンセプト\d+\*\*:\s*(.+)/)
      const title = titleMatch ? titleMatch[1] : `コンセプト${index + 1}`
      
      // 投稿文を抽出（簡易版）
      const lines = match.split('\n').filter(line => line.trim() && !line.includes('**コンセプト'))
      const content = lines.slice(1).join('\n').trim()
      
      concepts.push({
        id: index + 1,
        title: title,
        content: content || 'コンテンツ生成中...',
        format: content.includes('🧵') ? 'thread' : 'single',
        readyToCopy: true
      })
    })
  }
  
  // フォールバック
  if (concepts.length === 0) {
    for (let i = 1; i <= 3; i++) {
      concepts.push({
        id: i,
        title: `コンセプト${i}`,
        content: '投稿準備完了コンテンツ生成中...',
        format: 'single',
        readyToCopy: false
      })
    }
  }
  
  return concepts
}

function extractContentDetails(text: string) {
  return {
    totalConcepts: 3,
    formats: ['single', 'thread'],
    optimizedFor: 'Twitter',
    includesEmojis: true,
    includesHashtags: true,
    engagementElements: true
  }
}

function extractPostingInstructions(text: string) {
  return {
    copyPasteReady: true,
    platformOptimized: true,
    timingRecommendations: '即時〜4時間以内',
    followUpStrategy: 'エンゲージメント監視・対応'
  }
}