import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// データの状況を確認するデバッグAPI
export async function GET(request: NextRequest) {
  try {
    // 各テーブルのデータ数を取得
    const [
      buzzPostsCount,
      newsArticlesCount,
      scheduledPostsCount,
      collectionPresetsCount,
      newsSourcesCount
    ] = await Promise.all([
      prisma.buzzPost.count(),
      prisma.newsArticle.count(),
      prisma.scheduledPost.count(),
      prisma.collectionPreset.count(),
      prisma.newsSource.count()
    ])

    // 最新のデータを取得
    const [
      latestBuzzPosts,
      latestNewsArticles,
      latestScheduledPosts
    ] = await Promise.all([
      prisma.buzzPost.findMany({
        orderBy: { collectedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          content: true,
          authorUsername: true,
          likesCount: true,
          collectedAt: true,
          theme: true
        }
      }),
      prisma.newsArticle.findMany({
        orderBy: { publishedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          sourceId: true,
          publishedAt: true,
          importance: true
        }
      }),
      prisma.scheduledPost.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          content: true,
          status: true,
          scheduledTime: true,
          createdAt: true
        }
      })
    ])

    // アクティブなプリセットを取得
    const activePresets = await prisma.collectionPreset.findMany({
      where: { isActive: true },
      select: {
        name: true,
        query: true,
        category: true
      }
    })

    return NextResponse.json({
      success: true,
      summary: {
        buzzPosts: {
          total: buzzPostsCount,
          latest: latestBuzzPosts.length > 0 ? latestBuzzPosts[0].collectedAt : null
        },
        newsArticles: {
          total: newsArticlesCount,
          latest: latestNewsArticles.length > 0 ? latestNewsArticles[0].publishedAt : null
        },
        scheduledPosts: {
          total: scheduledPostsCount,
          pending: await prisma.scheduledPost.count({ where: { status: 'DRAFT' } })
        },
        collectionPresets: {
          total: collectionPresetsCount,
          active: activePresets.length
        },
        newsSources: {
          total: newsSourcesCount,
          active: await prisma.newsSource.count({ where: { active: true } })
        }
      },
      data: {
        latestBuzzPosts,
        latestNewsArticles,
        latestScheduledPosts,
        activePresets
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Data status error:', error)
    return NextResponse.json(
      { error: 'データ状況の取得でエラーが発生しました' },
      { status: 500 }
    )
  }
}