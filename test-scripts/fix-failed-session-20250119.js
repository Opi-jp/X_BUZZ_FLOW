#!/usr/bin/env node

/**
 * 失敗したセッションのtopicsデータを修正して再実行
 */

const { PrismaClient } = require('../lib/generated/prisma')
const prisma = new PrismaClient()

async function fixFailedSession() {
  const sessionId = 'cmc403mbp000l1yai0d5oi1os'
  
  try {
    // 失敗したセッションを取得
    const session = await prisma.viralSession.findUnique({
      where: { id: sessionId }
    })
    
    if (!session) {
      console.error('Session not found')
      return
    }
    
    console.log('Current status:', session.status)
    console.log('Topics data length:', session.topics?.length)
    
    // topicsデータを修正（summaryフィールドを適切にクォート）
    if (session.topics) {
      console.log('\nFixing topics data...')
      
      // 正規表現で不適切な形式を修正
      let fixedTopics = session.topics
        // "summary": NTT Comは... -> "summary": "NTT Comは..."
        .replace(/"summary":\s*([^"{\[\],]+?),/g, '"summary": "$1",')
        // "summary": 日本IBMは... -> "summary": "日本IBMは..."
        .replace(/"summary":\s*([^"{\[\],]+?)\n/g, '"summary": "$1"\n')
      
      console.log('\nFixed topics preview:')
      console.log(fixedTopics.substring(0, 800))
      
      // 修正したデータで更新
      await prisma.viralSession.update({
        where: { id: sessionId },
        data: { 
          topics: fixedTopics,
          status: 'TOPICS_COLLECTED'  // ステータスも戻す
        }
      })
      
      console.log('\n✅ Topics data fixed and status reset to TOPICS_COLLECTED')
      console.log('You can now run the flow again to generate concepts.')
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixFailedSession()