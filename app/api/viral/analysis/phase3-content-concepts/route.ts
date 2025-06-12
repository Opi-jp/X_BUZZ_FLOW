import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      trendIds,
      conceptsPerTrend = 3,
      platform = 'Twitter'
    } = body

    if (!trendIds || !Array.isArray(trendIds)) {
      return NextResponse.json(
        { error: 'トレンドIDが指定されていません' },
        { status: 400 }
      )
    }

    // Phase 2の結果を取得
    const trends = await prisma.viralOpportunity.findMany({
      where: { 
        id: { in: trendIds },
        status: 'evaluated'
      }
    })

    if (trends.length === 0) {
      return NextResponse.json(
        { error: 'Phase 2で評価済みのトレンドが見つかりません' },
        { status: 404 }
      )
    }

    // 各トレンドに対してコンテンツコンセプトを生成
    const allConcepts = await Promise.all(
      trends.map(async (trend) => {
        const prompt = buildPhase3Prompt(trend, conceptsPerTrend)
        
        // Claude API呼び出し
        const startTime = Date.now()
        const response = await fetch(CLAUDE_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.CLAUDE_API_KEY!,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-3-opus-20240229',
            max_tokens: 4000,
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.8
          })
        })

        if (!response.ok) {
          throw new Error(`Claude API error: ${response.status}`)
        }

        const data = await response.json()
        const duration = Date.now() - startTime
        const concepts = JSON.parse(data.content[0].text)

        // 分析ログを保存
        await prisma.viralAnalysisLog.create({
          data: {
            model: 'claude',
            phase: 'phase3_content_concepts',
            prompt,
            response: concepts,
            duration,
            success: true
          }
        })

        // コンセプトをDBに保存
        const savedConcepts = await Promise.all(
          concepts.concepts.map(async (concept: any, index: number) => {
            return await prisma.viralPost.create({
              data: {
                opportunityId: trend.id,
                conceptType: `phase3_concept_${index + 1}`,
                content: concept.content || concept.hook,
                threadContent: concept.threadContent || null,
                visualGuide: concept.visualGuide,
                hashtags: concept.hashtags,
                postType: concept.postType,
                platform,
                metadata: {
                  title: concept.title,
                  hook: concept.hook,
                  emotionalTone: concept.emotionalTone,
                  engagementStrategy: concept.engagementStrategy,
                  contentPillars: concept.contentPillars,
                  audienceTargeting: concept.audienceTargeting,
                  competitiveDifferentiation: concept.competitiveDifferentiation,
                  viralMechanics: concept.viralMechanics,
                  followupStrategy: concept.followupStrategy
                },
                scheduledAt: calculateOptimalPostTime(concept.timing, trend.timeWindow)
              }
            })
          })
        )

        // トレンドのステータスを更新
        await prisma.viralOpportunity.update({
          where: { id: trend.id },
          data: { status: 'conceptualized' }
        })

        return {
          trend,
          concepts: savedConcepts,
          analysis: concepts.analysis
        }
      })
    )

    return NextResponse.json({
      success: true,
      phase: 3,
      analysis: {
        trendsProcessed: trends.length,
        conceptsGenerated: allConcepts.reduce((sum, t) => sum + t.concepts.length, 0),
        totalDuration: allConcepts.reduce((sum, t) => sum + (t.analysis?.duration || 0), 0)
      },
      results: allConcepts
    })

  } catch (error) {
    console.error('Phase 3 content concepts error:', error)
    
    await prisma.viralAnalysisLog.create({
      data: {
        model: 'claude',
        phase: 'phase3_content_concepts',
        prompt: '',
        response: {},
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    })

    return NextResponse.json(
      { error: 'Phase 3 コンテンツコンセプト生成でエラーが発生しました' },
      { status: 500 }
    )
  }
}

