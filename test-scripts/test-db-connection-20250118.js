#!/usr/bin/env node

const { PrismaClient } = require('../lib/generated/prisma')

async function testDbConnection() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔄 データベース接続テスト中...\n')
    
    // 接続テスト
    await prisma.$connect()
    console.log('✅ データベースに接続成功！\n')
    
    // テーブル情報を取得
    console.log('📊 データ統計:')
    
    // ViralSessionの件数
    const viralSessionCount = await prisma.viralSession.count()
    console.log(`  - ViralSession: ${viralSessionCount}件`)
    
    // 各フェーズのデータがある件数
    const phase1Count = await prisma.viralSession.count({
      where: { phase1Data: { not: null } }
    })
    const phase2Count = await prisma.viralSession.count({
      where: { phase2Data: { not: null } }
    })
    const phase3Count = await prisma.viralSession.count({
      where: { phase3Data: { not: null } }
    })
    
    console.log(`    - Phase1データあり: ${phase1Count}件`)
    console.log(`    - Phase2データあり: ${phase2Count}件`)
    console.log(`    - Phase3データあり: ${phase3Count}件`)
    
    // ViralDraftV2の件数
    const draftCount = await prisma.viralDraftV2.count()
    console.log(`  - ViralDraftV2: ${draftCount}件`)
    
    // Userの件数
    const userCount = await prisma.user.count()
    console.log(`  - User: ${userCount}件`)
    
    // 最新のセッションを1件取得
    const latestSession = await prisma.viralSession.findFirst({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        theme: true,
        status: true,
        createdAt: true
      }
    })
    
    if (latestSession) {
      console.log('\n📌 最新のセッション:')
      console.log(`  - ID: ${latestSession.id}`)
      console.log(`  - テーマ: ${latestSession.theme}`)
      console.log(`  - ステータス: ${latestSession.status}`)
      console.log(`  - 作成日時: ${latestSession.createdAt}`)
    }
    
  } catch (error) {
    console.error('❌ データベース接続エラー:', error.message)
    console.error('\n詳細:', error)
    
    // 環境変数の確認
    console.log('\n🔍 環境変数の確認:')
    console.log(`  DATABASE_URL: ${process.env.DATABASE_URL ? '設定済み' : '未設定'}`)
    console.log(`  DIRECT_URL: ${process.env.DIRECT_URL ? '設定済み' : '未設定'}`)
  } finally {
    await prisma.$disconnect()
    console.log('\n✅ データベース接続を切断しました')
  }
}

testDbConnection()