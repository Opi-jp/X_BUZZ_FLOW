import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const checks = {
    env: {
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      CLAUDE_API_KEY: !!process.env.CLAUDE_API_KEY,
      DATABASE_URL: !!process.env.DATABASE_URL,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL
    },
    database: {
      connected: false,
      tables: {}
    }
  }

  // データベース接続テスト
  try {
    // 簡単なクエリでデータベース接続を確認
    await prisma.$queryRaw`SELECT 1`
    checks.database.connected = true

    // テーブルの存在確認
    try {
      const viralOpportunities = await prisma.$queryRaw`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_name = 'viral_opportunities'
      `
      checks.database.tables.viral_opportunities = (viralOpportunities as any)[0].count > 0
    } catch (e) {
      checks.database.tables.viral_opportunities = false
    }

    try {
      const buzzPosts = await prisma.$queryRaw`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_name = 'buzz_posts'
      `
      checks.database.tables.buzz_posts = (buzzPosts as any)[0].count > 0
    } catch (e) {
      checks.database.tables.buzz_posts = false
    }

    try {
      const newsArticles = await prisma.$queryRaw`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_name = 'news_articles'
      `
      checks.database.tables.news_articles = (newsArticles as any)[0].count > 0
    } catch (e) {
      checks.database.tables.news_articles = false
    }

  } catch (error) {
    checks.database.connected = false
    checks.database.error = error instanceof Error ? error.message : 'Unknown error'
  }

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    checks
  })
}