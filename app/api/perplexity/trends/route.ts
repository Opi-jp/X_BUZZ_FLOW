import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      query = 'AI 最新トレンド 今日',
      focus = 'creative_ai_trends' 
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
            - RP（引用RT）すべきアカウントやツイートの種類`
          },
          {
            role: 'user',
            content: query
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

    // バズ予測スコアを計算
    const buzzPrediction = calculateBuzzPotential(insights)

    return NextResponse.json({
      success: true,
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
      { error: 'トレンド分析でエラーが発生しました', details: error.message },
      { status: 500 }
    )
  }
}

// Perplexityの分析を構造化
function parsePerplexityAnalysis(analysis: string) {
  const lines = analysis.split('\n').filter(line => line.trim())
  
  const trends = []
  const insights = []
  let currentSection = ''
  
  for (const line of lines) {
    if (line.includes('トレンド') || line.includes('注目')) {
      currentSection = 'trends'
    } else if (line.includes('解釈') || line.includes('視点')) {
      currentSection = 'insights'
    } else if (line.includes('投稿') || line.includes('ツイート')) {
      currentSection = 'posts'
    }
    
    if (line.match(/^\d+\./) || line.includes('・')) {
      if (currentSection === 'trends') {
        trends.push(line.replace(/^\d+\.|\・/, '').trim())
      } else if (currentSection === 'insights') {
        insights.push(line.replace(/^\d+\.|\・/, '').trim())
      }
    }
  }
  
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
  if (insights.trends.some(t => t.includes('AI') || t.includes('効率'))) {
    personalAngles.push({
      type: 'creative-paradox',
      angle: '効率化の流れに逆らって「非効率の美学」を語る',
      hook: '23年の映像制作で学んだ「回り道が新しい発見を生む」経験',
      postTemplate: 'みんなが効率化を語る中、あえて「無駄な手作業」の価値を語りたい'
    })
  }
  
  // 未来×過去架橋の視点
  if (insights.trends.some(t => t.includes('革新') || t.includes('最新'))) {
    personalAngles.push({
      type: 'future-past-bridge',
      angle: '最新技術と1990年代のデジャヴを語る',
      hook: 'CG黎明期にも同じことを言われた。歴史は繰り返すのか？',
      postTemplate: '今の○○を見ていると、1990年代の△△を思い出す。あの時も...'
    })
  }
  
  // 50代優位性の視点
  if (insights.trends.some(t => t.includes('若者') || t.includes('Z世代'))) {
    personalAngles.push({
      type: 'age-advantage',
      angle: '若者優位に対して経験者の価値を主張',
      hook: '50代だからこそ見える長期視点の重要性',
      postTemplate: 'Z世代の発想は素晴らしいが、50代の視点も捨てたものではない'
    })
  }
  
  return personalAngles
}

// バズ予測スコアの計算
function calculateBuzzPotential(insights: any): number {
  let score = 0.3 // ベーススコア
  
  // Perplexityからのリアルタイム情報 = +0.3
  score += 0.3
  
  // 複数のトレンドキーワード = +0.2
  if (insights.trends.length >= 3) score += 0.2
  
  // AI関連（注目度が高い）= +0.2
  if (insights.rawText.includes('AI') || insights.rawText.includes('LLM')) {
    score += 0.2
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