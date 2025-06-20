#!/usr/bin/env node
/**
 * Claude生成のデバッグ
 */

const path = require('path')
const { PrismaClient } = require(path.join(__dirname, '../lib/generated/prisma'))
const prisma = new PrismaClient()

async function debugClaudeGeneration() {
  try {
    const sessionId = 'cmc3h28l000041yvqswou3421'
    
    // 1. セッション情報を取得
    const session = await prisma.viralSession.findUnique({
      where: { id: sessionId }
    })
    
    console.log('📊 セッション情報:')
    console.log(`テーマ: ${session.theme}`)
    console.log(`ステータス: ${session.status}`)
    console.log(`選択済みID: ${JSON.stringify(session.selectedIds)}`)
    
    // 2. コンセプトの内容を確認
    if (session.concepts) {
      console.log('\n📝 保存されているコンセプト:')
      const concepts = typeof session.concepts === 'string' 
        ? JSON.parse(session.concepts) 
        : session.concepts
      console.log(`コンセプト数: ${concepts.length}`)
      
      // selectedIdsに対応するコンセプトを探す
      console.log('\n🔍 選択されたコンセプトの詳細:')
      session.selectedIds.forEach(id => {
        const concept = concepts.find(c => c.conceptId === id)
        if (concept) {
          console.log(`\n[${id}]`)
          console.log(`タイトル: ${concept.conceptTitle}`)
          console.log(`フック: ${concept.selectedHook}`)
          console.log(`角度: ${concept.selectedAngle}`)
          console.log(`形式: ${concept.format}`)
          console.log(`構造:`, concept.structure ? Object.keys(concept.structure) : 'なし')
        } else {
          console.log(`\n❌ ${id} に対応するコンセプトが見つかりません`)
        }
      })
    } else {
      console.log('\n❌ コンセプトが保存されていません')
    }
    
    // 3. プロンプトファイルの存在確認
    const fs = require('fs').promises
    const promptPath = path.join(
      process.cwd(), 
      'lib/prompts/claude/character-profiles/cardi-dare-simple.txt'
    )
    
    try {
      await fs.access(promptPath)
      console.log('\n✅ プロンプトファイル存在確認: OK')
      const promptContent = await fs.readFile(promptPath, 'utf-8')
      console.log(`プロンプト文字数: ${promptContent.length}`)
    } catch (error) {
      console.log('\n❌ プロンプトファイルが見つかりません:', promptPath)
    }
    
    // 4. キャラクターファイルの確認
    const charPath = path.join(
      process.cwd(),
      'lib/prompts/characters/cardi-dare.json'
    )
    
    try {
      await fs.access(charPath)
      console.log('\n✅ キャラクターファイル存在確認: OK')
      const charContent = await fs.readFile(charPath, 'utf-8')
      const character = JSON.parse(charContent)
      console.log(`キャラクター名: ${character.name}`)
    } catch (error) {
      console.log('\n❌ キャラクターファイルが見つかりません:', charPath)
    }
    
    // 5. API直接呼び出しテスト
    console.log('\n🚀 Claude API直接テスト...')
    const response = await fetch('http://localhost:3000/api/generation/content/sessions/' + sessionId + '/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ characterId: 'cardi-dare' })
    })
    
    console.log(`HTTPステータス: ${response.status}`)
    const result = await response.text()
    console.log(`レスポンス:`, result.substring(0, 200))
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugClaudeGeneration()