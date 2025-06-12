import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function GET() {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
    
    const config = {
      expertise: 'AIとクリエイティブディレクション',
      platform: 'Twitter',
      style: '洞察的'
    }
    
    console.log('=== Full Step 1 Test ===')
    const startTime = Date.now()
    
    // Step 1のプロンプト（シンプル版）
    const prompt = `
あなたは${config.expertise}の専門家です。
現在の日付: ${new Date().toLocaleDateString('ja-JP')}

web_searchツールを使用して、最新のAIニュースを5件検索してください。

以下のJSON形式で回答してください：
{
  "articleAnalysis": [
    {
      "title": "記事タイトル",
      "url": "https://実際のURL",
      "publishDate": "YYYY-MM-DD",
      "source": "メディア名",
      "summary": "要約（日本語）",
      "expertPerspective": "${config.expertise}の視点からの洞察",
      "viralPotential": "バズる可能性とその理由"
    }
  ],
  "opportunityCount": 5,
  "summary": "全体のまとめ"
}`

    const response = await openai.responses.create({
      model: 'gpt-4o',
      input: prompt,
      tools: [{ type: 'web_search' as any }],
      instructions: '必ずJSON形式で回答してください。Markdownコードブロックは使用しないでください。'
    } as any)
    
    const duration = Date.now() - startTime
    
    // output_textを直接使用
    let result = null
    if (response.output_text) {
      try {
        // Markdownブロックを除去
        let cleanText = response.output_text
        if (cleanText.includes('```json')) {
          const match = cleanText.match(/```json\s*\n?([\s\S]*?)\n?\s*```/)
          if (match) {
            cleanText = match[1]
          }
        }
        
        result = JSON.parse(cleanText.trim())
      } catch (e) {
        console.error('Parse error:', e)
      }
    }
    
    if (result && result.articleAnalysis) {
      // URLの検証
      const validArticles = result.articleAnalysis.filter(a => 
        a.url && a.url.startsWith('http')
      )
      
      // テーマの反映を確認
      const hasExpertPerspective = result.articleAnalysis.every(a => 
        a.expertPerspective && a.expertPerspective.includes(config.expertise)
      )
      
      return NextResponse.json({
        success: true,
        duration: duration + 'ms',
        config: config,
        stats: {
          totalArticles: result.articleAnalysis.length,
          articlesWithUrls: validArticles.length,
          hasExpertPerspective: hasExpertPerspective
        },
        articles: result.articleAnalysis,
        summary: result.summary,
        checkPoints: {
          '1. 実在記事のURL取得': validArticles.length > 0,
          '2. テーマ設定の反映': hasExpertPerspective
        }
      })
    }
    
    return NextResponse.json({
      success: false,
      duration: duration + 'ms',
      error: '記事が見つかりませんでした',
      rawResponse: response.output_text?.substring(0, 1000)
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}