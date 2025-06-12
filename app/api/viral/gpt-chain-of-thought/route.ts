import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      expertise = 'AIと働き方',
      platform = 'Twitter',
      style = '洞察的'
    } = body
    
    console.log('=== Chain of Thought Full Process ===')
    console.log('Config:', { expertise, platform, style })
    
    const startTime = Date.now()
    const now = new Date()
    const currentDateJST = now.toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' })
    
    // ChatGPTスタイルの統合プロンプト（簡潔版）
    const fullPrompt = `あなたはバイラルコンテンツ戦略家です。以下の5段階のChain of Thoughtプロセスを順次実行してください：

設定: ${expertise} | ${platform} | ${style}
現在時刻: ${currentDateJST}

【STEP 1: データ収集・分析】
web_searchで最新ニュースを調査し、${expertise}の視点から48時間以内にバズる機会を4つ特定：

A. [バズ機会1] • [データ] • [URL] • [理由]
B. [バズ機会2] • [データ] • [URL] • [理由]  
C. [バズ機会3] • [データ] • [URL] • [理由]
D. [バズ機会4] • [データ] • [URL] • [理由]

🎯 初期結論：今48時間以内に波に乗る可能性が高いテーマ4つ

【STEP 2: バズる機会評価】
各機会のウイルス速度指標（検索ボリューム、ソーシャルメンション、インフルエンサー採用、メディア勢い）とコンテンツアングル（専門家分析、予測、比較）を評価。

【STEP 3: コンテンツコンセプト作成】
上位3つの機会について、コンセプトフレームワークで開発：
- プラットフォーム: ${platform}
- 形式: [スレッド/投稿]
- フック: 「[オープナー]」
- 角度: [独自視点]
- タイミング: [X時間以内]
- ハッシュタグ: [最適化タグ]

「バズるコンテンツのコンセプトの概要は次のとおりです。「続行」と入力すると、各コンセプトの完全な、すぐに投稿できるコンテンツが表示されます。」

【STEP 4: 完全なコンテンツ作成】
3つの投稿準備完了コンテンツを作成：
**コンセプト1**: [コピー＆ペースト可能な完全コンテンツ（絵文字、ハッシュタグ含む）]
**コンセプト2**: [コピー＆ペースト可能な完全コンテンツ（絵文字、ハッシュタグ含む）]
**コンセプト3**: [コピー＆ペースト可能な完全コンテンツ（絵文字、ハッシュタグ含む）]

「投稿できる完全なバズるコンテンツができました。実行戦略については「続行」と入力してください。」

【STEP 5: 実行戦略】
**実行タイムライン**: 即時（2-4h）→投稿期間（4-24h）→フォローアップ（24-48h）
**最適化技術**: エンゲージメント監視、戦略的コメント、複数プラットフォーム共有
**成功指標**: エンゲージメント率、シェア速度、フォロワー増加
**結論**: 「品質を維持しながら迅速に実行。バズるウィンドウは狭いが、適切なタイミングでリーチを飛躍的に拡大可能。」

全5段階を順次実行し、各段階の結果を次に活用してください。`

    const response = await openai.responses.create({
      model: 'gpt-4o',
      input: fullPrompt,
      tools: [{ type: 'web_search' as any }],
      instructions: `
Execute all 5 steps of the Chain of Thought process in sequence.
Use web_search tool for Step 1 to find real, current articles.
Each step should build upon the previous step's results.
Provide comprehensive analysis at each stage.
Focus on ${expertise} perspective throughout.`
    } as any)
    
    const duration = Date.now() - startTime
    
    return NextResponse.json({
      success: true,
      duration: duration + 'ms',
      chainOfThought: {
        config: { expertise, platform, style },
        fullProcess: response.output_text || 'No response received',
        processedAt: new Date().toISOString()
      },
      nextAction: {
        type: 'review_and_post',
        description: '生成されたコンテンツをレビューし、投稿を検討してください'
      }
    })

  } catch (error) {
    console.error('Chain of Thought error:', error)
    
    return NextResponse.json(
      { 
        error: 'Chain of Thought分析でエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}