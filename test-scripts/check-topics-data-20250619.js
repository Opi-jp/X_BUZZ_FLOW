#!/usr/bin/env node

/**
 * セッションのtopicsデータを確認
 */

const { PrismaClient } = require('../lib/generated/prisma')
const prisma = new PrismaClient()

async function checkTopicsData(sessionId) {
  try {
    const session = await prisma.viralSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        theme: true,
        topics: true,
        status: true
      }
    })
    
    if (!session) {
      console.log('セッションが見つかりません')
      return
    }
    
    console.log('\n📊 セッション情報:')
    console.log(`ID: ${session.id}`)
    console.log(`テーマ: ${session.theme}`)
    console.log(`ステータス: ${session.status}`)
    
    if (session.topics) {
      console.log(`\n📝 Topicsデータ:`)
      console.log(`文字数: ${session.topics.length}`)
      console.log('\n--- 最初の500文字 ---')
      console.log(session.topics.substring(0, 500))
      console.log('\n--- 最後の500文字 ---')
      console.log(session.topics.substring(session.topics.length - 500))
      
      // JSONとして解析を試みる
      console.log('\n🔍 JSON解析テスト:')
      try {
        const parsed = JSON.parse(session.topics)
        console.log('✅ 有効なJSON')
        console.log('構造:', Object.keys(parsed))
      } catch (e) {
        console.log('❌ JSONではない（Markdown形式の可能性）')
        
        // Markdownコードブロックを探す
        const jsonMatch = session.topics.match(/```json\s*([\s\S]*?)```/i)
        if (jsonMatch) {
          console.log('\n✅ JSONコードブロック発見')
          try {
            const jsonContent = jsonMatch[1].trim()
            const parsed = JSON.parse(jsonContent)
            console.log('JSONパース成功:', Object.keys(parsed))
          } catch (e2) {
            console.log('JSONパース失敗:', e2.message)
          }
        } else {
          console.log('JSONコードブロックが見つかりません')
        }
      }
    } else {
      console.log('\nTopicsデータがありません')
    }
    
  } catch (error) {
    console.error('エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

const sessionId = process.argv[2] || 'cmc403mbp000l1yai0d5oi1os'
checkTopicsData(sessionId)