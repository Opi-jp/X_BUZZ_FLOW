import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const config = body.config || {
      expertise: 'AIと働き方',
      platform: 'Twitter',
      style: '洞察的'
    }
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
    
    const now = new Date()
    const currentDate = now.toISOString().split('T')[0]
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    console.log('=== Step 1 Responses V2 Test ===')
    console.log('Current date:', currentDate)
    console.log('Config:', config)
    
    const startTime = Date.now()
    
    // プロンプトを構築
    const prompt = `You are a viral content strategist specializing in ${config.expertise}.

CURRENT DATE AND TIME: ${now.toISOString()}
Japan Standard Time: ${now.toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' })}
Valid date range: ${sevenDaysAgo} to ${currentDate}

CRITICAL REQUIREMENTS:
1. Use web_search tool to find REAL news articles
2. Search for terms like:
   - "AI 働き方 2025年6月"
   - "AI work transformation June 2025"
   - "リモートワーク AI活用 最新 6月"
   - "future of work AI June 12 2025"
   - "${config.expertise} latest news"
3. Every article MUST have a real URL (https://...)
4. Focus on articles from the last 7 days
5. Include source credibility (major tech sites preferred)

YOUR CONFIGURATION:
- Expertise: ${config.expertise}
- Platform: ${config.platform}
- Style: ${config.style}

SEARCH THESE CATEGORIES:
1. AI and work transformation
2. Remote work and AI tools
3. Future of work trends
4. Business and productivity
5. Technology company announcements
6. Industry developments

OUTPUT FORMAT (JSON only, no markdown):
{
  "articleAnalysis": [
    {
      "title": "Exact article title from web search",
      "source": "Publisher name",
      "url": "https://... (REAL URL from search results)",
      "publishDate": "YYYY-MM-DD",
      "category": "category name",
      "importance": 0.0-1.0,
      "summary": "Brief summary in Japanese",
      "keyPoints": ["point 1", "point 2", "point 3"],
      "expertPerspective": "How this relates to ${config.expertise}",
      "viralPotential": "Why this could go viral from ${config.expertise} perspective"
    }
  ],
  "stats": {
    "searchQueries": ["queries used"],
    "totalResults": number,
    "relevantResults": number
  },
  "opportunityCount": number (at least 5),
  "summary": "Overall analysis summary in Japanese",
  "keyPoints": ["key insight 1", "key insight 2", "..."]
}

Remember: Use web_search actively, return REAL URLs, focus on RECENT news (June 2025).`

    const response = await openai.responses.create({
      model: 'gpt-4o',
      input: prompt,
      tools: [{ type: 'web_search' as any }],
      instructions: `
CRITICAL INSTRUCTIONS:
1. Use web_search tool to find REAL, CURRENT news articles
2. Each article MUST have an actual URL starting with https://
3. Try multiple search queries:
   - "AI news June 12 2025"
   - "AI 働き方 最新 2025年6月"
   - "tech news today June 12 2025"
   - "AI work transformation latest"
4. Return ONLY valid JSON, no markdown blocks
5. Include at least 10 real articles with working URLs
6. Focus on articles from the last 7 days
7. Return pure JSON without markdown code blocks`
    } as any)
    
    const duration = Date.now() - startTime
    
    // output_textを解析
    let analysisResult = null
    
    if (response.output_text) {
      try {
        // Markdownブロックを除去
        let cleanText = response.output_text
        if (cleanText.includes('```')) {
          const match = cleanText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
          if (match) {
            cleanText = match[1]
          }
        }
        
        analysisResult = JSON.parse(cleanText.trim())
        console.log('Successfully parsed response from output_text')
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
          { status: 500 }
        )
      }
    }
    
    // URL検証とログ
    if (analysisResult && analysisResult.articleAnalysis) {
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
        ...analysisResult.stats,
        totalArticles: analysisResult.articleAnalysis.length,
        validArticles: validArticles.length,
        recentArticles: recentArticles.length,
        articlesWithUrls: validArticles.length
      }
    }

    return NextResponse.json({
      success: true,
      step: 1,
      version: 'v2-test',
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
        description: 'トレンド評価・角度分析',
        message: `${analysisResult.stats?.validArticles || 0}件の有効な記事を発見しました。トレンド分析を続行してください。`
      }
    })

  } catch (error) {
    console.error('Step 1 V2 test error:', error)
    
    return NextResponse.json(
      { 
        error: 'Step 1 分析でエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}