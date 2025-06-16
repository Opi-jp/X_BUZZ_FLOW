import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('[MOCK PERPLEXITY] Request received:', {
      query: body.query?.substring(0, 100) + '...',
      systemPrompt: body.systemPrompt?.substring(0, 50) + '...'
    })
    
    // モックレスポンスを返す
    const mockResponse = {
      choices: [{
        message: {
          content: `
## モック検索結果

### 話題になっている理由
これはテスト用のモック応答です。実際のPerplexity APIは呼び出されていません。

### 最新の動向
- AIと働き方に関する最新トレンド
- リモートワークの進化
- 生産性向上ツールの普及

### ソース
- [テストソース1](https://example.com/test1) (2025年6月15日)
- [テストソース2](https://example.com/test2) (2025年6月14日)

### バイラル要素
- 感情的反応: 高い関心と期待感
- 議論の的: AIによる仕事の自動化への賛否両論
- 共感性: 多くの働く人々に影響

### 専門家の視点
AIツールの活用により、働き方が根本的に変わりつつあります。
`
        }
      }],
      citations: [],
      search_results: [
        {
          title: "AIが変える未来の働き方",
          url: "https://example.com/test1",
          date: "2025年6月15日"
        },
        {
          title: "リモートワーク最新トレンド",
          url: "https://example.com/test2", 
          date: "2025年6月14日"
        }
      ]
    }
    
    // 実際のPerplexityのような遅延をシミュレート（短めに）
    await new Promise(resolve => setTimeout(resolve, 500))
    
    return NextResponse.json(mockResponse)
    
  } catch (error) {
    console.error('[MOCK PERPLEXITY] Error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}