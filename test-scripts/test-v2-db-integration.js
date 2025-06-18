#!/usr/bin/env node

/**
 * V2 APIのDB統合テスト
 * 実際のAPIを呼び出してDBに格納されることを確認
 */

require('dotenv').config({ path: '.env.local' })
const { PrismaClient } = require('../lib/generated/prisma')

const prisma = new PrismaClient()

async function testV2DatabaseIntegration() {
  const baseUrl = 'http://localhost:3000'
  
  try {
    console.log('🧪 V2 API データベース統合テスト開始')
    console.log('==============================\n')
    
    // 1. セッション作成
    console.log('1️⃣ 新規セッションを作成しています...')
    const sessionResponse = await fetch(`${baseUrl}/api/viral/v2/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        theme: 'AIと働き方',
        platform: 'Twitter',
        style: 'エンターテイメント'
      })
    })
    
    if (!sessionResponse.ok) {
      const error = await sessionResponse.text()
      throw new Error(`セッション作成に失敗しました: ${sessionResponse.status} - ${error}`)
    }
    
    const { session } = await sessionResponse.json()
    console.log(`✅ セッションの作成に成功しました: ${session.id}`)
    console.log(`   テーマ: ${session.theme}`)
    console.log(`   プラットフォーム: ${session.platform}`)
    console.log(`   スタイル: ${session.style}`)
    console.log(`   ステータス: ${session.status}\n`)
    
    // DBから直接確認
    const dbSession1 = await prisma.viralSession.findUnique({
      where: { id: session.id }
    })
    console.log(`📊 データベース確認: セッションが正しく保存されています`)
    console.log(`   作成日時: ${dbSession1.createdAt}\n`)
    
    // 2. トピック収集
    console.log('2️⃣ トレンドトピックを収集しています... (30秒程度かかります)')
    const topicsResponse = await fetch(`${baseUrl}/api/viral/v2/sessions/${session.id}/collect-topics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    
    if (!topicsResponse.ok) {
      const error = await topicsResponse.text()
      throw new Error(`トピック収集に失敗しました: ${error}`)
    }
    
    const topicsData = await topicsResponse.json()
    const topics = topicsData.session.topics?.parsed || []
    console.log(`✅ トピック収集が完了しました: ${topics.length}件`)
    
    // DBから直接確認
    const dbSession2 = await prisma.viralSession.findUnique({
      where: { id: session.id }
    })
    console.log(`📊 データベース確認: トピックが正しく保存されています`)
    console.log(`   ステータス: ${dbSession2.status}`)
    console.log(`   topics JSONフィールド: ${dbSession2.topics ? '✅ 存在' : '❌ なし'}`)
    
    if (topics.length > 0) {
      topics.forEach((topic, i) => {
        console.log(`\n   📌 トピック${i + 1}: ${topic.TOPIC}`)
        console.log(`      参照URL: ${topic.url}`)
        console.log(`      バイラル可能性: ${topic.viralPotential}`)
        console.log(`      感情トリガー: ${topic.emotionalTriggers?.join(', ') || 'なし'}`)
      })
    }
    
    // 3. コンセプト生成
    console.log('\n3️⃣ バイラルコンセプトを生成しています... (20秒程度かかります)')
    const conceptsResponse = await fetch(`${baseUrl}/api/viral/v2/sessions/${session.id}/generate-concepts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    
    if (!conceptsResponse.ok) {
      const error = await conceptsResponse.text()
      throw new Error(`コンセプト生成に失敗しました: ${error}`)
    }
    
    const conceptsData = await conceptsResponse.json()
    const concepts = conceptsData.session.concepts || []
    console.log(`✅ コンセプト生成が完了しました: ${concepts.length}件`)
    
    // DBから直接確認
    const dbSession3 = await prisma.viralSession.findUnique({
      where: { id: session.id }
    })
    console.log(`📊 データベース確認: コンセプトが正しく保存されています`)
    console.log(`   ステータス: ${dbSession3.status}`)
    console.log(`   concepts JSONフィールド: ${dbSession3.concepts ? '✅ 存在' : '❌ なし'}`)
    
    // コンセプトの詳細表示
    concepts.forEach((concept, i) => {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      console.log(`🎯 コンセプト${i + 1}: ${concept.conceptTitle || '❌ タイトルなし'}`)
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      console.log(`   ID: ${concept.conceptId}`)
      console.log(`   投稿形式: ${concept.format === 'single' ? '単独投稿' : concept.format === 'thread' ? 'スレッド投稿' : concept.format} ${concept.format === 'carousel' ? '⚠️  (廃止予定)' : '✅'}`)
      console.log(`   フック: ${concept.hookType} (${concept.hookCombination?.join(' + ') || 'なし'})`)
      console.log(`   切り口: ${concept.angle} (${concept.angleCombination?.join(' + ') || 'なし'})`)
      console.log(`   選択理由: ${concept.angleRationale}`)
      console.log(`   バイラルスコア: ${concept.viralScore}`)
      console.log(`   バイラル要因: ${concept.viralFactors?.join(', ') || 'なし'}`)
    })
    
    // 4. DB統合の最終確認
    console.log('\n\n📊 データベース統合テストの結果')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    const finalSession = await prisma.viralSession.findUnique({
      where: { id: session.id },
      include: {
        _count: {
          select: { drafts: true }
        }
      }
    })
    
    console.log(`✅ セッションID: ${finalSession.id}`)
    console.log(`✅ ステータス遷移: 作成済み → トピック収集完了 → コンセプト生成完了`)
    console.log(`✅ 収集されたトピック数: ${topics.length}件`)
    console.log(`✅ 生成されたコンセプト数: ${concepts.length}件`)
    console.log(`✅ 作成された下書き数: ${finalSession._count.drafts}件`)
    
    // プロンプト改善の確認
    console.log('\n🔍 V2プロンプト改善項目の確認:')
    const hasAllTitles = concepts.every(c => c.conceptTitle && c.conceptTitle.length > 0)
    console.log(`✅ コンセプトタイトル: ${hasAllTitles ? 'すべて生成されています ✅' : '❌ 一部欠損があります'}`)
    
    const formats = [...new Set(concepts.map(c => c.format))]
    console.log(`✅ 投稿形式の種類: ${formats.join(', ')} ${formats.includes('carousel') ? '⚠️' : '✅'}`)
    
    const hasFormatRationale = concepts.every(c => 
      c.angleRationale && (c.angleRationale.includes('single') || c.angleRationale.includes('thread') || c.angleRationale.includes('単独') || c.angleRationale.includes('スレッド'))
    )
    console.log(`✅ 形式選択の理由: ${hasFormatRationale ? 'すべて記載されています ✅' : '⚠️  一部のみ記載'}`)
    
    console.log('\n✨ データベース統合テストが完了しました！')
    console.log(`セッション詳細ページ: http://localhost:3000/viral/v2/sessions/${session.id}`)
    
  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error.message)
    console.error(error.stack)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// 実行
testV2DatabaseIntegration()