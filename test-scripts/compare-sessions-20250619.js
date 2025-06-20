#!/usr/bin/env node

/**
 * 成功セッションと失敗セッションを比較
 */

const { PrismaClient } = require('../lib/generated/prisma')
const prisma = new PrismaClient()

async function compareSessions() {
  try {
    // 成功したセッション
    const successSession = await prisma.viralSession.findUnique({
      where: { id: 'cmc3zrryn000d1yaipzp30ach' }
    })
    
    // 失敗したセッション
    const failedSession = await prisma.viralSession.findUnique({
      where: { id: 'cmc403mbp000l1yai0d5oi1os' }
    })
    
    console.log('\n✅ 成功セッション:')
    console.log(`ステータス: ${successSession.status}`)
    console.log(`topics形式:`)
    console.log(successSession.topics.substring(0, 200))
    
    console.log('\n❌ 失敗セッション:')
    console.log(`ステータス: ${failedSession.status}`)
    console.log(`topics形式:`)
    console.log(failedSession.topics.substring(0, 200))
    
    // JSON構造の違いを確認
    console.log('\n🔍 JSON構造の比較:')
    
    // 成功セッションのtopics
    const successMatch = successSession.topics.match(/```json\s*([\s\S]*?)```/i)
    if (successMatch) {
      console.log('成功セッション: JSONブロックあり')
    } else {
      console.log('成功セッション: JSONブロックなし（純粋なJSON？）')
    }
    
    // 失敗セッションのtopics
    const failedMatch = failedSession.topics.match(/```json\s*([\s\S]*?)```/i)
    if (failedMatch) {
      console.log('失敗セッション: JSONブロックあり')
    }
    
  } catch (error) {
    console.error('エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

compareSessions()