function buildPhase3Prompt(trend: any, conceptsPerTrend: number) {
  const sourceData = trend.sourceData as any
  
  return `
# Phase 3: 戦略的コンテンツコンセプト生成

## あなたのペルソナ
- 50代のクリエイティブディレクター
- 23年間の映像制作経験（NAKED設立者）
- 1998年のCG革命を経験、現在のAI革命と比較可能
- プロジェクションマッピングで有名
- 効率化に逆らう「非効率の美学」を語る
- 若者優位の風潮に対して経験者の価値を主張
- ユーモアとエモーションを大切にする

## トレンド情報
**トピック**: ${trend.topic}
**独自切り口**: ${trend.angle}
**キーワード**: ${trend.keywords.join(', ')}
**バイラルスコア**: ${trend.viralScore}
**投稿推奨時間**: ${trend.timeWindow}時間以内

### 評価スコア詳細
${sourceData.scores ? `
- 論争レベル: ${sourceData.scores.controversy}/1.0
- 感情の強さ: ${sourceData.scores.emotion}/1.0
- 共感性要因: ${sourceData.scores.relatability}/1.0
- 共有可能性: ${sourceData.scores.shareability}/1.0
- タイミング敏感性: ${sourceData.scores.timing}/1.0
` : ''}

### 関連ソース
**関連ニュース**:
${sourceData.relatedNews ? sourceData.relatedNews.map((news: string, i: number) => `${i + 1}. ${news}`).join('\n') : 'なし'}

**関連投稿**:
${sourceData.relatedPosts ? sourceData.relatedPosts.map((post: string, i: number) => `${i + 1}. ${post}`).join('\n') : 'なし'}

**競合分析**: ${sourceData.competitorAnalysis || 'なし'}

**エンゲージメント予測**: ${JSON.stringify(sourceData.engagementPrediction || {})}

## タスク
上記トレンドに対して、${conceptsPerTrend}つの異なる戦略的コンテンツコンセプトを作成してください。

各コンセプトは以下の要素を含むこと:
1. 明確な差別化戦略
2. エンゲージメント最大化設計
3. 50代クリエイターの独自視点
4. バイラル拡散メカニズム

以下の形式でJSONレスポンスを返してください:

{
  "analysis": {
    "trendStrength": "トレンドの強さ評価",
    "opportunityWindow": "機会のウィンドウ分析",
    "competitiveContext": "競合コンテキスト分析"
  },
  "concepts": [
    {
      "title": "コンセプトタイトル",
      "postType": "single|thread|carousel",
      "content": "メイン投稿内容（140文字以内）",
      "threadContent": ["スレッド投稿1", "スレッド投稿2", ...] // threadの場合のみ,
      "hook": "最初の一文（注意を引く要素）",
      "emotionalTone": "感情的トーン（例：ノスタルジー→共感→洞察）",
      "contentPillars": ["コンテンツの柱1", "柱2", "柱3"],
      "hashtags": ["ハッシュタグ1", "ハッシュタグ2"],
      "timing": "morning|lunch|evening|night",
      "visualGuide": "ビジュアル作成の詳細ガイド",
      "engagementStrategy": {
        "primary": "主要エンゲージメント戦略",
        "secondary": "補助戦略",
        "callToAction": "具体的なCTA"
      },
      "audienceTargeting": {
        "primary": "主要ターゲット",
        "secondary": "副次ターゲット",
        "psychographics": "心理的属性"
      },
      "competitiveDifferentiation": "競合との差別化ポイント",
      "viralMechanics": {
        "triggerEmotion": "誘発する感情",
        "shareMotivation": "シェア動機",
        "discoverability": "発見可能性の仕掛け"
      },
      "followupStrategy": "フォローアップ戦略（2nd, 3rd投稿計画）",
      "riskMitigation": "リスク軽減策"
    }
  ]
}

## 重要な制約
- 必ず日本語で作成
- Twitter文字数制限を厳守（140文字）
- 上から目線を避け、共感と問いかけを重視
- 50代の経験を押し付けず、価値として提示
- 絵文字は効果的な箇所でのみ使用
- 炎上リスクを考慮した表現
- エンゲージメント最大化を常に意識
`
}

function calculateOptimalPostTime(timing: string, timeWindow: number): Date {
  const now = new Date()
  const hours = now.getHours()
  
  const timingMap: { [key: string]: number[] } = {
    morning: [7, 8, 9],
    lunch: [12, 13],
    evening: [18, 19, 20],
    night: [21, 22, 23]
  }
  
  const targetHours = timingMap[timing] || [21]
  let targetHour = targetHours[0]
  
  // 現在時刻より後の最も近い時間を選択
  for (const hour of targetHours) {
    if (hour > hours) {
      targetHour = hour
      break
    }
  }
  
  // timeWindowを考慮
  const maxDelay = Math.min(timeWindow, 24) // 最大24時間
  if (targetHour <= hours && maxDelay > 24 - hours) {
    now.setDate(now.getDate() + 1)
  }
  
  now.setHours(targetHour, 0, 0, 0)
  return now
}