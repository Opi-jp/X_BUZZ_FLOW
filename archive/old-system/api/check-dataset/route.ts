import { NextRequest, NextResponse } from 'next/server'

// GET: データセットの内容を確認
export async function GET(request: NextRequest) {
  try {
    if (!process.env.KAITO_API_KEY) {
      return NextResponse.json({ error: 'Kaito API key not configured' }, { status: 500 })
    }

    // 提供されたデータセットIDを使用
    const datasetId = 'qDNQTAsRIHJsrp1CE'
    
    const response = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items?clean=true&format=json&token=${process.env.KAITO_API_KEY}`,
    )

    if (!response.ok) {
      return NextResponse.json({
        error: 'Failed to fetch dataset',
        status: response.status
      }, { status: 500 })
    }

    const items = await response.json()
    
    // データの構造を分析
    if (items && items.length > 0) {
      const firstItem = items[0]
      const structure = {
        totalItems: items.length,
        fields: Object.keys(firstItem),
        sampleItem: firstItem,
        // 重要なフィールドの存在確認
        hasRequiredFields: {
          id: 'id' in firstItem || 'tweetId' in firstItem,
          text: 'text' in firstItem || 'tweetText' in firstItem || 'full_text' in firstItem,
          author: 'author' in firstItem || 'user' in firstItem,
          metrics: 'likeCount' in firstItem || 'favorite_count' in firstItem || 'likes' in firstItem
        }
      }
      
      // 最初の3件のツイートデータを整形して表示
      const tweets = items.slice(0, 3).map((item: any) => ({
        id: item.id || item.tweetId || item.id_str,
        text: item.text || item.tweetText || item.full_text,
        author: item.author?.username || item.user?.screen_name || item.authorUsername,
        likes: item.likeCount || item.favorite_count || item.likes || 0,
        retweets: item.retweetCount || item.retweet_count || item.retweets || 0,
        url: item.url || item.tweetUrl
      }))
      
      return NextResponse.json({
        success: true,
        datasetId,
        structure,
        sampleTweets: tweets
      })
    }

    return NextResponse.json({
      success: false,
      message: 'データセットは空です'
    })

  } catch (error) {
    console.error('Error checking dataset:', error)
    return NextResponse.json({
      error: 'Failed to check dataset',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}