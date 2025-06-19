#!/usr/bin/env node

/**
 * APIフローの完全テスト
 * 各ステップを順番に実行して動作確認
 * Date: 2025-01-19
 */

const chalk = require('chalk')
const fs = require('fs').promises
const path = require('path')

// APIベースURL
const BASE_URL = 'http://localhost:3000'

// テストデータ
const TEST_DATA = {
  theme: 'AIと創造性の未来',
  platform: 'Twitter',
  style: 'エンターテイメント',
  characterId: 'cardi-dare'
}

// APIリクエストヘルパー
async function apiRequest(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    }
  }
  
  if (body) {
    options.body = JSON.stringify(body)
  }
  
  console.log(chalk.gray(`${method} ${endpoint}`))
  
  const response = await fetch(`${BASE_URL}${endpoint}`, options)
  const data = await response.json()
  
  if (!response.ok) {
    console.log(chalk.red(`❌ Error: ${response.status}`))
    console.log(chalk.red(JSON.stringify(data, null, 2)))
  }
  
  return { ok: response.ok, status: response.status, data }
}

// Step 1: セッション作成
async function createSession() {
  console.log(chalk.blue('\n📋 Step 1: セッション作成'))
  console.log(chalk.gray('─'.repeat(50)))
  
  const result = await apiRequest('/api/generation/content/sessions', 'POST', {
    theme: TEST_DATA.theme,
    platform: TEST_DATA.platform,
    style: TEST_DATA.style
  })
  
  if (result.ok) {
    const sessionId = result.data.session?.id || result.data.sessionId
    console.log(chalk.green(`✅ セッション作成成功`))
    console.log(`   ID: ${sessionId}`)
    console.log(`   Theme: ${TEST_DATA.theme}`)
    return sessionId
  } else {
    console.log(chalk.red('❌ セッション作成失敗'))
    return null
  }
}

// Step 2: Perplexityトピック収集
async function collectTopics(sessionId) {
  console.log(chalk.blue('\n🔍 Step 2: Perplexityトピック収集'))
  console.log(chalk.gray('─'.repeat(50)))
  
  // 収集開始
  const collectResult = await apiRequest(
    `/api/generation/content/sessions/${sessionId}/collect`,
    'POST'
  )
  
  if (!collectResult.ok) {
    console.log(chalk.red('❌ トピック収集開始失敗'))
    return null
  }
  
  console.log(chalk.yellow('⏳ 収集中...'))
  
  // ステータス確認（最大30秒待機）
  for (let i = 0; i < 15; i++) {
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const statusResult = await apiRequest(
      `/api/generation/content/sessions/${sessionId}`
    )
    
    if (statusResult.ok) {
      const session = statusResult.data.session
      if (session.status === 'TOPICS_COLLECTED') {
        console.log(chalk.green('✅ トピック収集完了'))
        
        // トピックを表示
        if (session.topics) {
          const topics = typeof session.topics === 'string' 
            ? JSON.parse(session.topics) 
            : session.topics
          
          console.log(`\n収集されたトピック:`)
          topics.forEach((topic, idx) => {
            console.log(chalk.cyan(`\n${idx + 1}. ${topic.title || 'No title'}`))
            console.log(chalk.gray(`   ${topic.summary || 'No summary'}`))
          })
        }
        
        return true
      }
    }
  }
  
  console.log(chalk.red('❌ タイムアウト'))
  return false
}

// Step 3: GPTコンセプト生成
async function generateConcepts(sessionId) {
  console.log(chalk.blue('\n💡 Step 3: GPTコンセプト生成'))
  console.log(chalk.gray('─'.repeat(50)))
  
  // 生成開始
  const generateResult = await apiRequest(
    `/api/generation/content/sessions/${sessionId}/generate`,
    'POST'
  )
  
  if (!generateResult.ok) {
    console.log(chalk.red('❌ コンセプト生成開始失敗'))
    return null
  }
  
  console.log(chalk.yellow('⏳ 生成中...'))
  
  // ステータス確認（最大30秒待機）
  for (let i = 0; i < 15; i++) {
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const statusResult = await apiRequest(
      `/api/generation/content/sessions/${sessionId}`
    )
    
    if (statusResult.ok) {
      const session = statusResult.data.session
      if (session.status === 'CONCEPTS_GENERATED') {
        console.log(chalk.green('✅ コンセプト生成完了'))
        
        // コンセプトを表示
        if (session.concepts) {
          const concepts = typeof session.concepts === 'string' 
            ? JSON.parse(session.concepts) 
            : session.concepts
          
          console.log(`\n生成されたコンセプト:`)
          const validConcepts = concepts.filter(c => c.conceptId)
          validConcepts.forEach((concept, idx) => {
            console.log(chalk.cyan(`\n${idx + 1}. ${concept.conceptTitle}`))
            console.log(chalk.gray(`   フック: ${concept.hookType}`))
            console.log(chalk.gray(`   角度: ${concept.angle}`))
            console.log(chalk.gray(`   スコア: ${concept.viralScore}`))
          })
          
          return validConcepts
        }
        
        return []
      }
    }
  }
  
  console.log(chalk.red('❌ タイムアウト'))
  return null
}

