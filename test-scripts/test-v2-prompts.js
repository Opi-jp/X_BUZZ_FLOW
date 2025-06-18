#!/usr/bin/env node

/**
 * V2プロンプトのテストスクリプト
 * 新しいプロンプト（v2版）の動作確認
 */

require('dotenv').config({ path: '.env.local' })

async function testV2Prompts() {
  const baseUrl = 'http://localhost:3000'
  
  try {
    console.log('🧪 V2プロンプトテスト開始')
    console.log('==========================\n')
    
    // 1. セッション作成
    console.log('1️⃣ セッション作成中...')
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
      throw new Error(`セッション作成失敗: ${sessionResponse.status}`)
    }
    
    const { session } = await sessionResponse.json()
    console.log(`✅ セッション作成成功: ${session.id}`)
    console.log(`   テーマ: ${session.theme}`)
    console.log(`   プラットフォーム: ${session.platform}`)
    console.log(`   スタイル: ${session.style}\n`)
    
    // 2. トピック収集
    console.log('2️⃣ トピック収集中...')
    const topicsResponse = await fetch(`${baseUrl}/api/viral/v2/sessions/${session.id}/collect-topics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    
    if (!topicsResponse.ok) {
      const error = await topicsResponse.text()
      throw new Error(`トピック収集失敗: ${error}`)
    }
    
    const topicsData = await topicsResponse.json()
    const topics = topicsData.session.topics?.parsed || []
    console.log(`✅ トピック収集成功: ${topics.length}件`)
    
    topics.forEach((topic, i) => {
      console.log(`\n   📌 トピック${i + 1}: ${topic.TOPIC}`)
      console.log(`      URL: ${topic.url}`)
      console.log(`      分析: ${topic.perplexityAnalysis?.substring(0, 100)}...`)
    })
    
    // 3. コンセプト生成
    console.log('\n3️⃣ コンセプト生成中...')
    const conceptsResponse = await fetch(`${baseUrl}/api/viral/v2/sessions/${session.id}/generate-concepts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    
    if (!conceptsResponse.ok) {
      const error = await conceptsResponse.text()
      throw new Error(`コンセプト生成失敗: ${error}`)
    }
    
    const conceptsData = await conceptsResponse.json()
    const concepts = conceptsData.session.concepts || []
    console.log(`✅ コンセプト生成成功: ${concepts.length}件`)
    
    concepts.forEach((concept, i) => {
      console.log(`\n   🎯 コンセプト${i + 1}: ${concept.conceptTitle || 'タイトルなし'}`)
      console.log(`      ID: ${concept.conceptId}`)
      console.log(`      形式: ${concept.format}`)
      console.log(`      フック: ${concept.hookType} (${concept.hookCombination?.join(', ') || ''})`)
      console.log(`      角度: ${concept.angle} (${concept.angleCombination?.join(', ') || ''})`)
      console.log(`      理由: ${concept.angleRationale}`)
      console.log(`      バイラルスコア: ${concept.viralScore}`)
      
      if (concept.structure) {
        console.log(`      構造:`)
        console.log(`        - オープニング: ${concept.structure.openingHook}`)
        console.log(`        - 背景: ${concept.structure.background}`)
        console.log(`        - 中身: ${concept.structure.mainContent}`)
        console.log(`        - 内省: ${concept.structure.reflection}`)
        console.log(`        - CTA: ${concept.structure.cta}`)
      }
    })
    
    // 4. コンテンツ生成テスト（最初の3つを選択）
    const selectedIds = concepts.slice(0, 3).map(c => c.conceptId)
    console.log(`\n4️⃣ コンテンツ生成中... (選択: ${selectedIds.join(', ')})`)
    
    const contentsResponse = await fetch(`${baseUrl}/api/viral/v2/sessions/${session.id}/generate-contents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedIds })
    })
    
    if (!contentsResponse.ok) {
      const error = await contentsResponse.text()
      throw new Error(`コンテンツ生成失敗: ${error}`)
    }
    
    const contentsData = await contentsResponse.json()
    console.log(`✅ コンテンツ生成成功: ${contentsData.drafts?.length || 0}件の下書き作成`)
    
    console.log('\n✨ テスト完了！')
    console.log(`セッションID: ${session.id}`)
    console.log(`下書き一覧: http://localhost:3000/viral/v2/sessions/${session.id}/drafts`)
    
  } catch (error) {
    console.error('\n❌ エラー:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// 実行
testV2Prompts()