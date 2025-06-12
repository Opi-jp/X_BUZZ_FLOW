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
    
    const headers = {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }

    // セッション情報を取得（エラー時はモックデータを使用）
    let session = null
    let config = {
      config: {
        expertise: 'AI × 働き方',
        platform: 'Twitter',
        style: '解説 × エンタメ',
        model: 'gpt-4o'
      }
    }
    
    try {
      session = await prisma.gptAnalysis.findUnique({
        where: { id: sessionId }
      })
      
      if (session) {
        config = session.metadata as any
      }
    } catch (dbError) {
      console.warn('Database connection error, using mock config:', dbError.message)
    }
    
    console.log('=== Chain of Thought: Hybrid Implementation ===')
    console.log('Session ID:', sessionId)
    console.log('Config:', config.config)
    console.log('Phase 1: Web Search with Responses API')
    console.log('Phase 2-4: Function Calling with Chat Completions API')

    const overallStartTime = Date.now()
    const phaseResults: any = {}

    // ===============================
    // Phase 1: Web検索でトレンド収集（Responses API）
    // ===============================
    console.log('\n🔍 Phase 1: Web Search for Real-time Trends')
    const phase1Start = Date.now()
    
    const searchPrompt = buildWebSearchPrompt(config.config)
    
    const searchResponse = await openai.responses.create({
      model: 'gpt-4o',
      input: searchPrompt,
      tools: [
        { type: 'web_search' as any }
      ],
      instructions: `
現在の日時: ${new Date().toLocaleDateString('ja-JP')}

web_searchツールを使用して、以下の検索を実行してください：
1. "${config.config.expertise} 最新ニュース ${new Date().toLocaleDateString('ja-JP')}"
2. "${config.config.expertise} トレンド 話題"
3. "${config.config.expertise} 論争 議論"
4. "AI 働き方 変革 最新"

各検索結果から、48時間以内にバズる可能性が高い機会を特定し、以下の形式で整理してください：

**発見したバズ機会:**
1. [トピック名]
   - ソースURL: [URL]
   - 概要: [簡潔な説明]
   - バズ要因: [なぜバズるか]

2. [トピック名]
   - ソースURL: [URL]
   - 概要: [簡潔な説明]
   - バズ要因: [なぜバズるか]

最低5個のバズ機会を特定してください。理想的には5-7個を目指してください。
      ` as any
    })

    const phase1Duration = Date.now() - phase1Start
    console.log(`Phase 1 completed in ${phase1Duration}ms`)
    
    // Web検索結果をパース
    const webSearchResult = searchResponse.output_text || ''
    console.log('\n--- Web Search Raw Result ---')
    console.log(webSearchResult.substring(0, 1000))
    console.log('--- End of sample ---\n')
    
    const opportunities = parseWebSearchResults(webSearchResult)
    console.log(`Parsed opportunities: ${opportunities.length}`)
    opportunities.forEach((opp, i) => {
      console.log(`${i + 1}. ${opp.topic}`)
      console.log(`   URL: ${opp.url}`)
      console.log(`   Has valid URL: ${opp.url && opp.url.startsWith('http')}`)
    })
    
    phaseResults.phase1 = {
      rawOutput: webSearchResult.substring(0, 500) + '...', // 長すぎるので最初の500文字のみ
      opportunities: opportunities,
      duration: phase1Duration,
      toolCalls: searchResponse.tool_calls?.length || 0,
      // デバッグ用：最初の2つの機会の詳細を追加
      sampleOpportunities: opportunities.slice(0, 2).map(opp => ({
        topic: opp.topic,
        url: opp.url,
        hasRealUrl: opp.url && opp.url.startsWith('http')
      }))
    }

    // ===============================
    // Phase 2: トレンド詳細分析（Function Calling）
    // ===============================
    console.log('\n📊 Phase 2: Trend Analysis with Function Calling')
    const phase2Start = Date.now()

    const trendAnalysisFunction = {
      name: 'analyze_viral_trends',
      description: 'バイラル機会を詳細に分析',
      parameters: {
        type: 'object',
        properties: {
          opportunities: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                topic: { type: 'string' },
                controversy_level: { type: 'number' },
                emotion_intensity: { type: 'number' },
                relatability_factor: { type: 'number' },
                shareability: { type: 'number' },
                timing_sensitivity: { type: 'number' },
                platform_alignment: { type: 'number' },
                viral_velocity: { type: 'string' },
                content_angle: { type: 'string' },
                target_emotion: { type: 'string' },
                engagement_prediction: { type: 'number' }
              },
              required: ['topic', 'controversy_level', 'emotion_intensity', 'relatability_factor', 'shareability', 'timing_sensitivity', 'platform_alignment', 'viral_velocity', 'content_angle', 'target_emotion', 'engagement_prediction']
            }
          },
          best_opportunity: { type: 'string' },
          recommended_timeline: { type: 'string' }
        },
        required: ['opportunities', 'best_opportunity', 'recommended_timeline']
      }
    }

    const phase2Response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `あなたは、新たなトレンドを特定し、流行の波がピークに達する前にその波に乗るコンテンツのコンセプトを作成するバズるコンテンツ戦略家です。`
        },
        {
          role: 'user',
          content: `以下のWeb検索で発見したバズ機会を6軸で詳細分析してください。

発見した機会:
${opportunities.map((opp: any, i: number) => `${i + 1}. ${opp.topic}\n   - ${opp.description}\n   - ソース: ${opp.url}`).join('\n\n')}

各機会を以下の軸で0-1スケールで評価し、analyze_viral_trends関数を呼び出してください：
- 論争レベル（強い意見を生み出すか）
- 感情の強さ（怒り、喜び、驚き、憤慨の度合い）
- 共感性要因（多くの人に影響を与えるか）
- 共有可能性（人々が広めたいと思うか）
- タイミング敏感性（関連性のウィンドウの狭さ）
- プラットフォーム適合性（${config.config.platform}文化への適合度）`
        }
      ],
      functions: [trendAnalysisFunction],
      function_call: { name: 'analyze_viral_trends' },
      temperature: 0.7,
      max_tokens: 1500
    })

    const phase2Duration = Date.now() - phase2Start
    console.log(`Phase 2 completed in ${phase2Duration}ms`)

    let phase2Analysis = null
    if (phase2Response.choices[0]?.message?.function_call) {
      phase2Analysis = JSON.parse(phase2Response.choices[0].message.function_call.arguments)
    }

    phaseResults.phase2 = {
      analysis: phase2Analysis,
      duration: phase2Duration
    }

    // ===============================
    // Phase 3: コンセプト生成（Function Calling）
    // ===============================
    console.log('\n💡 Phase 3: Content Concept Creation')
    const phase3Start = Date.now()

    const contentConceptFunction = {
      name: 'create_content_concepts',
      description: 'バイラルコンテンツのコンセプトを生成',
      parameters: {
        type: 'object',
        properties: {
          concepts: {
            type: 'array',
            maxItems: 3,
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                hook: { type: 'string' },
                angle: { type: 'string' },
                format: { type: 'string' },
                content_outline: {
                  type: 'object',
                  properties: {
                    opening_hook: { type: 'string' },
                    key_points: { type: 'array', items: { type: 'string' } },
                    unexpected_insight: { type: 'string' },
                    cta: { type: 'string' }
                  }
                },
                hashtags: { type: 'array', items: { type: 'string' } },
                confidence_score: { type: 'number' }
              },
              required: ['title', 'hook', 'angle', 'format', 'content_outline', 'hashtags', 'confidence_score']
            }
          },
          recommended_concept: { type: 'string' }
        },
        required: ['concepts', 'recommended_concept']
      }
    }

    const bestOpportunity = phase2Analysis?.best_opportunity || opportunities[0]?.topic || 'AIと働き方の変革'

    const phase3Response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `あなたは、新たなトレンドを特定し、流行の波がピークに達する前にその波に乗るコンテンツのコンセプトを作成するバズるコンテンツ戦略家です。`
        },
        {
          role: 'user',
          content: `最高のバズ機会「${bestOpportunity}」について、${config.config.platform}で${config.config.style}スタイルの投稿コンセプトを3つ作成してください。

専門分野「${config.config.expertise}」の視点を活かし、create_content_concepts関数を呼び出してください。

要件：
- ${config.config.platform}に最適化された形式
- 48時間以内にバズる可能性が高いコンテンツ
- エンゲージメントを最大化するフック`
        }
      ],
      functions: [contentConceptFunction],
      function_call: { name: 'create_content_concepts' },
      temperature: 0.8,
      max_tokens: 3000
    })

    const phase3Duration = Date.now() - phase3Start
    console.log(`Phase 3 completed in ${phase3Duration}ms`)

    let phase3Concepts = null
    if (phase3Response.choices[0]?.message?.function_call) {
      phase3Concepts = JSON.parse(phase3Response.choices[0].message.function_call.arguments)
    }

    phaseResults.phase3 = {
      concepts: phase3Concepts,
      duration: phase3Duration
    }

    // ===============================
    // Phase 4: 完全なコンテンツ生成（JSON Mode）
    // ===============================
    console.log('\n✨ Phase 4: Complete Content Generation')
    const phase4Start = Date.now()

    const bestConcept = phase3Concepts?.concepts?.[0] || { title: 'AIが変える働き方', hook: 'AIの進化で消える仕事、生まれる仕事' }

    const phase4Response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `あなたは、新たなトレンドを特定し、流行の波がピークに達する前にその波に乗るコンテンツのコンセプトを作成するバズるコンテンツ戦略家です。`
        },
        {
          role: 'user',
          content: `コンセプト「${bestConcept.title}」から、${config.config.platform}用の完全な投稿コンテンツを作成してください。

フック: ${bestConcept.hook}
角度: ${bestConcept.angle || config.config.expertise + 'の視点'}

JSON形式で以下を含めて回答：
{
  "complete_posts": [
    {
      "platform": "${config.config.platform}",
      "format": "${bestConcept.format || 'single'}",
      "content": "コピー&ペースト可能な完全な投稿テキスト（改行・絵文字含む）",
      "visual_description": "推奨ビジュアル説明",
      "hashtags": ["#タグ1", "#タグ2", "#タグ3"],
      "optimal_timing": "最適投稿時間",
      "posting_notes": "投稿時の注意点"
    }
  ],
  "execution_strategy": {
    "immediate_actions": ["今すぐやること1", "今すぐやること2"],
    "posting_timeline": "2-4時間以内",
    "optimization_tips": ["最適化のコツ1", "最適化のコツ2"],
    "risk_mitigation": ["リスク対策1", "リスク対策2"]
  }
}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
      max_tokens: 1500
    })

    const phase4Duration = Date.now() - phase4Start
    console.log(`Phase 4 completed in ${phase4Duration}ms`)

    const phase4Content = JSON.parse(phase4Response.choices[0].message.content || '{}')

    phaseResults.phase4 = {
      content: phase4Content,
      duration: phase4Duration
    }

    // ===============================
    // 結果の統合と保存
    // ===============================
    const totalDuration = Date.now() - overallStartTime
    console.log(`\n✅ Total Chain of Thought completed in ${totalDuration}ms`)

    const chainResult = {
      method: 'Hybrid Chain of Thought',
      phases: phaseResults,
      summary: {
        webSearchResults: opportunities.length,
        bestOpportunity: bestOpportunity,
        conceptsGenerated: phase3Concepts?.concepts?.length || 0,
        finalContent: phase4Content.complete_posts?.[0]?.content || '',
        readyToPost: !!phase4Content.complete_posts?.[0]?.content
      }
    }

    // データベースに保存（エラー時はスキップ）
    if (session) {
      try {
        await prisma.gptAnalysis.update({
          where: { id: sessionId },
          data: {
            response: {
              ...(session.response as any || {}),
              chainHybrid: chainResult
            },
            tokens: (session.tokens || 0) + 5000, // 概算
            duration: (session.duration || 0) + totalDuration,
            metadata: {
              ...(session.metadata as any || {}),
              currentStep: 'chain-hybrid-complete',
              chainHybridCompletedAt: new Date().toISOString(),
              usedChainHybrid: true
            }
          }
        })
      } catch (dbError) {
        console.warn('Failed to save Chain Hybrid results:', dbError.message)
      }
    }

    // 下書き保存
    let draftsCreated = 0
    if (phase4Content.complete_posts?.length > 0) {
      try {
        await Promise.all(
          phase4Content.complete_posts.map(async (post: any, index: number) => {
            await prisma.contentDraft.create({
              data: {
                analysisId: sessionId,
                conceptType: post.format || 'single',
                category: bestOpportunity,
                title: bestConcept.title,
                content: post.content,
                explanation: post.posting_notes || '',
                buzzFactors: ['トレンド性', 'タイミング', '専門性'],
                targetAudience: '働き方に関心があるビジネスパーソン',
                estimatedEngagement: {
                  likes: '1000-5000',
                  retweets: '200-1000',
                  replies: '50-200'
                },
                hashtags: post.hashtags || [],
                metadata: {
                  conceptNumber: index + 1,
                  platform: post.platform,
                  format: post.format,
                  visualDescription: post.visual_description,
                  optimalTiming: post.optimal_timing,
                  executionStrategy: phase4Content.execution_strategy,
                  chainHybridGenerated: true
                }
              }
            })
          })
        )
        draftsCreated = phase4Content.complete_posts.length
      } catch (dbError) {
        console.warn('Failed to save drafts:', dbError.message)
      }
    }

    return NextResponse.json({
      success: true,
      sessionId,
      method: 'Hybrid Chain of Thought (Web Search + Function Calling)',
      phases: {
        phase1: {
          method: 'Responses API + Web Search',
          trendsFound: opportunities.length,
          duration: `${phase1Duration}ms`
        },
        phase2: {
          method: 'Function Calling',
          bestOpportunity: phase2Analysis?.best_opportunity,
          duration: `${phase2Duration}ms`
        },
        phase3: {
          method: 'Function Calling',
          conceptsGenerated: phase3Concepts?.concepts?.length || 0,
          duration: `${phase3Duration}ms`
        },
        phase4: {
          method: 'JSON Mode',
          contentReady: !!phase4Content.complete_posts?.[0],
          duration: `${phase4Duration}ms`
        }
      },
      totalDuration: `${totalDuration}ms`,
      draftsCreated,
      readyToPost: {
        status: !!phase4Content.complete_posts?.[0]?.content,
        content: phase4Content.complete_posts?.[0]?.content || '',
        platform: config.config.platform,
        timing: phase4Content.complete_posts?.[0]?.optimal_timing || '2-4時間以内',
        hashtags: phase4Content.complete_posts?.[0]?.hashtags || []
      },
      executionStrategy: phase4Content.execution_strategy
    }, { headers })

  } catch (error) {
    console.error('Chain Hybrid error:', error)
    
    return NextResponse.json(
      { 
        error: 'Chain Hybrid 分析でエラーが発生しました',
        details: error.message
      },
      { status: 500 }
    )
  }
}

function buildWebSearchPrompt(config: any) {
  const currentDateJST = new Date().toLocaleDateString('ja-JP', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    timeZone: 'Asia/Tokyo'
  })

  return `**バイラルコンテンツ戦略家としての調査**

現在時刻: ${currentDateJST}
専門分野: ${config.expertise}
プラットフォーム: ${config.platform}
スタイル: ${config.style}

48時間以内にバズる可能性が高い「${config.expertise}」関連のトレンドを調査してください。

特に以下の観点で注目：
- 論争を呼ぶ可能性がある話題
- 強い感情（驚き、怒り、希望、不安）を引き起こす出来事
- 多くの人に影響を与える変化や発表
- タイミングが重要な速報性のある情報`
}

function parseWebSearchResults(text: string): any[] {
  const opportunities = []
  const lines = text.split('\n')
  
  let currentOpp: any = null
  
  for (const line of lines) {
    // トピック行を探す（数字で始まる行）
    const topicMatch = line.match(/^\d+\.\s*(.+)/)
    if (topicMatch) {
      if (currentOpp) {
        opportunities.push(currentOpp)
      }
      currentOpp = {
        topic: topicMatch[1].replace(/[\[\]]/g, ''),
        url: '',
        description: '',
        viralFactor: ''
      }
    }
    
    // URL行を探す
    if (currentOpp && line.includes('ソースURL:')) {
      const urlMatch = line.match(/https?:\/\/[^\s\)]+/)
      if (urlMatch) {
        currentOpp.url = urlMatch[0]
      }
    }
    
    // 概要行を探す
    if (currentOpp && line.includes('概要:')) {
      currentOpp.description = line.split('概要:')[1]?.trim() || ''
    }
    
    // バズ要因行を探す
    if (currentOpp && line.includes('バズ要因:')) {
      currentOpp.viralFactor = line.split('バズ要因:')[1]?.trim() || ''
    }
  }
  
  if (currentOpp) {
    opportunities.push(currentOpp)
  }
  
  return opportunities.filter(opp => opp.topic && opp.topic.length > 0)
}