// Step 4: コンセプト選択とClaude生成
async function generateContents(sessionId, concepts) {
  console.log(chalk.blue('\n✍️  Step 4: Claude投稿生成'))
  console.log(chalk.gray('─'.repeat(50)))
  
  // 上位3つのコンセプトを選択
  const selectedConcepts = concepts.slice(0, 3)
  const conceptIds = selectedConcepts.map(c => c.conceptId)
  
  console.log(`選択されたコンセプト: ${conceptIds.join(', ')}`)
  
  // コンセプト選択
  const selectResult = await apiRequest(
    `/api/generation/content/sessions/${sessionId}/select-concepts`,
    'POST',
    { conceptIds }
  )
  
  if (!selectResult.ok) {
    console.log(chalk.red('❌ コンセプト選択失敗'))
    return null
  }
  
  // Claude生成
  const claudeResult = await apiRequest(
    `/api/generation/content/sessions/${sessionId}/claude-generate`,
    'POST',
    { characterId: TEST_DATA.characterId }
  )
  
  if (!claudeResult.ok) {
    console.log(chalk.red('❌ Claude生成失敗'))
    return null
  }
  
  console.log(chalk.green('✅ 投稿生成完了'))
  
  // 結果を取得
  const sessionResult = await apiRequest(
    `/api/generation/content/sessions/${sessionId}`
  )
  
  if (sessionResult.ok && sessionResult.data.session.contents) {
    const contents = typeof sessionResult.data.session.contents === 'string' 
      ? JSON.parse(sessionResult.data.session.contents) 
      : sessionResult.data.session.contents
    
    console.log(`\n生成された投稿:`)
    contents.forEach((content, idx) => {
      console.log(chalk.cyan(`\n${idx + 1}. ${content.conceptTitle}`))
      console.log(chalk.gray('─'.repeat(40)))
      console.log(content.content)
      console.log(chalk.gray('─'.repeat(40)))
    })
    
    return contents
  }
  
  return null
}

// Step 5: 下書き作成
async function createDrafts(sessionId, contents) {
  console.log(chalk.blue('\n💾 Step 5: 下書き作成'))
  console.log(chalk.gray('─'.repeat(50)))
  
  const drafts = []
  
  for (const content of contents) {
    const draftResult = await apiRequest('/api/generation/drafts', 'POST', {
      sessionId,
      conceptId: content.conceptId,
      title: content.conceptTitle,
      content: content.content,
      hashtags: ['AI時代', 'カーディダーレ'],
      status: 'DRAFT',
      characterId: content.characterId || TEST_DATA.characterId
    })
    
    if (draftResult.ok) {
      drafts.push(draftResult.data)
      console.log(chalk.green(`✅ 下書き作成: ${content.conceptTitle}`))
    } else {
      console.log(chalk.red(`❌ 下書き作成失敗: ${content.conceptTitle}`))
    }
  }
  
  return drafts
}

// メインフロー
async function main() {
  console.log(chalk.yellow('🚀 APIフロー完全テスト'))
  console.log(chalk.gray('======================\n'))
  
  try {
    // Step 1: セッション作成
    const sessionId = await createSession()
    if (!sessionId) {
      console.log(chalk.red('\n❌ セッション作成で失敗しました'))
      return
    }
    
    // Step 2: Perplexityトピック収集
    const topicsCollected = await collectTopics(sessionId)
    if (!topicsCollected) {
      console.log(chalk.red('\n❌ トピック収集で失敗しました'))
      return
    }
    
    // Step 3: GPTコンセプト生成
    const concepts = await generateConcepts(sessionId)
    if (!concepts || concepts.length === 0) {
      console.log(chalk.red('\n❌ コンセプト生成で失敗しました'))
      return
    }
    
    // Step 4: Claude投稿生成
    const contents = await generateContents(sessionId, concepts)
    if (!contents || contents.length === 0) {
      console.log(chalk.red('\n❌ 投稿生成で失敗しました'))
      return
    }
    
    // Step 5: 下書き作成
    const drafts = await createDrafts(sessionId, contents)
    
    // 結果サマリー
    console.log(chalk.green('\n\n✅ フロー完了！'))
    console.log(chalk.gray('─'.repeat(50)))
    console.log(`セッションID: ${sessionId}`)
    console.log(`生成された下書き: ${drafts.length}件`)
    console.log(chalk.gray('─'.repeat(50)))
    
    console.log(chalk.yellow('\n📌 次のステップ:'))
    console.log(`1. 詳細生成UIで確認:`)
    console.log(chalk.cyan(`   http://localhost:3000/create/detailed`))
    console.log(`2. 投稿画面で投稿:`)
    console.log(chalk.cyan(`   http://localhost:3000/generation/post`))
    
  } catch (error) {
    console.error(chalk.red('\n❌ エラーが発生しました:'), error)
  }
}

// 実行
main().catch(console.error)