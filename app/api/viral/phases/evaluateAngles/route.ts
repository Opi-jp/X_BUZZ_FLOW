import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId } = body
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionIdが必要です' },
        { status: 400 }
      )
    }
    
    console.log('=== Phase 3A: バズ角度の抽出 ===')
    console.log('Session ID:', sessionId)
    
    // セッション情報を取得
    let session = null
    let config = { theme: 'AIと働き方', platform: 'X', tone: '解説とエンタメ' }
    let trendingTopics = []
    
    try {
      session = await prisma.gptAnalysis.findUnique({
        where: { id: sessionId }
      })
      
      if (session) {
        const response = session.response as any
        const metadata = session.metadata as any
        
        if (metadata?.config) config = metadata.config
        if (response?.phase2?.trendingTopics) trendingTopics = response.phase2.trendingTopics
      }
    } catch (dbError) {
      console.warn('Database error, using mock data:', dbError.message)
      // モックデータ
      trendingTopics = [
        {
          topic: 'AI技術革新',
          summary: '最新のAI技術動向',
          emotion: 'anticipation',
          buzzPotential: 0.85
        }
      ]
    }
    
    if (trendingTopics.length === 0) {
      return NextResponse.json(
        { error: 'Phase 2のトレンドトピック抽出を先に完了してください' },
        { status: 400 }
      )
    }
    
    const startTime = Date.now()
    
    // Phase 3A用のプロンプト（角度抽出）
    const anglePrompt = buildAngleEvaluationPrompt(config, trendingTopics)
    
    console.log('Evaluating buzz angles for topics...')
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `あなたはバズコンテンツ戦略家です。与えられたトピックに対して、バズを引き起こす可能性のある独自の視点（角度）を抽出してください。

専門分野: ${config.theme}
プラットフォーム: ${config.platform}
スタイル: ${config.tone}

重要: 必ずJSON形式で出力してください。`
        },
        {
          role: 'user',
          content: anglePrompt
        }
      ],
      temperature: 0.8,
      max_tokens: 3000
    })
    
    const duration = Date.now() - startTime
    const responseText = completion.choices[0].message.content || ''
    
    // レスポンスを解析してJSON形式で抽出
    let topicsWithAngles = []
    
    try {
      // JSONブロックを抽出
      let jsonText = responseText
      if (jsonText.includes('```')) {
        const match = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
        if (match) {
          jsonText = match[1]
        }
      }
      
      topicsWithAngles = JSON.parse(jsonText)
      
      // 配列でない場合は配列化
      if (!Array.isArray(topicsWithAngles)) {
        topicsWithAngles = [topicsWithAngles]
      }
      
      console.log('Successfully extracted angles for topics:', topicsWithAngles.length)
      
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      
      // フォールバック: 構造化されたデータを生成
      topicsWithAngles = generateFallbackAngles(trendingTopics, config)
    }
    
    // 結果を構造化
    const phase3aResults = {
      topicsWithAngles,
      config,
      totalTopics: topicsWithAngles.length,
      totalAngles: topicsWithAngles.reduce((sum: number, topic: any) => sum + (topic.angles?.length || 0), 0),
      evaluatedAt: new Date().toISOString(),
      summary: `${topicsWithAngles.length}件のトピックに対して角度を抽出完了`
    }
    
    // Phase 3A結果を保存
    if (session) {
      try {
        const currentResponse = session.response as any || {}
        await prisma.gptAnalysis.update({
          where: { id: sessionId },
          data: {
            response: {
              ...currentResponse,
              phase3a: phase3aResults
            },
            status: 'phase3a_completed',
            tokens: (session.tokens || 0) + (completion.usage?.total_tokens || 0),
            duration: (session.duration || 0) + duration,
            metadata: {
              ...(session.metadata as any || {}),
              currentPhase: '3a',
              phase3aCompletedAt: new Date().toISOString()
            }
          }
        })
      } catch (dbError) {
        console.warn('Failed to save Phase 3A results:', dbError.message)
      }
    }
    
    return NextResponse.json({
      success: true,
      sessionId,
      phase: '3a',
      title: 'バズ角度の抽出',
      results: {
        topicsWithAngles,
        totalTopics: topicsWithAngles.length,
        totalAngles: phase3aResults.totalAngles,
        config
      },
      metrics: {
        duration,
        tokens: completion.usage?.total_tokens
      },
      nextPhase: {
        phase: '3b',
        url: `/api/viral/phases/generatePostConcept`,
        title: '投稿コンセプト生成',
        description: '選択した角度から具体的な投稿コンセプトを生成します'
      }
    })
    
  } catch (error) {
    console.error('Phase 3A evaluateAngles error:', error)
    
    return NextResponse.json(
      { 
        error: 'Phase 3A 角度抽出でエラーが発生しました',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

function buildAngleEvaluationPrompt(config: any, trendingTopics: any[]) {
  return `以下のトピックに対して、バズを引き起こす可能性のある視点（角度）を2つずつ考えてください。

専門分野: ${config.theme}
プラットフォーム: ${config.platform}
スタイル: ${config.tone}

トピック一覧:
${trendingTopics.map((topic, i) => `${i + 1}. ${topic.topic}
   概要: ${topic.summary}
   感情: ${topic.emotion}
   バズポテンシャル: ${topic.buzzPotential}`).join('\n\n')}

各角度に以下を含めてください：
- 視点の説明（何が独自性か）
- 想定される感情反応
- エンゲージメント促進要素
- ${config.theme}専門性の活かし方

形式：JSON配列
[
  {
    "topic": "トピック名",
    "originalSummary": "元の要約",
    "buzzPotential": 0.85,
    "angles": [
      {
        "angle": "視点・角度の名前",
        "description": "この角度の詳細説明",
        "why": "なぜこの角度が独自で効果的か",
        "emotion": "予想される感情反応（surprise/joy/fear/anger等）",
        "engagementFactor": "エンゲージメント促進要素",
        "expertiseValue": "${config.theme}の専門性をどう活かすか",
        "viralScore": 0.8
      },
      {
        "angle": "第2の角度",
        "description": "異なる視点の詳細",
        "why": "独自性の理由",
        "emotion": "感情反応",
        "engagementFactor": "エンゲージメント要素",
        "expertiseValue": "専門性活用法",
        "viralScore": 0.75
      }
    ]
  }
]

重要なポイント：
- ${config.theme}の専門性を活かした独自視点
- ${config.platform}で拡散しやすい角度
- ${config.tone}に適した表現アプローチ
- 論争性・感情喚起・共感性のバランス`
}

function generateFallbackAngles(trendingTopics: any[], config: any) {
  return trendingTopics.map((topic, index) => ({
    topic: topic.topic,
    originalSummary: topic.summary,
    buzzPotential: topic.buzzPotential || 0.75,
    angles: [
      {
        angle: "専門家の内部視点",
        description: `${config.theme}の専門家として業界の裏側から解説`,
        why: "一般には見えない専門的な視点を提供",
        emotion: "surprise",
        engagementFactor: "専門的洞察への好奇心",
        expertiseValue: `${config.theme}の実務経験を活かした解説`,
        viralScore: 0.8
      },
      {
        angle: "反対意見・異論提起",
        description: "一般的な見解に対する建設的な異論",
        why: "議論を促進し、多角的思考を誘発",
        emotion: "anticipation",
        engagementFactor: "議論・コメント誘発",
        expertiseValue: "専門知識に基づいた根拠ある異論",
        viralScore: 0.75
      }
    ]
  }))
}