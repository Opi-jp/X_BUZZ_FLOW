#!/usr/bin/env node

/**
 * セッションの詳細デバッグ
 */

const { PrismaClient } = require('../lib/generated/prisma')
const prisma = new PrismaClient()

async function debugSession(sessionId) {
  try {
    const session = await prisma.viralSession.findUnique({
      where: { id: sessionId },
      include: {
        drafts: true,
        characterProfile: true
      }
    })
    
    if (!session) {
      console.log('セッションが見つかりません')
      return
    }
    
    console.log('\n📊 セッション詳細:')
    console.log(`ID: ${session.id}`)
    console.log(`ステータス: ${session.status}`)
    console.log(`テーマ: ${session.theme}`)
    console.log(`作成日時: ${session.createdAt}`)
    
    console.log('\n📝 データフィールド:')
    console.log(`topics: ${session.topics ? `${session.topics.length}文字` : 'なし'}`)
    console.log(`concepts: ${session.concepts ? 'あり' : 'なし'}`)
    console.log(`selectedIds: ${session.selectedIds ? session.selectedIds.join(', ') : 'なし'}`)
    console.log(`contents: ${session.contents ? 'あり' : 'なし'}`)
    console.log(`characterProfileId: ${session.characterProfileId || 'なし'}`)
    
    console.log(`\n📋 下書き: ${session.drafts.length}件`)
    
    if (session.concepts) {
      console.log('\n🎯 コンセプト詳細:')
      try {
        const concepts = JSON.parse(session.concepts)
        console.log(`コンセプト数: ${concepts.length}`)
        concepts.forEach((concept, i) => {
          console.log(`\n[${i + 1}] ${concept.title || concept.hook || 'タイトルなし'}`)
          console.log(`  ID: ${concept.conceptId || concept.id || 'IDなし'}`)
        })
      } catch (e) {
        console.log('コンセプトのパースに失敗:', e.message)
      }
    }
    
  } catch (error) {
    console.error('エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

const sessionId = process.argv[2]
if (!sessionId) {
  console.log('使用方法: node debug-session.js <sessionId>')
  process.exit(1)
}

debugSession(sessionId)