#!/usr/bin/env node
/**
 * セッションの完了状態を確認
 */

const path = require('path')
const { PrismaClient } = require(path.join(__dirname, '../lib/generated/prisma'))
const prisma = new PrismaClient()

async function checkSession() {
  try {
    const sessionId = process.argv[2] || 'cmc3h28l000041yvqswou3421'
    
    const session = await prisma.viralSession.findUnique({
      where: { id: sessionId },
      include: {
        _count: {
          select: { 
            drafts: true 
          }
        }
      }
    })
    
    if (session) {
      console.log('📊 セッション状態:')
      console.log(`ID: ${session.id}`)
      console.log(`テーマ: ${session.theme}`)
      console.log(`ステータス: ${session.status}`)
      console.log(`トピック: ${session.topics ? '✅' : '❌'}`)
      console.log(`コンセプト: ${session.concepts ? '✅' : '❌'}`)
      console.log(`選択済みID: ${session.selectedIds?.length || 0}個`)
      console.log(`コンテンツ: ${session.contents ? '✅' : '❌'}`)
      console.log(`下書き数: ${session._count.drafts}個`)
      
      // 下書きも確認
      if (session._count.drafts > 0) {
        const drafts = await prisma.viralDraftV2.findMany({
          where: { sessionId: session.id },
          select: {
            id: true,
            title: true,
            characterId: true,
            status: true,
            content: true
          }
        })
        
        console.log('\n📝 下書き一覧:')
        drafts.forEach((draft, index) => {
          console.log(`${index + 1}. ${draft.title || 'タイトルなし'}`)
          console.log(`   キャラクター: ${draft.characterId}`)
          console.log(`   内容: ${draft.content.substring(0, 50)}...`)
        })
      }
    } else {
      console.log('セッションが見つかりません')
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkSession()