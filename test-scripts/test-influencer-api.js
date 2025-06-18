// インフルエンサーAPI のテストスクリプト

const BASE_URL = 'http://localhost:3000'

async function testInfluencerAPIs() {
  console.log('=== インフルエンサーAPI テスト開始 ===')
  
  try {
    // 1. インフルエンサー一覧の取得
    console.log('\n1. インフルエンサー一覧を取得中...')
    const listResponse = await fetch(`${BASE_URL}/api/buzz/influencers?category=ai&period=7d&sortBy=viral&limit=5`)
    const listData = await listResponse.json()
    
    console.log(`取得結果: ${listData.influencers?.length || 0}件のインフルエンサー`)
    
    if (listData.influencers && listData.influencers.length > 0) {
      console.log('\nトップ3インフルエンサー:')
      listData.influencers.slice(0, 3).forEach((inf, idx) => {
        console.log(`  ${idx + 1}. @${inf.username}`)
        console.log(`     - フォロワー: ${inf.followers?.toLocaleString() || 0}`)
        console.log(`     - エンゲージメント率: ${inf.engagementRate?.toFixed(2) || 0}%`)
        console.log(`     - バイラルスコア: ${inf.viralScore?.toFixed(1) || 'N/A'}`)
      })
      
      // 2. 個別インフルエンサーの詳細取得
      const topUsername = listData.influencers[0].username
      console.log(`\n2. @${topUsername} の詳細情報を取得中...`)
      
      const detailResponse = await fetch(`${BASE_URL}/api/buzz/influencers/${topUsername}`)
      const detailData = await detailResponse.json()
      
      if (detailData.user) {
        console.log('\n詳細情報:')
        console.log(`  総投稿数: ${detailData.stats.totalPosts}`)
        console.log(`  総いいね数: ${detailData.stats.totalLikes?.toLocaleString()}`)
        console.log(`  総RT数: ${detailData.stats.totalRetweets?.toLocaleString()}`)
        console.log(`  平均エンゲージメント率: ${detailData.stats.engagementRate?.toFixed(2)}%`)
        
        if (detailData.categoryStats && detailData.categoryStats.length > 0) {
          console.log('\nカテゴリ別投稿:')
          detailData.categoryStats.forEach(cat => {
            console.log(`  - ${cat.category}: ${cat.postCount}投稿`)
          })
        }
      }
    }
    
    // 3. インフルエンサー比較
    console.log('\n3. インフルエンサー比較テスト...')
    const compareUsernames = listData.influencers?.slice(0, 3).map(i => i.username) || []
    
    if (compareUsernames.length >= 2) {
      const compareResponse = await fetch(`${BASE_URL}/api/buzz/influencers/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernames: compareUsernames })
      })
      const compareData = await compareResponse.json()
      
      if (compareData.comparisons) {
        console.log(`\n${compareData.comparisons.length}人の比較結果:`)
        console.log('\nフォロワー数ランキング:')
        compareData.rankings?.byFollowers?.forEach((user, idx) => {
          console.log(`  ${idx + 1}. @${user.username}: ${user.followers?.toLocaleString()}`)
        })
      }
    }
    
    // 4. おすすめインフルエンサー
    console.log('\n4. おすすめインフルエンサーを取得中...')
    const recommendResponse = await fetch(`${BASE_URL}/api/buzz/influencers/recommendations?interests=ai,work&limit=5`)
    const recommendData = await recommendResponse.json()
    
    if (recommendData.recommendations) {
      console.log(`\n${recommendData.recommendations.length}件のおすすめ:`)
      recommendData.recommendations.forEach((rec, idx) => {
        console.log(`\n  ${idx + 1}. @${rec.username}`)
        console.log(`     理由: ${rec.recommendationReason}`)
        console.log(`     マッチした興味: ${rec.matchedInterests?.join(', ')}`)
      })
    }
    
  } catch (error) {
    console.error('\nエラーが発生しました:', error)
  }
  
  console.log('\n=== テスト完了 ===')
}

// 実行
testInfluencerAPIs().catch(console.error)