/**
 * 自分の過去ツイートを一括インポートするスクリプト
 * 分析機能の初期データとして使用
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// KaitoAPIを使って自分のツイートを取得
async function fetchMyTweets(username, limit = 100) {
  const apiKey = process.env.KAITO_API_KEY || 'k3Br7W5dxXaAqKHD25pu5HwQOcI04r7i'
  
  try {
    console.log(`Fetching tweets for @${username}...`)
    
    const response = await fetch('https://api.apify.com/v2/acts/kaitoeasyapi~twitter-user-timeline/run-sync-get-dataset-items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: username,
        maxTweets: limit,
        sort: 'Latest',
        twitterContent: ['posts', 'replies']
      })
    }, {
      params: {
        token: apiKey,
        timeout: 60
      }
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    console.log(`Fetched ${data.length} tweets`)
    return data
  } catch (error) {
    console.error('Error fetching tweets:', error)
    return []
  }
}

// ツイートデータを保存
async function saveTweets(tweets, username) {
  let saved = 0
  let skipped = 0
  
  for (const tweet of tweets) {
    try {
      // RT、リプライはスキップ
      if (tweet.isRetweet || tweet.isReply) {
        skipped++
        continue
      }

      // 既存チェック
      const existing = await prisma.buzzPost.findFirst({
        where: { url: tweet.url }
      })
      
      if (existing) {
        skipped++
        continue
      }

      // 保存
      await prisma.buzzPost.create({
        data: {
          content: tweet.fullText || tweet.text || '',
          authorUsername: username,
          authorName: tweet.author?.name || username,
          likesCount: tweet.likeCount || 0,
          retweetsCount: tweet.retweetCount || 0,
          impressionsCount: tweet.viewCount || 0,
          url: tweet.url || '',
          postedAt: tweet.createdAt ? new Date(tweet.createdAt) : new Date(),
          theme: '自分の投稿',
          hashtags: tweet.hashtags || [],
          isAnalyzed: true, // 自分の投稿は分析済みとしてマーク
        }
      })
      
      saved++
      console.log(`Saved: ${tweet.fullText?.substring(0, 50)}...`)
      
    } catch (error) {
      console.error('Error saving tweet:', error)
    }
  }
  
  return { saved, skipped }
}

// 分析データも作成
async function createAnalyticsData(username) {
  console.log('Creating analytics data...')
  
  const myPosts = await prisma.buzzPost.findMany({
    where: { 
      authorUsername: username,
      theme: '自分の投稿'
    },
    orderBy: { postedAt: 'desc' }
  })
  
  console.log(`Found ${myPosts.length} posts to analyze`)
  
  // 基本統計
  const stats = {
    totalPosts: myPosts.length,
    totalImpressions: myPosts.reduce((sum, p) => sum + p.impressionsCount, 0),
    totalLikes: myPosts.reduce((sum, p) => sum + p.likesCount, 0),
    totalRetweets: myPosts.reduce((sum, p) => sum + p.retweetsCount, 0),
    avgImpressions: myPosts.length > 0 ? Math.round(myPosts.reduce((sum, p) => sum + p.impressionsCount, 0) / myPosts.length) : 0,
    avgLikes: myPosts.length > 0 ? Math.round(myPosts.reduce((sum, p) => sum + p.likesCount, 0) / myPosts.length) : 0,
    avgRetweets: myPosts.length > 0 ? Math.round(myPosts.reduce((sum, p) => sum + p.retweetsCount, 0) / myPosts.length) : 0,
  }
  
  console.log('Statistics:', stats)
  
  // トップパフォーマンス投稿
  const topByLikes = myPosts.sort((a, b) => b.likesCount - a.likesCount).slice(0, 10)
  const topByImpressions = myPosts.sort((a, b) => b.impressionsCount - a.impressionsCount).slice(0, 10)
  
  console.log('\nTop 5 posts by likes:')
  topByLikes.slice(0, 5).forEach((p, i) => {
    console.log(`${i + 1}. [${p.likesCount} likes] ${p.content.substring(0, 50)}...`)
  })
  
  return { stats, topByLikes, topByImpressions }
}

// メイン処理
async function main() {
  try {
    // ユーザー名を設定（大屋友紀雄さんのアカウント）
    const username = process.argv[2] || 'opi_jp' // 実際のユーザー名に変更してください
    const limit = parseInt(process.argv[3]) || 200 // デフォルト200件
    
    console.log(`=== Importing tweets for @${username} ===`)
    console.log(`Limit: ${limit} tweets\n`)
    
    // ツイート取得
    const tweets = await fetchMyTweets(username, limit)
    
    if (tweets.length === 0) {
      console.log('No tweets found')
      return
    }
    
    // 保存
    const { saved, skipped } = await saveTweets(tweets, username)
    
    console.log(`\n=== Import Summary ===`)
    console.log(`Total fetched: ${tweets.length}`)
    console.log(`Saved: ${saved}`)
    console.log(`Skipped: ${skipped}`)
    
    // 分析データ作成
    const analytics = await createAnalyticsData(username)
    
    console.log('\n=== Ready for Analytics! ===')
    console.log('You can now use the analytics page to view insights about your tweets.')
    
  } catch (error) {
    console.error('Error in main:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 実行
main()