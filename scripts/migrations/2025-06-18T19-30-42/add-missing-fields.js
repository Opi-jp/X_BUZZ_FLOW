#!/usr/bin/env node

/**
 * 不足フィールドを追加
 * 
 * 生成日時: 2025-06-18T19:30:42.387Z
 * プロンプトファイル: add-missing-fields.js
 */

const { PrismaClient } = require('../../../lib/generated/prisma')
const prisma = new PrismaClient()


// 不足フィールドの追加
async function addMissingFields() {
  const sessions = await prisma.viralSession.findMany({
    where: { 
      OR: [
        { topics: { not: null } },
        { concepts: { not: null } },
        { contents: { not: null } }
      ]
    }
  })
  
  for (const session of sessions) {
    let updated = false
    const updates = {}
    
    // Phase1の不足フィールド補完
    if (session.topics) {
      updates.topics = session.topics.map(topic => ({
        ...topic,
        TOPIC: topic.TOPIC || topic.title || 'トピック',
        additionalSources: topic.additionalSources || []
      }))
      updated = true
    }
    
    // Phase2の不足フィールド補完
    if (session.concepts) {
      updates.concepts = session.concepts.map(concept => ({
        ...concept,
        viralScore: concept.viralScore ?? 75,
        viralFactors: concept.viralFactors || [],
        angleRationale: concept.angleRationale || '効果的な角度です'
      }))
      updated = true
    }
    
    if (updated) {
      await prisma.viralSession.update({
        where: { id: session.id },
        data: updates
      })
      console.log(`Added missing fields to session ${session.id}`)
    }
  }
}

// メイン実行
async function main() {
  console.log('🚀 マイグレーション開始: 不足フィールドを追加')
  
  try {
    await addMissingFields()
    console.log('✅ マイグレーション完了')
  } catch (error) {
    console.error('❌ マイグレーションエラー:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main()
}
