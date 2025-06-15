/**
 * Phase 1 Execute デバッグテスト
 * エラーの詳細を特定するための詳細ログ出力
 */

require('dotenv').config({ path: '.env.local' })

// orchestrated-cot-strategyモジュールを直接インポート
const { Phase1Strategy } = require('./lib/orchestrated-cot-strategy')

// Perplexityクライアントのモック
class MockPerplexityClient {
  constructor() {
    console.log('[MockPerplexity] Client created')
  }
  
  async searchWithContext({ query, systemPrompt, searchRecency }) {
    console.log('[MockPerplexity] searchWithContext called')
    console.log('[MockPerplexity] Query:', query)
    console.log('[MockPerplexity] Search recency:', searchRecency)
    
    return {
      choices: [{
        message: {
          content: `
話題になっている理由：
${query}は最近特に注目を集めています。これは技術の進歩と社会への影響が顕著になってきたためです。

感情的反応：
SNSでは賛否両論が激しく交わされており、特にTwitterでは#AIEthicsのハッシュタグが急上昇しています。

議論の内容：
専門家からは規制の必要性が指摘される一方、イノベーションを阻害するという反対意見も強く出ています。

専門家としての視点：
AIの発展と倫理的配慮のバランスを取ることが重要です。

関連ニュース：
[1] AI倫理ガイドライン策定へ https://example.com/ai-ethics-guidelines
[2] 大手企業がAI規制に賛同 https://example.com/companies-support-regulation
[3] AI研究者からの提言 https://example.com/researcher-recommendations
          `
        }
      }]
    }
  }
}

async function testPhase1Execute() {
  console.log('=== Phase 1 Execute デバッグテスト ===\n')
  
  // テスト用の検索クエリ（Think結果を模擬）
  const mockThinkResult = {
    analysisApproach: {
      A_currentEvents: ["AIと倫理の最新議論"],
      B_technology: ["生成AIの企業利用"],
      C_socialListening: ["#AIEthics トレンド"],
      D_viralPatterns: ["論争性の高いAI話題"]
    },
    queries: [
      {
        category: "A",
        topic: "AIと倫理の議論",
        query: "AI ethics debate 2024",
        queryJa: "AI 倫理 議論 2024",
        intent: "AIに関する現在進行中の倫理的議論を特定する",
        viralPotential: {
          controversy: "高",
          emotion: "中",
          relatability: "高",
          shareability: "中",
          timeSensitivity: "高",
          platformFit: "高"
        }
      }
    ]
  }
  
  // コンテキストの準備
  const context = {
    expertise: "AI",
    style: "Educational",
    platform: "Twitter",
    userConfig: {
      expertise: "AI",
      style: "Educational", 
      platform: "Twitter"
    }
  }
  
  console.log('コンテキスト:', JSON.stringify(context, null, 2))
  console.log('\n')
  
  try {
    // Phase1StrategyのExecuteハンドラーを直接呼び出し
    console.log('Executeハンドラーを呼び出します...\n')
    
    // エラーの原因を特定するため、各ステップを分離
    const handler = Phase1Strategy.execute.handler
    console.log('Handler type:', typeof handler)
    console.log('Handler:', handler.toString().substring(0, 200) + '...')
    
    // ハンドラー実行
    const result = await handler(mockThinkResult, context)
    
    console.log('\n実行成功！')
    console.log('結果:', JSON.stringify(result, null, 2))
    
  } catch (error) {
    console.error('\n実行エラー!')
    console.error('エラータイプ:', error.constructor.name)
    console.error('エラーメッセージ:', error.message)
    console.error('スタックトレース:', error.stack)
    
    // エラーの詳細を調査
    if (error.message.includes('Cannot read properties of undefined')) {
      console.error('\n未定義プロパティエラーの詳細:')
      console.error('- expertiseへのアクセスに失敗している可能性があります')
      console.error('- contextが正しく渡されていない可能性があります')
    }
  }
}

// モジュールが正しくロードされているか確認
console.log('Phase1Strategy loaded:', !!Phase1Strategy)
console.log('Phase1Strategy.execute loaded:', !!Phase1Strategy?.execute)
console.log('Phase1Strategy.execute.handler loaded:', !!Phase1Strategy?.execute?.handler)

testPhase1Execute().catch(console.error)