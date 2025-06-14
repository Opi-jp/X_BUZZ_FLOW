import { NextRequest, NextResponse } from 'next/server'

// GET: 実際に動作する可能性が高い形式でテスト
export async function GET(request: NextRequest) {
  try {
    if (!process.env.KAITO_API_KEY) {
      return NextResponse.json({ error: 'Kaito API key not configured' }, { status: 500 })
    }

    // 異なるアクター名を試す
    const actors = [
      'quacker~twitter-scraper',
      'epctex~twitter-scraper',
      'microworlds~twitter-scraper',
      'apify~twitter-scraper',
      'curious_coder~twitter-scraper-v2'
    ]

    const results = []

    for (const actor of actors) {
      console.log(`Testing actor: ${actor}`)

      try {
        // まずアクターの情報を取得
        const actorInfoResponse = await fetch(
          `https://api.apify.com/v2/acts/${actor}`,
          {
            headers: {
              'Authorization': `Bearer ${process.env.KAITO_API_KEY}`
            }
          }
        )

        if (actorInfoResponse.ok) {
          const actorInfo = await actorInfoResponse.json()
          
          // アクターが存在する場合、簡単なテストを実行
          const testResponse = await fetch(
            `https://api.apify.com/v2/acts/${actor}/runs?token=${process.env.KAITO_API_KEY}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                searchTerms: ["test"],
                maxItems: 1
              }),
            }
          )

          const testData = await testResponse.json()
          
          results.push({
            actor,
            exists: true,
            name: actorInfo.data?.name,
            description: actorInfo.data?.description?.substring(0, 100),
            testRunId: testData.data?.id,
            testStatus: testResponse.ok ? 'started' : 'failed'
          })
        } else {
          results.push({
            actor,
            exists: false
          })
        }
      } catch (error) {
        results.push({
          actor,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // 使用可能なアクターのみ表示
    const availableActors = results.filter(r => r.exists)

    return NextResponse.json({
      totalTested: actors.length,
      available: availableActors.length,
      results,
      recommendation: availableActors.length > 0 ? 
        `使用可能なアクター: ${availableActors.map(a => a.actor).join(', ')}` :
        '利用可能なTwitterスクレイパーが見つかりませんでした'
    })

  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json({
      error: 'Test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}