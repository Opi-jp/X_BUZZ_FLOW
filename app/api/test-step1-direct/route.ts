import { NextResponse } from 'next/server'
import OpenAI from 'openai'
// import { parseGptResponse } from '@/lib/gpt-response-parser'

export async function GET() {
  try {
    console.log('=== Direct Step 1 Test ===')
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
    
    const config = {
      expertise: 'AIとクリエイティブディレクション',
      platform: 'Twitter',
      style: '洞察的'
    }
    
    const prompt = buildTestPrompt(config)
    console.log('Prompt length:', prompt.length)
    
    const startTime = Date.now()
    
    // Responses APIでWeb検索を実行
    const response = await openai.responses.create({
      model: 'gpt-4o',
      input: prompt,
      tools: [{ type: 'web_search' as any }],
      instructions: 'Use web_search to find real articles. Return JSON only.'
    } as any)
    
    const duration = Date.now() - startTime
    console.log('Duration:', duration, 'ms')
    
    // レスポンスを解析
    let result = null
    const rawText = response.output_text || ''
    
    try {
      // Markdownブロックを除去
      let cleanText = rawText
      if (cleanText.includes('```')) {
        const match = cleanText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
        if (match) {
          cleanText = match[1]
        }
      }
      result = JSON.parse(cleanText.trim())
      console.log('Parse success: true')
    } catch (e) {
      console.log('Parse success: false')
      console.log('Raw text length:', rawText.length)
      console.log('Raw text preview:', rawText.substring(0, 200))
      console.log('Raw text last 50 chars:', rawText.substring(rawText.length - 50))
    }
    
    if (result && result.articleAnalysis) {
      const articles = result.articleAnalysis
      console.log('Articles found:', articles.length)
      
      // URL検証
      const validUrls = articles.filter((a: any) => a.url && a.url.startsWith('http'))
      console.log('Articles with valid URLs:', validUrls.length)
      
      return NextResponse.json({
        success: true,
        duration: duration + 'ms',
        stats: {
          totalArticles: articles.length,
          articlesWithUrls: validUrls.length,
          themes: config
        },
        articles: articles.slice(0, 3), // 最初の3件
        fullData: result
      })
    }
    
    return NextResponse.json({
      success: false,
      duration: duration + 'ms',
      error: 'No articles found',
      rawText: rawText.substring(0, 500)
    })
    
  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.toString() : 'Unknown error'
    }, { status: 500 })
  }
}

function buildTestPrompt(config: any) {
  const now = new Date()
  const expertise = config.expertise || 'AIとクリエイティブディレクション'
  return `You are a viral content strategist specializing in ${expertise}.

Current date: ${now.toISOString()}

Use web_search to find 10 real news articles from the last 7 days.
Focus on:
1. AI and technology news
2. Creative industry developments
3. ${expertise} related topics

For each article, provide:
{
  "articleAnalysis": [
    {
      "title": "Exact title",
      "url": "https://... (real URL)",
      "publishDate": "YYYY-MM-DD",
      "source": "Publisher name",
      "summary": "Brief summary in Japanese",
      "expertPerspective": "Your insight as ${expertise} expert",
      "viralPotential": "Why this could go viral"
    }
  ]
}

IMPORTANT: Use web_search tool. Include real URLs. Return JSON only.`
}