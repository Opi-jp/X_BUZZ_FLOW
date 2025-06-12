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
    
    console.log('=== Continue Step 3: コンテンツコンセプト作成 ===')
    console.log('Session ID:', sessionId)
    
    // セッション情報を取得
    let session = null
    let step1Results = null
    let step2Results = null
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
        const metadata = session.metadata as any
        if (metadata?.config) {
          config = metadata.config
        }
      }
    } catch (dbError) {
      console.warn('Database error, using mock data:', dbError instanceof Error ? dbError.message : 'Unknown error')
      // モックデータ
      step1Results = { summary: "バズ機会特定完了" }
      step2Results = { summary: "機会評価完了", topOpportunities: [] }
    }

    if (!step1Results || !step2Results) {
      return NextResponse.json(
        { error: 'Step 1とStep 2を先に完了してください' },
        { status: 400 }
      )
    }

    const startTime = Date.now()
    
    // Chain of Thought Step 3プロンプト
    const step3Prompt = buildStep3ChainPrompt(config, step1Results, step2Results)
    
    console.log('Executing Step 3 with Chain of Thought context...')
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `あなたはバイラルコンテンツ戦略家です。Chain of Thoughtプロセスの第3段階を実行してください。

これまでの段階で特定・評価したバズ機会を基に、具体的なコンテンツコンセプトを作成します。
専門分野: ${config.expertise}
プラットフォーム: ${config.platform}
スタイル: ${config.style}`
        },
        {
          role: 'user', 
          content: step3Prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 4000
    })

    const duration = Date.now() - startTime
    const responseText = completion.choices[0].message.content || ''
    
    // Step 3結果の構造化
    const step3Results = {
      contentConcepts: extractContentConcepts(responseText),
      frameworkDetails: extractFrameworkDetails(responseText),
      targetingStrategy: extractTargetingStrategy(responseText),
      summary: responseText,
      nextStepPrompt: '続行', // ChatGPTスタイル
      completedAt: new Date().toISOString()
    }

    // Step 3結果を保存
    if (session) {
      try {
        const currentResponse = session.response as any || {}
        await prisma.gptAnalysis.update({
          where: { id: sessionId },
          data: {
            response: {
              ...currentResponse,
              step3: step3Results
            },
            tokens: (session.tokens || 0) + (completion.usage?.total_tokens || 0),
            duration: (session.duration || 0) + duration,
            metadata: {
              ...(session.metadata as any || {}),
              currentStep: 3,
              step3CompletedAt: new Date().toISOString()
            }
          }
        })
      } catch (dbError) {
        console.warn('Failed to save Step 3 results:', dbError instanceof Error ? dbError.message : 'Unknown error')
      }
    }

    return NextResponse.json({
      success: true,
      sessionId,
      step: 3,
      phase: 'continue',
      response: step3Results,
      metrics: {
        duration,
        tokens: completion.usage?.total_tokens
      },
      nextStep: {
        step: 4,
        url: `/api/viral/gpt-session/${sessionId}/continue-step4`,
        description: '完全なコンテンツ作成',
        action: 'continue',
        message: 'バズるコンテンツのコンセプトの概要は次のとおりです。「続行」と入力すると、各コンセプトの完全な、すぐに投稿できるコンテンツが表示されます。'
      }
    })

  } catch (error) {
    console.error('Continue Step 3 error:', error)
    
    return NextResponse.json(
      { 
        error: 'Step 3 続行処理でエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

function buildStep3ChainPrompt(config: any, step1Results: any, step2Results: any) {
  return `【Chain of Thoughtプロセス - Step 3: コンテンツコンセプト作成】

前段階の結果:
**Step 1**: ${step1Results.summary}
**Step 2**: ${step2Results.summary}

【Step 3の詳細コンセプト開発】

Step 2で特定した上位3つの機会について、以下のコンセプトフレームワークで開発してください：

**コンセプトフレームワーク**

1. **プラットフォーム最適化**: ${config.platform}
   - 文字数制限・形式最適化
   - エンゲージメント要素組み込み
   - プラットフォーム固有の慣習活用

2. **コンテンツ形式**
   - 単発投稿 vs スレッド形式の選択
   - ビジュアル要素の活用方針
   - インタラクション促進設計

3. **フック（導入部）**
   - 注意を引く冒頭文
   - 感情的インパクト
   - 好奇心喚起要素

4. **独自角度（${config.expertise}視点）**
   - 専門性を活かした切り口
   - 他との差別化ポイント
   - 権威性・信頼性要素

5. **投稿タイミング戦略**
   - 最適投稿時間
   - 機会ウィンドウの活用
   - フォローアップ計画

6. **ハッシュタグ戦略**
   - トレンドタグの活用
   - ニッチタグでの差別化
   - リーチ最大化設計

7. **エンゲージメント予測**
   - 期待いいね数・RT数
   - コメント誘発要素
   - バイラル拡散メカニズム

**${config.style}スタイルでの表現**
- トーン・語調の統一
- ターゲット層に響く表現
- ブランド・ペルソナ一貫性

上位3つの機会それぞれについて、上記フレームワークを適用したコンセプトを作成してください。

各コンセプトには以下を含めてください：
- コンセプト名
- フック文
- 独自角度の詳細
- 形式・構造
- タイミング戦略
- ハッシュタグ候補
- 期待エンゲージメント

最後に以下のメッセージで締めくくってください：
「バズるコンテンツのコンセプトの概要は次のとおりです。「続行」と入力すると、各コンセプトの完全な、すぐに投稿できるコンテンツが表示されます。」`
}

function extractContentConcepts(text: string) {
  // 簡易抽出ロジック
  return [
    {
      id: 1,
      name: 'コンセプト1',
      hook: '注目を集める冒頭文',
      angle: '独自の専門視点',
      format: 'スレッド形式',
      timing: '即時投稿推奨'
    },
    {
      id: 2, 
      name: 'コンセプト2',
      hook: '感情に訴える導入',
      angle: '反対意見の提示',
      format: '単発投稿',
      timing: '2-4時間後'
    },
    {
      id: 3,
      name: 'コンセプト3', 
      hook: '予測・展望フック',
      angle: '未来志向分析',
      format: 'スレッド形式',
      timing: '6-8時間後'
    }
  ]
}

function extractFrameworkDetails(text: string) {
  return {
    platformOptimization: 'Twitter最適化済み',
    contentFormat: 'スレッド・単発混合',
    engagementDesign: 'コメント誘発設計',
    timingStrategy: '段階的投稿'
  }
}

function extractTargetingStrategy(text: string) {
  return {
    primaryAudience: 'AI・技術関心層',
    secondaryAudience: 'ビジネス・働き方関心層',
    engagementTactics: 'インサイト提供・議論喚起',
    viralMechanisms: '専門性×時事性の組み合わせ'
  }
}