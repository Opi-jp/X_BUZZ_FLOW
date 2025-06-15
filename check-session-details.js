#!/usr/bin/env node

const { PrismaClient } = require('./app/generated/prisma')

const prisma = new PrismaClient()

async function checkSessionDetails(sessionId) {
  try {
    const session = await prisma.cotSession.findUnique({
      where: { id: sessionId }
    })
    
    if (!session) {
      console.log('セッションが見つかりません')
      return
    }
    
    console.log('📊 セッション詳細:')
    console.log(`   ID: ${session.id}`)
    console.log(`   expertise: ${session.expertise}`)
    console.log(`   style: ${session.style}`)
    console.log(`   platform: ${session.platform}`)
    console.log(`   status: ${session.status}`)
    console.log(`   lastError: ${session.lastError}`)
    
  } catch (error) {
    console.error('エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// セッションIDを引数から取得
const sessionId = process.argv[2]
if (sessionId) {
  checkSessionDetails(sessionId)
} else {
  console.log('使用方法: node check-session-details.js <sessionId>')
}