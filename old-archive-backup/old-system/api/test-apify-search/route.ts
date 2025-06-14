import { NextRequest, NextResponse } from 'next/server'

// GET: Apifyで利用可能なTwitter関連アクターを検索
export async function GET(request: NextRequest) {
  try {
    if (!process.env.KAITO_API_KEY) {
      return NextResponse.json({ error: 'Kaito API key not configured' }, { status: 500 })
    }

    // Apify Store APIでTwitter関連のアクターを検索
    const searchResponse = await fetch(
      'https://api.apify.com/v2/store?search=twitter%20scraper&category=SOCIAL_MEDIA',
      {
        headers: {
          'Authorization': `Bearer ${process.env.KAITO_API_KEY}`
        }
      }
    )

    if (!searchResponse.ok) {
      // 代替: 自分のアクターリストを取得
      const myActorsResponse = await fetch(
        `https://api.apify.com/v2/acts?token=${process.env.KAITO_API_KEY}`,
      )

      const myActors = await myActorsResponse.json()
      
      return NextResponse.json({
        source: 'my-actors',
        actors: myActors.data?.items || []
      })
    }

    const searchData = await searchResponse.json()
    
    // Twitter関連のアクターをフィルタリング
    const twitterActors = searchData.data?.items?.filter((actor: any) => 
      actor.name.toLowerCase().includes('twitter') || 
      actor.description?.toLowerCase().includes('twitter')
    ) || []

    return NextResponse.json({
      source: 'store-search',
      totalFound: twitterActors.length,
      actors: twitterActors.map((actor: any) => ({
        id: actor.id,
        name: actor.name,
        username: actor.username,
        description: actor.description?.substring(0, 200),
        isPublic: actor.isPublic,
        stats: actor.stats
      }))
    })

  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({
      error: 'Search failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}