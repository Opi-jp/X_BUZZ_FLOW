#!/usr/bin/env node
/**
 * Perplexityの完全な出力を表示（エディター風）
 */

const path = require('path')
const { PrismaClient } = require(path.join(__dirname, '../lib/generated/prisma'))
const prisma = new PrismaClient()

async function showPerplexityOutput() {
  try {
    // 最新のセッションを取得（父の日が含まれているもの）
    const sessions = await prisma.viralSession.findMany({
      where: {
        topics: { not: null },
        OR: [
          { theme: { contains: 'テスト' } },
          { theme: { contains: 'API' } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        theme: true,
        topics: true,
        createdAt: true
      }
    })
    
    for (const session of sessions) {
      if (session.topics && session.topics.includes('父の日')) {
        console.log('=' .repeat(80))
        console.log(`📅 作成日時: ${session.createdAt}`)
        console.log(`📌 テーマ: ${session.theme}`)
        console.log(`🎯 プラットフォーム: Twitter`)
        console.log(`🎨 スタイル: エンターテイメント`)
        console.log(`🆔 セッションID: ${session.id}`)
        console.log('=' .repeat(80))
        console.log('\n【Perplexityからの完全な出力】\n')
        console.log(session.topics)
        console.log('\n' + '=' .repeat(80) + '\n')
        break
      }
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

showPerplexityOutput()