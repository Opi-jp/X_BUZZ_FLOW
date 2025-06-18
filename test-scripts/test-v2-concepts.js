#!/usr/bin/env node

/**
 * V2プロンプトのコンセプト生成テスト
 * 既存のセッションを使って新しいプロンプトをテスト
 */

require('dotenv').config({ path: '.env.local' })
const { PrismaClient } = require('../lib/generated/prisma')

const prisma = new PrismaClient()

async function testV2Concepts() {
  const baseUrl = 'http://localhost:3000'
  
  try {
    console.log('🧪 V2コンセプト生成テスト開始')
    console.log('==========================\n')
    
    // 既存セッションを探す
    const existingSession = await prisma.viralSession.findFirst({
      where: {
        theme: 'AIと働き方',
        status: 'TOPICS_COLLECTED',
        topics: { not: null }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    if (!existingSession) {
      console.log('トピック収集済みのセッションが見つかりません。')
      console.log('新しいセッションを作成してください。')
      process.exit(1)
    }
    
    console.log(`✅ 既存セッション発見: ${existingSession.id}`)
    console.log(`   ステータス: ${existingSession.status}`)
    const topics = existingSession.topics?.parsed || []
    console.log(`   トピック数: ${topics.length}`)
    
    topics.forEach((topic, i) => {
      console.log(`\n   📌 トピック${i + 1}: ${topic.TOPIC}`)
      console.log(`      URL: ${topic.url}`)
    })
    
    // コンセプト生成
    console.log('\n\n3️⃣ 新プロンプトでコンセプト生成中...')
    const conceptsResponse = await fetch(`${baseUrl}/api/viral/v2/sessions/${existingSession.id}/generate-concepts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    
    if (!conceptsResponse.ok) {
      const error = await conceptsResponse.text()
      throw new Error(`コンセプト生成失敗: ${error}`)
    }
    
    const conceptsData = await conceptsResponse.json()
    const concepts = conceptsData.session.concepts || []
    console.log(`\n✅ コンセプト生成成功: ${concepts.length}件`)
    
    // 新しいフィールドの確認
    concepts.forEach((concept, i) => {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      console.log(`🎯 コンセプト${i + 1}: ${concept.conceptTitle || '❌ タイトルなし'}`)
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      console.log(`   ID: ${concept.conceptId}`)
      console.log(`   形式: ${concept.format} ${concept.format === 'carousel' ? '⚠️  (カルーセルは廃止予定)' : '✅'}`)
      console.log(`   フック: ${concept.hookType} (${concept.hookCombination?.join(' + ') || 'なし'})`)
      console.log(`   角度: ${concept.angle} (${concept.angleCombination?.join(' + ') || 'なし'})`)
      console.log(`   理由: ${concept.angleRationale}`)
      console.log(`   バイラルスコア: ${concept.viralScore}`)
      console.log(`   バイラル要因: ${concept.viralFactors?.join(', ') || 'なし'}`)
      
      if (concept.structure) {
        console.log(`\n   📝 投稿構造:`)
        console.log(`      1. オープニング: ${concept.structure.openingHook}`)
        console.log(`      2. 背景: ${concept.structure.background}`)
        console.log(`      3. 中身: ${concept.structure.mainContent}`)
        console.log(`      4. 内省: ${concept.structure.reflection}`)
        console.log(`      5. CTA: ${concept.structure.cta}`)
      }
      
      console.log(`\n   🎨 ビジュアル: ${concept.visual || 'なし'}`)
      console.log(`   ⏰ タイミング: ${concept.timing || 'なし'}`)
      console.log(`   #️⃣ ハッシュタグ: ${concept.hashtags?.join(' ') || 'なし'}`)
    })
    
    // プロンプト改善の確認
    console.log('\n\n📊 プロンプト改善の確認:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    // conceptTitleの存在確認
    const hasConceptTitle = concepts.every(c => c.conceptTitle && c.conceptTitle.length > 0)
    console.log(`✅ conceptTitle: ${hasConceptTitle ? '全て生成済み' : '❌ 一部または全て欠損'}`)
    
    // formatの種類確認
    const formats = new Set(concepts.map(c => c.format))
    console.log(`✅ format種類: ${Array.from(formats).join(', ')}`)
    if (formats.has('carousel')) {
      console.log('   ⚠️  carouselは廃止予定です')
    }
    
    // 角度の多様性確認
    const angles = new Set(concepts.map(c => c.angle))
    console.log(`✅ 角度の多様性: ${angles.size}種類 (${Array.from(angles).join(', ')})`)
    
    // angleRationaleの形式選択理由確認
    const hasFormatRationale = concepts.some(c => 
      c.angleRationale && (c.angleRationale.includes('single') || c.angleRationale.includes('thread'))
    )
    console.log(`✅ 形式選択理由: ${hasFormatRationale ? '含まれている' : '❌ 含まれていない'}`)
    
    console.log('\n✨ テスト完了！')
    
  } catch (error) {
    console.error('\n❌ エラー:', error.message)
    console.error(error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

// 実行
testV2Concepts()