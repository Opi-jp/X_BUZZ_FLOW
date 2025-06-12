import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'
import { parseGptResponse, debugResponse, ensureJsonInstructions } from '@/lib/gpt-response-parser'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    
    // キャッシュを無効化
    const headers = {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }

    // セッション情報を取得（エラー時はデフォルト値を使用）
    let session = null
    let config = {
      config: {
        expertise: 'AIと働き方',
        platform: 'Twitter',
        style: '洞察的'
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
      console.warn('Database connection error, using default config:', dbError instanceof Error ? dbError.message : 'Unknown error')
    }
    // 注意: Web検索は GPT-4o + Responses API の組み合わせのみサポート
    const selectedModel = 'gpt-4o' // 固定
    
    console.log('Using model:', selectedModel)
    console.log('API: Responses API (web_search tool enabled)')

    console.log('=== Step 1 V2: Enhanced Web Search ===')
    console.log('Session ID:', sessionId)
    console.log('Current time:', new Date().toISOString())
    
    const startTime = Date.now()

    // より明確な指示でプロンプトを構築
    const enhancedPrompt = buildEnhancedPrompt(config.config)
    
    console.log('Prompt preview:', enhancedPrompt.substring(0, 300) + '...')

    // Responses APIを使用してウェブ検索を実行
    const response = await openai.responses.create({
      model: selectedModel,
      input: enhancedPrompt,
      tools: [
        {
          type: 'web_search' as any
        }
      ],
      instructions: `
CRITICAL INSTRUCTIONS:
1. Use web_search tool to find REAL, CURRENT news articles
2. Each article MUST have an actual URL starting with https://
3. Try multiple search queries:
   - "AI news June 12 2025"
   - "artificial intelligence June 2025"
   - "tech news today June 12 2025"
   - "AI technology latest 2025"
4. Return ONLY valid JSON, no markdown blocks
5. Include at least 10 real articles with working URLs
6. Focus on articles from the last 7 days
7. Return pure JSON without markdown code blocks`
    } as any)

    const duration = Date.now() - startTime
    console.log('API call duration:', duration, 'ms')
    
    // デバッグ情報を出力
    debugResponse(response, 'Step 1 Response')
    
    // レスポンスを解析（テキスト形式）
    let analysisResult = null
    
    if (response.output_text) {
      try {
        const responseText = response.output_text
        console.log('Raw response preview:', responseText.substring(0, 500) + '...')
        
        // テキストからバズ機会を抽出
        const viralOpportunities = []
        const sections = responseText.split(/[ABCD]\.\s/).filter(s => s.trim())
        
        for (let i = 1; i < Math.min(sections.length, 5); i++) {
          const section = sections[i]
          const lines = section.split('\n').filter(line => line.trim())
          
          let title = lines[0] || `バズ機会 ${i}`
          let url = ''
          let insight = ''
          
          // URLを抽出
          const urlMatch = section.match(/https?:\/\/[^\s\)]+/)
          if (urlMatch) {
            url = urlMatch[0]
          }
          
          // データや現象を抽出
          const bulletPoints = lines.filter(line => line.trim().startsWith('•') || line.trim().startsWith('-'))
          if (bulletPoints.length > 0) {
            insight = bulletPoints[0].replace(/^[•\-]\s*/, '')
          }
          
          viralOpportunities.push({
            topic: title.replace(/^\[|\]$/g, ''),
            url: url,
            insight: insight,
            viralScore: 0.8,
            urgency: 'high'
          })
        }
        
        // 記事分析用の構造化データを作成
        const today = new Date().toISOString().split('T')[0]
        const articleAnalysis = viralOpportunities.map((opp, index) => ({
          title: opp.topic,
          source: opp.url ? new URL(opp.url).hostname : 'Unknown',
          url: opp.url,
          publishDate: today,
          category: 'Technology',
          importance: 0.8,
          summary: opp.insight,
          keyPoints: [opp.insight],
          expertPerspective: `${config.config?.expertise || config.expertise}の視点から重要な機会`,
          viralPotential: 'エンゲージメントと議論を促進する可能性が高い'
        }))
        
        analysisResult = {
          articleAnalysis: articleAnalysis,
          viralOpportunities: viralOpportunities,
          summary: responseText.split('🎯')[0]?.trim() || 'バイラル機会分析完了',
          keyPoints: ['Web検索による最新情報収集', 'バイラル機会の特定', '48時間以内のアクション可能な機会'],
          stats: {
            totalArticles: articleAnalysis.length,
            validArticles: articleAnalysis.length,
            articlesWithUrls: articleAnalysis.filter(a => a.url).length
          }
        }
        
        console.log('Successfully parsed text response')
      } catch (e) {
        console.error('Parse error:', e)
        console.log('Raw text:', response.output_text.substring(0, 500))
        
        return NextResponse.json(
          { 
            error: 'レスポンスの解析に失敗しました',
            debug: {
              parseError: e instanceof Error ? e.message : 'Unknown error',
              rawTextPreview: response.output_text?.substring(0, 200)
            }
          },
          { status: 500, headers }
        )
      }
    } else {
      // フォールバック: parseGptResponseを使用
      const parsed = parseGptResponse(response)
      
      if (!parsed.success) {
        console.error('Parse failed:', parsed.error)
        console.log('Raw text:', parsed.rawText?.substring(0, 500))
        
        return NextResponse.json(
          { 
            error: 'レスポンスの解析に失敗しました',
            debug: {
              parseError: parsed.error,
              rawTextPreview: parsed.rawText?.substring(0, 200)
            }
          },
          { status: 500, headers }
        )
      }
      
      analysisResult = parsed.data
    }
    
    // URL検証とログ
    if (analysisResult.articleAnalysis) {
      console.log('Article count:', analysisResult.articleAnalysis.length)
      
      // 各記事のURL検証
      const validArticles = analysisResult.articleAnalysis.filter((article: any, index: number) => {
        const hasUrl = !!article.url && article.url.startsWith('http')
        const hasTitle = !!article.title
        
        console.log(`Article ${index + 1}:`, {
          title: article.title?.substring(0, 50),
          url: article.url,
          hasValidUrl: hasUrl,
          date: article.publishDate || article.date
        })
        
        return hasUrl && hasTitle
      })
      
      console.log('Valid articles with URLs:', validArticles.length)
      
      // 日付の新しさをチェック
      const recentArticles = validArticles.filter((article: any) => {
        const date = article.publishDate || article.date
        if (!date) return true // 日付がない場合は含める
        
        const articleDate = new Date(date)
        const daysDiff = (Date.now() - articleDate.getTime()) / (1000 * 60 * 60 * 24)
        
        return daysDiff <= 7 // 7日以内の記事
      })
      
      console.log('Recent articles (within 7 days):', recentArticles.length)
      
      // 結果を更新
      analysisResult.articleAnalysis = validArticles
      analysisResult.stats = {
        totalArticles: analysisResult.articleAnalysis.length,
        validArticles: validArticles.length,
        recentArticles: recentArticles.length,
        articlesWithUrls: validArticles.length
      }
    }

    // Step 1の結果を保存（エラー時はスキップ）
    if (session) {
      try {
        await prisma.gptAnalysis.update({
          where: { id: sessionId },
          data: {
            response: {
              ...(session.response as any || {}),
              step1: analysisResult
            },
            tokens: (session.tokens || 0) + 1000, // 概算
            duration: (session.duration || 0) + duration,
            metadata: {
              ...(session.metadata as any || {}),
              currentStep: 1,
              step1CompletedAt: new Date().toISOString(),
              usedResponsesAPI: true,
              version: 'v2'
            }
          }
        })
      } catch (dbError) {
        console.warn('Failed to save results to database:', dbError instanceof Error ? dbError.message : 'Unknown error')
      }
    }

    return NextResponse.json({
      success: true,
      sessionId,
      step: 1,
      version: 'v2',
      response: {
        articleAnalysis: analysisResult.articleAnalysis || [],
        currentEvents: analysisResult.currentEvents,
        socialListening: analysisResult.socialListening,
        viralPatterns: analysisResult.viralPatterns,
        opportunityCount: analysisResult.opportunityCount,
        summary: analysisResult.summary,
        keyPoints: analysisResult.keyPoints || [],
        stats: analysisResult.stats
      },
      metrics: {
        duration,
        articlesFound: analysisResult.articleAnalysis?.length || 0,
        articlesWithUrls: analysisResult.stats?.articlesWithUrls || 0
      },
      nextStep: {
        step: 2,
        url: `/api/viral/gpt-session/${sessionId}/step2`,
        description: 'トレンド評価・角度分析',
        message: `${analysisResult.stats?.validArticles || 0}件の有効な記事を発見しました。トレンド分析を続行してください。`
      }
    }, { headers })

  } catch (error) {
    console.error('Step 1 V2 error:', error)
    
    return NextResponse.json(
      { 
        error: 'Step 1 分析でエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function buildEnhancedPrompt(config: any) {
  const now = new Date()
  const currentDateJST = now.toLocaleDateString('ja-JP', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    timeZone: 'Asia/Tokyo'
  })
  
  // 今日から過去7日間の日付リストを作成
  const recentDates = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    recentDates.push(date.toISOString().split('T')[0])
  }
  
  return `あなたはバイラルコンテンツ戦略家です。

設定情報:
1. 専門分野: ${config.expertise}
2. プラットフォーム: ${config.platform}
3. スタイル: ${config.style}

現在時刻: ${currentDateJST}

web_searchツールを使用して、複数のソースを調査してください：

【現在の出来事の分析】
- 最新ニュースと最新ニュース
- 有名人の事件と世間の反応
- 政治的展開が議論を巻き起こす
- テクノロジーの発表とテクノロジードラマ
- ビジネスニュースと企業論争
- 文化的瞬間と社会運動
- スポーツイベントと予想外の結果
- インターネットドラマとプラットフォーム論争

【ソーシャルリスニング研究】
- Twitterのトレンドトピックとハッシュタグの速度
- TikTokサウンドとチャレンジの出現
- Redditのホットな投稿とコメントの感情
- Googleトレンドの急上昇パターン
- YouTubeトレンド動画分析
- ニュース記事のコメント欄
- ソーシャルメディアのエンゲージメントパターン

【ウイルスパターン認識】
ウイルス感染の可能性があるトピックを特定する:
- 論争レベル（強い意見を生み出す）
- 感情の強さ（怒り、喜び、驚き、憤慨）
- 共感性要因（多くの人に影響を与える）
- 共有可能性（人々が広めたいと思うこと）
- タイミングの敏感さ（関連性のウィンドウが狭い）
- プラットフォームの調整（プラットフォーム文化に適合）

【${config.expertise}の視点から】48時間以内にバズる可能性が高い機会を特定してください。

以下の形式で回答してください：

以下の社会動向が、${config.expertise}の交差点で「即反応可能なバズ波」として浮上しています。

A. [具体的なバズ機会1のタイトル]
    • [具体的なデータや現象]
    • [記事URL]
    • この"[ポイント]"はエンタメ要素も含む格好の話題点に

B. [具体的なバズ機会2のタイトル]
    • [具体的なデータや現象]
    • [記事URL]
    • [なぜバズるかの理由]

C. [具体的なバズ機会3のタイトル]
    • [具体的なデータや現象]
    • [記事URL]
    • [なぜバズるかの理由]

D. [具体的なバズ機会4のタイトル]
    • [具体的なデータや現象]
    • [記事URL]
    • [なぜバズるかの理由]

🎯 初期結論：今48時間以内に波に乗る可能性が高いテーマ
    • [テーマ1とアプローチ]
    • [テーマ2とアプローチ]
    • [テーマ3とアプローチ]
    • [テーマ4とアプローチ]`
}