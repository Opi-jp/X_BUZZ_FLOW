#!/usr/bin/env node
/**
 * Perplexityの実際の返却結果を確認
 */

const path = require('path')
const { PrismaClient } = require(path.join(__dirname, '../lib/generated/prisma'))
const prisma = new PrismaClient()

async function checkPerplexityResult() {
  try {
    // 最新のセッションのtopicsを取得
    const sessions = await prisma.viralSession.findMany({
      where: {
        topics: { not: null }
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        id: true,
        theme: true,
        topics: true,
        createdAt: true,
        status: true
      }
    })
    
    console.log(`📊 Perplexityの実際の結果 (最新${sessions.length}件)\n`)
    
    for (const session of sessions) {
      console.log('='.repeat(80))
      console.log(`セッションID: ${session.id}`)
      console.log(`テーマ: ${session.theme}`)
      console.log(`作成日時: ${session.createdAt}`)
      console.log(`ステータス: ${session.status}`)
      console.log(`\n📝 Perplexityからの返却内容:`)
      console.log('-'.repeat(80))
      
      // topicsの内容を表示（最初の1000文字）
      const topics = session.topics || ''
      console.log(topics.substring(0, 1000))
      
      if (topics.length > 1000) {
        console.log(`\n... (全${topics.length}文字、残り${topics.length - 1000}文字は省略)`);
      }
      
      // JSON形式かチェック
      console.log('\n📋 形式分析:')
      const hasJsonBlocks = topics.includes('```json')
      const hasTopic1 = topics.includes('TOPIC') || topics.includes('topic1')
      const hasUrl = topics.includes('url":')
      
      console.log(`- JSON形式: ${hasJsonBlocks ? '✅' : '❌'}`)
      console.log(`- トピック構造: ${hasTopic1 ? '✅' : '❌'}`)
      console.log(`- URL含む: ${hasUrl ? '✅' : '❌'}`)
      console.log()
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkPerplexityResult()