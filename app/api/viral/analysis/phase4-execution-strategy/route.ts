import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      conceptIds,
      autoSchedule = false,
      platform = 'Twitter'
    } = body

    if (!conceptIds || !Array.isArray(conceptIds)) {
      return NextResponse.json(
        { error: 'コンセプトIDが指定されていません' },
        { status: 400 }
      )
    }

    // Phase 3の結果を取得
    const concepts = await prisma.viralPost.findMany({
      where: { 
        id: { in: conceptIds },
        conceptType: { startsWith: 'phase3_concept_' }
      },
      include: {
        opportunity: true
      }
    })

    if (concepts.length === 0) {
      return NextResponse.json(
        { error: 'Phase 3で生成されたコンセプトが見つかりません' },
        { status: 404 }
      )
    }

    // 実行戦略の生成
    const prompt = buildPhase4Prompt(concepts)
    
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
        max_tokens: 3000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.4
      })
    })

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`)
    }

    const data = await response.json()
    const duration = Date.now() - startTime
    const strategy = JSON.parse(data.content[0].text)

    // 分析ログを保存
    await prisma.viralAnalysisLog.create({
      data: {
        model: 'claude',
        phase: 'phase4_execution_strategy',
        prompt,
        response: strategy,
        duration,
        success: true
      }
    })

    // 実行戦略を各コンセプトに適用
    const executionPlans = await Promise.all(
      strategy.executionPlans.map(async (plan: any) => {
        const concept = concepts.find(c => c.id === plan.conceptId)
        if (!concept) return null

        // コンセプトを更新（実行戦略を追加）
        const updatedConcept = await prisma.viralPost.update({
          where: { id: concept.id },
          data: {
            metadata: {
              ...((concept.metadata as any) || {}),
              executionStrategy: plan.strategy,
              timeline: plan.timeline,
              kpiTargets: plan.kpiTargets,
              riskAssessment: plan.riskAssessment,
              followupSequence: plan.followupSequence
            },
            scheduledAt: autoSchedule ? new Date(plan.strategy.optimalPostTime) : concept.scheduledAt
          }
        })

        // 実行タスクを作成
        await Promise.all(
          plan.timeline.tasks.map(async (task: any) => {
            return await prisma.scheduledPost.create({
              data: {
                content: task.content,
                scheduledTime: new Date(task.scheduledAt),
                postType: 'NEW',
                status: autoSchedule ? 'SCHEDULED' : 'DRAFT',
                aiGenerated: true,
                aiPrompt: `Viral Phase 4 - ${task.type}`,
                postResult: {
                  viralPostId: concept.id,
                  taskType: task.type,
                  sequence: task.sequence,
                  dependencies: task.dependencies,
                  platform
                }
              }
            })
          })
        )

        return {
          concept: updatedConcept,
          executionPlan: plan
        }
      })
    )

    // 全体統計の更新
    const validPlans = executionPlans.filter(p => p !== null)
    
    // 機会のステータスを最終更新
    const opportunityIds = [...new Set(concepts.map(c => c.opportunityId))]
    await prisma.viralOpportunity.updateMany({
      where: { id: { in: opportunityIds } },
      data: { 
        status: autoSchedule ? 'scheduled' : 'ready_to_execute'
      }
    })

    return NextResponse.json({
      success: true,
      phase: 4,
      analysis: {
        conceptsProcessed: concepts.length,
        executionPlansGenerated: validPlans.length,
        totalTasks: validPlans.reduce((sum, p) => sum + (p?.executionPlan.timeline.tasks.length || 0), 0),
        autoScheduled: autoSchedule,
        duration
      },
      strategy: {
        overview: strategy.overview,
        globalTiming: strategy.globalTiming,
        crossPlatformStrategy: strategy.crossPlatformStrategy,
        riskManagement: strategy.riskManagement
      },
      executionPlans: validPlans
    })

  } catch (error) {
    console.error('Phase 4 execution strategy error:', error)
    
    await prisma.viralAnalysisLog.create({
      data: {
        model: 'claude',
        phase: 'phase4_execution_strategy',
        prompt: '',
        response: {},
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    })

    return NextResponse.json(
      { error: 'Phase 4 実行戦略生成でエラーが発生しました' },
      { status: 500 }
    )
  }
}

function buildPhase4Prompt(concepts: any[]) {
  return `
