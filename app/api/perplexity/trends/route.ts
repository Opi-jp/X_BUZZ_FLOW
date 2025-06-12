import { NextRequest, NextResponse } from 'next/server'

// Vercel Function Configuration
export const maxDuration = 30 // Perplexity API呼び出しで時間がかかる可能性

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      query = 'AI 最新トレンド 今日',
      focus = 'creative_ai_trends',
      newsContext = []
    } = body

    // Perplexity APIを使ってトレンド情報を取得
    const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [
          {
            role: 'system',
            content: `あなたは50代クリエイティブディレクターの視点で、AIとテクノロジートレンドを分析するアシスタントです。
            
            特に以下の観点で分析してください：
            1. 23年の映像制作・プロジェクションマッピング経験から見た独自視点
            2. 若者とは違う「経験者ならではの洞察」
            3. 効率化の逆を行く「非効率の価値」の視点
            4. 過去の技術変革（1990年代CG革命等）との類似点と相違点
            5. 50代のセカンドキャリアに与える影響
            
            回答は以下の形式で：
            - 今日の注目トレンド（3つ）
            - 各トレンドの独自解釈
            - 投稿すべき「逆張り視点」
            - RP（引用RT）すべきアカウントやツイートの種類
            
            重要：必ず最新の情報を反映し、今日・今週の出来事を中心に分析してください。`
          },
          {
            role: 'user',
            content: enhanceQueryWithNewsContext(query, newsContext)
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      })
    })

    if (!perplexityResponse.ok) {
      throw new Error(`Perplexity API error: ${perplexityResponse.status}`)
    }

    const perplexityData = await perplexityResponse.json()
    const analysis = perplexityData.choices[0]?.message?.content || 'トレンド分析を取得できませんでした'

    // 構造化されたデータに変換
    const insights = parsePerplexityAnalysis(analysis)

    // あなた独自の視点でさらに分析
    const personalInsights = await generatePersonalInsights(insights, focus)

    // バズ予測スコアを計算（ニュースコンテキストも考慮）
    const buzzPrediction = calculateBuzzPotential(insights, newsContext)

    // レポートをDBに保存（重複チェック付き）
    const { prisma } = await import('@/lib/prisma')
    
    // 1時間以内の同じfocusのレポートがあるか確認
    const existingReport = await prisma.perplexityReport.findFirst({
      where: {
        focus,
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) }
      }
    })

    let savedReport
    if (existingReport) {
      // 既存レポートを更新
      savedReport = await prisma.perplexityReport.update({
        where: { id: existingReport.id },
        data: {
          query,
          rawAnalysis: analysis,
          trends: insights.trends || [],
          insights: insights.insights || [],
          personalAngles: personalInsights,
          buzzPrediction,
          recommendations: {
            immediateAction: generateImmediateActions(insights),
            rpTargets: generateRPTargets(insights),
            postIdeas: generatePostIdeas(personalInsights)
          },
          metadata: {
            timestamp: new Date().toISOString(),
            freshness: 'real-time',
            newsContext: newsContext.slice(0, 5),
            newsAnalysisIntegrated: newsContext.length > 0
          }
        }
      })
    } else {
      // 新規作成
      savedReport = await prisma.perplexityReport.create({
        data: {
          query,
          focus,
          rawAnalysis: analysis,
          trends: insights.trends || [],
          insights: insights.insights || [],
          personalAngles: personalInsights,
          buzzPrediction,
          recommendations: {
            immediateAction: generateImmediateActions(insights),
            rpTargets: generateRPTargets(insights),
            postIdeas: generatePostIdeas(personalInsights)
          },
          metadata: {
            timestamp: new Date().toISOString(),
            freshness: 'real-time',
            newsContext: newsContext.slice(0, 5),
            newsAnalysisIntegrated: newsContext.length > 0
          }
        }
      })
    }

    return NextResponse.json({
      success: true,
      reportId: savedReport.id,
      rawAnalysis: analysis,
      structuredInsights: insights,
      personalAngles: personalInsights,
      buzzPrediction,
      recommendations: {
        immediateAction: generateImmediateActions(insights),
        rpTargets: generateRPTargets(insights),
        postIdeas: generatePostIdeas(personalInsights)
      },
      metadata: {
        query,
        focus,
        timestamp: new Date().toISOString(),
        freshness: 'real-time' // Perplexityの強み
      }
    })

  } catch (error) {
    console.error('Perplexity trends error:', error)
    return NextResponse.json(
      { error: 'トレンド分析でエラーが発生しました', details: error instanceof Error ? error.message : '不明なエラー' },
      { status: 500 }
    )
  }
}

