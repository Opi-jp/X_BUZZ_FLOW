#!/usr/bin/env node

/**
 * 予期しないフィールドを削除
 * 
 * 生成日時: 2025-06-18T19:53:50.282Z
 * プロンプトファイル: cleanup-unexpected-fields.js
 */

const { PrismaClient } = require('../../../lib/generated/prisma')
const prisma = new PrismaClient()


// 予期しないフィールドのクリーンアップ
async function cleanupUnexpectedFields() {
  const sessions = await prisma.viralSession.findMany({
    where: { 
      OR: [
        { topics: { not: null } },
        { concepts: { not: null } },
        { contents: { not: null } }
      ]
    }
  })
  
  const unexpectedFields = [
  "hook",
  "topicUrl",
  "keyPoints",
  "topicTitle",
  "topicSummary",
  "structure"
]
  const expectedFieldsByPhase = {
    topics: [
      'TOPIC', 'title', 'source', 'url', 'date', 
      'summary', 'keyPoints', 'perplexityAnalysis',
      'additionalSources'
    ],
    concepts: [
      'conceptId', 'conceptTitle', 'format', 'hookType', 
      'hookCombination', 'angle', 'angleCombination',
      'angleRationale', 'viralScore', 'viralFactors',
      'structure', 'visual', 'timing', 'hashtags'
    ],
    contents: [
      'content', 'format', 'post1', 'post2', 'post3', 
      'post4', 'post5', 'generateContents'
    ]
  }
  
  // structure内の期待されるフィールド
  const expectedStructureFields = [
    'openingHook', 'background', 'mainContent', 
    'reflection', 'cta'
  ]
  
  for (const session of sessions) {
    let updated = false
    const updates = {}
    
    // 各フェーズのデータをチェック
    ['topics', 'concepts', 'contents'].forEach(phase => {
      if (session[phase]) {
        const expectedFields = expectedFieldsByPhase[phase]
        
        // クリーンアップ関数
        function cleanupFields(obj, isStructure = false) {
          if (Array.isArray(obj)) {
            return obj.map(item => cleanupFields(item, false))
          }
          if (obj && typeof obj === 'object') {
            const newObj = {}
            const fieldsToCheck = isStructure ? expectedStructureFields : expectedFields
            
            for (const [key, value] of Object.entries(obj)) {
              // 特別なケース: structureフィールドは保持し、その中身をクリーンアップ
              if (key === 'structure' && phase === 'concepts') {
                newObj[key] = cleanupFields(value, true)
              }
              // 特別なケース: generateContentsフィールドは保持
              else if (key === 'generateContents' && phase === 'contents') {
                newObj[key] = value
              }
              // 期待されるフィールドのみ保持
              else if (fieldsToCheck.includes(key)) {
                newObj[key] = value
              }
              // structure.field形式のチェック（ドット記法）
              else if (!isStructure && key.startsWith('structure.')) {
                // structure.fieldはトップレベルでは削除
                console.log(`  Removing unexpected field: ${key} from ${phase}`)
              } else {
                // 予期しないフィールドは削除
                console.log(`  Removing unexpected field: ${key} from ${phase}`)
              }
            }
            return newObj
          }
          return obj
        }
        
        const cleanedPhase = cleanupFields(session[phase])
        if (JSON.stringify(cleanedPhase) !== JSON.stringify(session[phase])) {
          updates[phase] = cleanedPhase
          updated = true
        }
      }
    })
    
    if (updated) {
      await prisma.viralSession.update({
        where: { id: session.id },
        data: updates
      })
      console.log(`Cleaned up unexpected fields in session ${session.id}`)
    }
  }
  
  console.log('\nCleanup complete!')
  console.log('Removed fields:', unexpectedFields)
}

// メイン実行
async function main() {
  console.log('🚀 マイグレーション開始: 予期しないフィールドを削除')
  
  try {
    await cleanupUnexpectedFields()
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
