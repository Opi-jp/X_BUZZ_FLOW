import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getKaitoSinceParam } from '@/lib/date-utils'

// Kaito API (Apify) の設定 - 新しいTwitterスクレイパーを使用
const KAITO_API_URL = 'https://api.apify.com/v2/acts/kaitoeasyapi~twitter-x-data-tweet-scraper-pay-per-result-cheapest/runs'

// POST: Kaito APIを使ってバズ投稿を収集
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, minLikes = 1000, minRetweets = 100, minEngagementRate = 0, maxItems = 20, date, excludeReplies = true } = body

    // 日付フィルター（指定された場合）
    const dateFilter = date ? {
      since: getKaitoSinceParam(date)
    } : {}

    // クエリが「from:」で始まる場合はユーザータイムライン取得
    const isUserTimeline = query.startsWith('from:')
    // クエリに既にmin_faves:が含まれているかチェック
    const hasMinFaves = query.includes('min_faves:')
    const hasMinRetweets = query.includes('min_retweets:')
    
    // バズ戦略に基づいたクエリ最適化
    let optimizedQuery = query
    if (!isUserTimeline) {
      // min_favesが含まれていない場合のみ追加
      if (!hasMinFaves) {
        optimizedQuery += ` min_faves:${minLikes}`
      }
      // min_retweetsが含まれていない場合のみ追加
      if (!hasMinRetweets) {
        optimizedQuery += ` min_retweets:${minRetweets}`
      }
      // リツイート除外
      if (!query.includes('-is:retweet')) {
        optimizedQuery += ' -is:retweet'
      }
      // 日本語指定
      if (!query.includes('lang:')) {
        optimizedQuery += ' lang:ja'
      }
      // プロフィール検索を除外（投稿内容のみを対象に）
      if (!query.includes('-filter:profile_region')) {
        optimizedQuery += ' -filter:profile_region'
      }
    }
    
    const requestBody = isUserTimeline ? {
      twitterContent: query,
      maxItems,
      lang: 'ja',
      'filter:replies': false,
      'filter:nativeretweets': false,
      queryType: 'Latest',
      ...dateFilter
    } : {
      twitterContent: optimizedQuery,
      maxItems,
      lang: 'ja',
      'filter:replies': false,
      'filter:blue_verified': false,
      'filter:nativeretweets': false,
      queryType: 'Latest',
      ...dateFilter
    }

    console.log('Kaito API Request:', requestBody)
    
    // Kaito API呼び出し
    const response = await fetch(`${KAITO_API_URL}?token=${process.env.KAITO_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Kaito API Error Response:', errorText)
      throw new Error(`Kaito API error: ${response.statusText}`)
    }

    const data = await response.json()
    const runId = data.data.id

    // 実行結果を取得（ポーリング）
    let results = null
    let retries = 0
    const maxRetries = 30 // 最大30秒待機

    while (retries < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 1000)) // 1秒待機
      
      const resultResponse = await fetch(
        `https://api.apify.com/v2/acts/kaitoeasyapi~twitter-x-data-tweet-scraper-pay-per-result-cheapest/runs/${runId}?token=${process.env.KAITO_API_KEY}`
      )
      
      const runData = await resultResponse.json()
      console.log(`Run status: ${runData.data.status}`)
      
      if (runData.data.status === 'SUCCEEDED') {
        const datasetId = runData.data.defaultDatasetId
        const itemsResponse = await fetch(
          `https://api.apify.com/v2/datasets/${datasetId}/items?token=${process.env.KAITO_API_KEY}`
        )
        results = await itemsResponse.json()
        console.log(`Found ${results.length} items`)
        break
      } else if (runData.data.status === 'FAILED') {
        console.error('Kaito API run failed. Run details:', runData.data)
        const statusMessage = runData.data.statusMessage || 'Unknown error'
        
        // Twitterのログイン制限エラーをチェック
        if (statusMessage.includes('Twitter put all content behind login')) {
          throw new Error('Twitter APIの制限: 2023年6月30日以降、Twitterはログインを必要とするようになりました。現在、この収集方法は利用できません。')
        }
        
        throw new Error(`Kaito API run failed: ${statusMessage}`)
      }
      
      retries++
    }

    if (!results) {
      throw new Error('Kaito API timeout')
    }

    // 取得したデータをデータベースに保存（新しいフォーマットに対応）
    const savedPosts = []
    let skippedCount = 0
    let existingCount = 0
    
    console.log('Processing tweets:', results.length)
    console.log('DB URL:', process.env.DATABASE_URL?.substring(0, 50) + '...')
    
    for (const tweet of results) {
      try {
        // デバッグ: 最初の3件の詳細を出力
        if (savedPosts.length < 3) {
          console.log('Tweet data:', {
            id: tweet.id,
            text: tweet.text?.substring(0, 50),
            author: tweet.author?.userName,
            hasId: !!tweet.id,
            idType: typeof tweet.id
          })
        }
        
        // リプライを除外（excludeRepliesがtrueの場合）
        if (excludeReplies && tweet.text && tweet.text.trim().startsWith('@')) {
          skippedCount++
          continue
        }
        
        // コンテンツの関連性チェック（クエリに特定のキーワードが含まれる場合）
        const contentText = tweet.text || ''
        const isWorkRelated = query.includes('働き方') || query.includes('キャリア') || query.includes('副業')
        const isAIRelated = query.includes('AI') || query.includes('ChatGPT') || query.includes('生成AI')
        
        if (isWorkRelated) {
          // 働き方関連のクエリの場合、アニメ・ゲーム・エンタメ系を除外
          const excludePatterns = ['ガンダム', 'アニメ', 'ゲーム', '声優', 'Vtuber', '配信', 'イラスト', '漫画']
          if (excludePatterns.some(pattern => contentText.includes(pattern))) {
            skippedCount++
            console.log(`Skipped non-work-related content: ${contentText.substring(0, 50)}...`)
            continue
          }
          
          // 働き方関連の必須キーワードチェック
          const workKeywords = ['働', '仕事', '副業', 'キャリア', 'フリーランス', 'リモート', '起業', '独立', '収入', '効率', '生産性']
          if (!workKeywords.some(keyword => contentText.includes(keyword))) {
            skippedCount++
            console.log(`Skipped: no work-related keywords found`)
            continue
          }
        }
        
        if (isAIRelated) {
          // AI関連のクエリの場合、実質的な内容を含むかチェック
          const aiKeywords = ['AI', 'ChatGPT', 'Claude', '生成AI', 'LLM', 'プロンプト', '活用', '効率化', '自動化']
          const hasAIContent = aiKeywords.some(keyword => contentText.includes(keyword))
          
          // URLのみや引用RTのみの投稿を除外
          const isJustLink = contentText.trim().length < 20 && contentText.includes('http')
          if (!hasAIContent || isJustLink) {
            skippedCount++
            console.log(`Skipped: insufficient AI-related content`)
            continue
          }
        }
        
        // エンゲージメント率の計算
        const impressions = tweet.viewCount || tweet.impressions_count || 0
        const likes = tweet.likeCount || tweet.favorite_count || 0
        const retweets = tweet.retweetCount || tweet.retweet_count || 0
        const replies = tweet.replyCount || tweet.reply_count || 0
        
        // バズ戦略：エンゲージメント率での追加フィルタリング
        if (impressions > 0) {
          const engagementRate = ((likes + retweets + replies) / impressions) * 100
          
          // デフォルトの最小エンゲージメント率を設定（0.5%）
          const effectiveMinEngagementRate = minEngagementRate > 0 ? minEngagementRate : 0.5
          
          if (engagementRate < effectiveMinEngagementRate) {
            skippedCount++
            console.log(`Low engagement rate: ${engagementRate.toFixed(2)}% (min: ${effectiveMinEngagementRate}%)`)
            continue
          }
        }
        
        // IDが存在しない場合はスキップ
        if (!tweet.id) {
          console.log('Tweet has no ID, skipping:', tweet)
          skippedCount++
          continue
        }
        
        const postId = String(tweet.id) // 念のため文字列に変換
        
        const existingPost = await prisma.buzzPost.findUnique({
          where: { postId: postId },
        })

        if (existingPost) {
          existingCount++
          console.log(`Tweet ${postId} already exists in DB`)
        } else {
          console.log(`Tweet ${postId} is new, saving...`)
          try {
            // エンゲージメント率を計算して保存
            const calculatedEngagementRate = impressions > 0 
              ? ((likes + retweets + replies) / impressions) * 100 
              : 0
            
            // バズ戦略タグの判定
            const buzzTags = []
            if (likes >= 10000) buzzTags.push('mega_buzz')
            else if (likes >= 5000) buzzTags.push('high_buzz')
            else if (likes >= 1000) buzzTags.push('buzz')
            
            // 異常値系の判定
            if (tweet.text && (tweet.text.includes('万円') || tweet.text.includes('億'))) {
              buzzTags.push('anomaly_value')
            }
            
            // トレンドワードの判定
            const trendWords = ['ChatGPT', 'AI', '生成AI', 'Claude', 'GPT-4', 'Gemini']
            if (tweet.text && trendWords.some(word => tweet.text.includes(word))) {
              buzzTags.push('trend_word')
            }
            
            const post = await prisma.buzzPost.create({
              data: {
                postId: postId,
                content: tweet.text || '',
                authorUsername: tweet.author?.userName || tweet.author?.username || '',
                authorId: tweet.author?.id || '',
                authorFollowers: tweet.author?.followersCount || 0,
                authorFollowing: tweet.author?.followingCount || 0,
                authorVerified: tweet.author?.verified || null,
                likesCount: likes,
                retweetsCount: retweets,
                repliesCount: replies,
                impressionsCount: impressions,
                postedAt: new Date(tweet.createdAt || tweet.created_at),
                url: tweet.url || tweet.twitterUrl || `https://twitter.com/${tweet.author?.userName}/status/${tweet.id}`,
                theme: query,
                language: tweet.lang || 'ja',
                mediaUrls: tweet.extendedEntities?.media?.map((m: any) => m.media_url_https) || [],
                hashtags: [...(tweet.entities?.hashtags?.map((h: any) => h.text) || []), ...buzzTags],
              },
            })
            savedPosts.push(post)
            console.log(`Successfully saved tweet ${postId}`)
          } catch (error) {
            console.error('Error saving tweet:', {
              postId: postId,
              error: error instanceof Error ? error.message : error,
              stack: error instanceof Error ? error.stack : undefined
            })
          }
        }
      } catch (error) {
        console.error('Error processing tweet:', error)
      }
    }

    // 収集結果の分析
    const analysis = {
      totalTweets: results.length,
      saved: savedPosts.length,
      skipped: skippedCount,
      existing: existingCount,
      
      // エンゲージメント分析
      avgLikes: savedPosts.length > 0 
        ? Math.round(savedPosts.reduce((sum, p) => sum + p.likesCount, 0) / savedPosts.length)
        : 0,
      avgRetweets: savedPosts.length > 0
        ? Math.round(savedPosts.reduce((sum, p) => sum + p.retweetsCount, 0) / savedPosts.length)
        : 0,
      avgImpressions: savedPosts.length > 0
        ? Math.round(savedPosts.reduce((sum, p) => sum + p.impressionsCount, 0) / savedPosts.length)
        : 0,
      
      // バズレベル分析
      megaBuzz: savedPosts.filter(p => p.hashtags.includes('mega_buzz')).length,
      highBuzz: savedPosts.filter(p => p.hashtags.includes('high_buzz')).length,
      normalBuzz: savedPosts.filter(p => p.hashtags.includes('buzz')).length,
      
      // タイプ分析
      anomalyValue: savedPosts.filter(p => p.hashtags.includes('anomaly_value')).length,
      trendWord: savedPosts.filter(p => p.hashtags.includes('trend_word')).length,
    }
    
    console.log('Collection Analysis:', analysis)
    
    return NextResponse.json({
      collected: results.length,
      saved: savedPosts.length,
      skipped: skippedCount,
      existing: existingCount,
      posts: savedPosts,
      analysis,
    })
  } catch (error) {
    console.error('Error collecting posts:', error)
    return NextResponse.json(
      { error: 'Failed to collect posts' },
      { status: 500 }
    )
  }
}