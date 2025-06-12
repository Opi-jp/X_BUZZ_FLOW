import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { parseGptResponse } from '@/lib/gpt-response-parser'

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
    const parsed = parseGptResponse(response)
    console.log('Parse success:', parsed.success)
    
    // パース失敗時のデバッグ
    if (!parsed.success && parsed.rawText) {
      console.log('Raw text length:', parsed.rawText.length)
      console.log('Raw text preview:', parsed.rawText.substring(0, 200))
      console.log('Raw text last 50 chars:', parsed.rawText.substring(parsed.rawText.length - 50))
    }
    
    if (parsed.success && parsed.data?.articleAnalysis) {
      const articles = parsed.data.articleAnalysis
      console.log('Articles found:', articles.length)
      
      // URL検証
      const validUrls = articles.filter(a => a.url && a.url.startsWith('http'))
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
        fullData: parsed.data
      })
    }
    
    return NextResponse.json({
      success: false,
      duration: duration + 'ms',
      error: 'No articles found',
      rawText: parsed.rawText?.substring(0, 500)
    })
    
  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error
    }, { status: 500 })
  }
}

function buildTestPrompt(config: any) {
  const now = new Date()
  return `You are a viral content strategist specializing in ${config.expertise}.

Current date: ${now.toISOString()}

Use web_search to find 10 real news articles from the last 7 days.
Focus on:
1. AI and technology news
2. Creative industry developments
3. ${config.expertise} related topics

For each article, provide:
{
  "articleAnalysis": [
    {
      "title": "Exact title",
      "url": "https://... (real URL)",
      "publishDate": "YYYY-MM-DD",
      "source": "Publisher name",
      "summary": "Brief summary in Japanese",
      "expertPerspective": "Your insight as ${config.expertise} expert",
      "viralPotential": "Why this could go viral"
    }
  ]
}

IMPORTANT: Use web_search tool. Include real URLs. Return JSON only.`
}