// Perplexityの分析を構造化
function parsePerplexityAnalysis(analysis: string) {
  const trends: string[] = []
  const insights: string[] = []
  const lines = analysis.split('\n')
  
  // トレンドの抽出（"#### 1. **XXX**" 形式）
  lines.forEach(line => {
    const trendMatch = line.match(/^####\s*\d+\.\s*\*\*(.+?)\*\*/)
    if (trendMatch) {
      trends.push(trendMatch[1])
    }
  })
  
  // 独自解釈と逆張り視点の抽出
  let isInsightSection = false
  lines.forEach((line, index) => {
    // セクションの開始を検出
    if (line.includes('**独自解釈**:') || line.includes('**逆張り視点**:')) {
      isInsightSection = true
      return
    }
    
    // セクションの終了を検出
    if (isInsightSection && line.trim() === '') {
      isInsightSection = false
      return
    }
    
    // インサイトの抽出
    if (isInsightSection && line.trim().startsWith('-')) {
      const insight = line.replace(/^-\s*/, '').trim()
      if (insight.length > 10) { // 短すぎるものを除外
        insights.push(insight)
      }
    }
  })
  
  // "投稿すべき「逆張り視点」"セクションからも抽出
  let inPostSection = false
  lines.forEach(line => {
    if (line.includes('投稿すべき')) {
      inPostSection = true
      return
    }
    
    if (inPostSection && line.trim().startsWith('-')) {
      const postIdea = line.replace(/^-\s*/, '').replace(/\*\*/g, '').trim()
      if (postIdea.length > 10 && !postIdea.endsWith(':')) {
        insights.push(postIdea)
      }
    }
  })
  
  // デバッグ情報
  console.log('Perplexityパース結果:', {
    trends: trends.length,
    insights: insights.length,
    firstTrend: trends[0],
    firstInsight: insights[0]?.substring(0, 50)
  })
  
  return {
    trends: trends.slice(0, 5),
    insights: insights.slice(0, 5),
    rawText: analysis
  }
}

// あなたの個人的な視点を追加
async function generatePersonalInsights(insights: any, focus: string) {
  const personalAngles = []
  
  // クリエイティブ×AI逆説の視点
  if (insights.trends.some((t: string) => t.includes('AI') || t.includes('効率'))) {
    personalAngles.push({
      type: 'creative-paradox',
      angle: '効率化の流れに逆らって「非効率の美学」を語る',
      hook: '23年の映像制作で学んだ「回り道が新しい発見を生む」経験',
      postTemplate: 'みんなが効率化を語る中、あえて「無駄な手作業」の価値を語りたい'
    })
  }
  
  // 未来×過去架橋の視点
  if (insights.trends.some((t: string) => t.includes('革新') || t.includes('最新'))) {
    personalAngles.push({
      type: 'future-past-bridge',
      angle: '最新技術と1990年代のデジャヴを語る',
      hook: 'CG黎明期にも同じことを言われた。歴史は繰り返すのか？',
      postTemplate: '今の○○を見ていると、1990年代の△△を思い出す。あの時も...'
    })
  }
  
  // 50代優位性の視点
  if (insights.trends.some((t: string) => t.includes('若者') || t.includes('Z世代'))) {
    personalAngles.push({
      type: 'age-advantage',
      angle: '若者優位に対して経験者の価値を主張',
      hook: '50代だからこそ見える長期視点の重要性',
      postTemplate: 'Z世代の発想は素晴らしいが、50代の視点も捨てたものではない'
    })
  }
  
  return personalAngles
}

// バズ予測スコアの計算（ニュースコンテキストも考慮）
function calculateBuzzPotential(insights: any, newsContext: any[] = []): number {
  let score = 0.3 // ベーススコア
  
  // Perplexityからのリアルタイム情報 = +0.3
  score += 0.3
  
  // 複数のトレンドキーワード = +0.1〜0.2
  if (insights.trends.length >= 3) score += 0.1
  if (insights.trends.length >= 5) score += 0.1
  
  // AI関連（注目度が高い）= +0.1
  if (insights.rawText.includes('AI') || insights.rawText.includes('LLM')) {
    score += 0.1
  }
  
  // 重要ニュースとの関連性 = +0.1
  if (newsContext.length > 0) {
    const avgImportance = newsContext.reduce((sum, news) => sum + (news.importance || 0), 0) / newsContext.length
    if (avgImportance > 0.7) score += 0.1
  }
  
  return Math.min(score, 1)
}

// 即座にやるべきアクション
function generateImmediateActions(insights: any) {
  const actions = []
  
  // 緊急度の高いトレンドがあるか
  if (insights.trends.length > 0) {
    actions.push({
      type: 'post_original',
      priority: 'high',
      action: `「${insights.trends[0]}」について独自視点で投稿`,
      timeframe: '30分以内'
    })
  }
  
  actions.push({
    type: 'search_rp_targets',
    priority: 'medium',
    action: 'このトレンドに関する有力アカウントの投稿をチェック',
    timeframe: '1時間以内'
  })
  
  return actions
}

// RP対象の提案
function generateRPTargets(insights: any) {
  return [
    {
      type: 'influencer',
      targets: ['@shi3z', '@ochyai', '@hillbig'],
      reason: 'AI関連で影響力があり、あなたの視点と対比しやすい'
    },
    {
      type: 'media',
      targets: ['@itmedia_news', '@techcrunch_jp'],
      reason: 'トレンドニュースに独自視点でRP可能'
    },
    {
      type: 'emerging',
      targets: ['フォロワー1-5万のAI系アカウント'],
      reason: 'まだバズっていない良質な投稿を先取り'
    }
  ]
}

// 投稿アイデアの生成
function generatePostIdeas(personalInsights: any[]) {
  return personalInsights.map(insight => ({
    theme: insight.type,
    angle: insight.angle,
    template: insight.postTemplate,
    timing: '最適投稿時間: 21:00-22:00',
    hashtags: ['#AI', '#クリエイティブ', '#50代キャリア'],
    expectedImpact: 'medium-high'
  }))
}

// ニュース分析結果を含めたクエリの強化
function enhanceQueryWithNewsContext(baseQuery: string, newsContext: any[]): string {
  if (!newsContext || newsContext.length === 0) {
    return baseQuery
  }

  // ニュース分析結果を構造化して含める
  const newsAnalysis = newsContext.map((news, index) => {
    const analysis = news.analysis || {}
    return `
【ニュース${index + 1}】
タイトル: ${news.title}
カテゴリ: ${analysis.category || news.category || '未分類'}
重要度: ${news.importance ? (news.importance * 100).toFixed(0) + '%' : '未評価'}
影響度: ${analysis.impact || '不明'}

日本語要約: ${analysis.japaneseSummary || news.summary}

重要ポイント:
${(analysis.keyPoints || []).map((point: string) => `- ${point}`).join('\n') || '- なし'}

分析時刻: ${news.updatedAt || news.createdAt}
`
  }).join('\n---\n')

  return `${baseQuery}

=== 最新ニュース分析結果 ===
${newsAnalysis}
===

これらのニュース分析結果を踏まえて、より具体的で実践的なトレンド分析と、50代クリエイティブディレクターならではの独自視点を提供してください。特に、各ニュースがもたらす業界への影響と、それに対する「逆張り」的な見解を含めてください。`
}