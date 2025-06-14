import { NextResponse } from 'next/server'
import { googleSearch } from '@/lib/google-search'

export async function GET() {
  try {
    // 環境変数の確認
    const envCheck = {
      GOOGLE_API_KEY: process.env.GOOGLE_API_KEY ? '設定済み' : '未設定',
      GOOGLE_SEARCH_ENGINE_ID: process.env.GOOGLE_SEARCH_ENGINE_ID ? '設定済み' : '未設定'
    }
    
    // テスト検索
    const query = 'AI workplace 2025'
    const results = await googleSearch.searchNews(query, 7)
    
    return NextResponse.json({
      envCheck,
      query,
      resultCount: results.length,
      results: results.slice(0, 3).map(r => ({
        title: r.title,
        url: r.link,
        snippet: r.snippet,
        source: r.displayLink
      }))
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      envCheck: {
        GOOGLE_API_KEY: process.env.GOOGLE_API_KEY ? '設定済み' : '未設定',
        GOOGLE_SEARCH_ENGINE_ID: process.env.GOOGLE_SEARCH_ENGINE_ID ? '設定済み' : '未設定'
      }
    }, { status: 500 })
  }
}