# Phase 4: 戦略的実行プラン生成

## 現在の状況
現在時刻: ${new Date().toLocaleString('ja-JP')}
プラットフォーム: Twitter
アカウント特性: 50代クリエイティブディレクター（フォロワー数: 成長期）

## 実行対象コンセプト
${concepts.map((concept, i) => {
  const metadata = concept.metadata as any
  const opportunity = concept.opportunity
  
  return `
### コンセプト${i + 1} (ID: ${concept.id})
**トピック**: ${opportunity?.topic}
**コンテンツ**: ${concept.content}
**投稿タイプ**: ${concept.postType}
**予定時間**: ${concept.scheduledAt}
**バイラルスコア**: ${opportunity?.viralScore}
**タイムウィンドウ**: ${opportunity?.timeWindow}時間

**戦略詳細**:
- エンゲージメント戦略: ${metadata?.engagementStrategy ? JSON.stringify(metadata.engagementStrategy) : 'なし'}
- ターゲット層: ${metadata?.audienceTargeting ? JSON.stringify(metadata.audienceTargeting) : 'なし'}
- 差別化ポイント: ${metadata?.competitiveDifferentiation || 'なし'}
- フォローアップ計画: ${metadata?.followupStrategy || 'なし'}
`}).join('\n')}

## タスク
上記コンセプトに対して、包括的な実行戦略を立案してください。

考慮すべき要素:
1. **最適タイミング**: 各コンセプトの最適投稿時間
2. **順序戦略**: 複数コンセプトの投稿順序と間隔
3. **エンゲージメント最大化**: リアルタイム対応戦略
4. **リスク管理**: 炎上・批判への対応計画
5. **拡散最大化**: インフルエンサー・メディア連携
6. **フォローアップ**: 2nd、3rd投稿の戦略的設計
7. **KPIモニタリング**: 成果測定と調整計画

以下の形式でJSONレスポンスを返してください:

{
  "overview": {
    "strategyTheme": "全体戦略テーマ",
    "executionWindow": "実行期間（XX日間）",
    "priorityOrder": ["コンセプトID順序"],
    "successFactors": ["成功要因1", "要因2", "要因3"]
  },
  "globalTiming": {
    "peakHours": ["最適投稿時間帯"],
    "avoidHours": ["避けるべき時間帯"],
    "intervalStrategy": "投稿間隔戦略",
    "weeklyPattern": "週間パターン"
  },
  "executionPlans": [
    {
      "conceptId": "対象コンセプトID",
      "strategy": {
        "optimalPostTime": "YYYY-MM-DD HH:MM:SS",
        "prePostActions": ["投稿前アクション"],
        "postPostActions": ["投稿後アクション"],
        "engagementTactics": ["エンゲージメント戦術"]
      },
      "timeline": {
        "tasks": [
          {
            "type": "main_post|follow_up|engagement|monitoring",
            "content": "投稿内容またはタスク内容",
            "scheduledAt": "YYYY-MM-DD HH:MM:SS",
            "sequence": 数値,
            "dependencies": ["依存タスク"],
            "kpiTarget": "目標KPI"
          }
        ]
      },
      "kpiTargets": {
        "likes": "目標いいね数",
        "retweets": "目標RT数",
        "replies": "目標リプ数",
        "impressions": "目標インプレッション",
        "engagementRate": "目標エンゲージメント率"
      },
      "riskAssessment": {
        "riskLevel": "low|medium|high",
        "potentialIssues": ["想定リスク"],
        "mitigationPlan": ["対策"],
        "escalationPlan": "エスカレーションプラン"
      },
      "followupSequence": [
        {
          "timing": "投稿後XX時間",
          "content": "フォローアップ内容",
          "condition": "実行条件"
        }
      ]
    }
  ],
  "crossPlatformStrategy": {
    "twitterOptimization": "Twitter特化戦略",
    "futureExpansion": "他プラットフォーム展開計画"
  },
  "riskManagement": {
    "monitoringPlan": "モニタリング計画",
    "crisisResponse": "クライシス対応",
    "qualityControl": "品質管理"
  }
}

## 重要な考慮事項
- 50代クリエイターの信頼性を損なわない戦略
- 継続的な関係構築を重視
- 短期的バズより長期的影響力を優先
- エンゲージメントの質を重視
- フォロワーの段階的成長戦略
- ブランドイメージの一貫性維持
`
}