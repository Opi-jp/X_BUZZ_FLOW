#!/usr/bin/env node

/**
 * プロンプトチェーンのテスト実行
 * Perplexity → GPT → Claude の流れを実行
 */

const PromptTestExecutor = require('../scripts/dev-tools/prompt-test-executor.js')
const fs = require('fs').promises
const path = require('path')

// .envファイルを読み込む
require('dotenv').config()

async function runPromptChain() {
  const executor = new PromptTestExecutor()
  
  console.log('=== Chain of Thought テスト実行 ===\n')
  
  try {
    // Step 1: Perplexity - トピック収集
    console.log('📍 Step 1: Perplexity - トピック収集')
    console.log('─'.repeat(60))
    
    const perplexityPrompt = await fs.readFile(
      path.join(process.cwd(), 'lib/prompts/perplexity/collect-topics.txt'),
      'utf-8'
    )
    
    // 変数を展開
    const perplexityExpanded = perplexityPrompt
      .replace(/\${theme}/g, 'AIと働き方')
      .replace(/\${platform}/g, 'Twitter')
      .replace(/\${style}/g, 'エンターテイメント')
    
    console.log('実行中...\n')
    
    const perplexityResult = await executor.execute('perplexity', perplexityExpanded, {
      temperature: 0.7,
      maxTokens: 4000,
      jsonMode: true
    })
    
    if (!perplexityResult.success) {
      console.error('❌ Perplexity実行失敗:', perplexityResult.error)
      return
    }
    
    console.log('✅ Perplexity実行成功！')
    console.log('取得したトピック数:', perplexityResult.data.length || 1)
    
    // 結果を表示
    if (Array.isArray(perplexityResult.data)) {
      perplexityResult.data.forEach((topic, index) => {
        console.log(`\nトピック${index + 1}: ${topic.TOPIC || topic.title}`)
      })
    }
    
    console.log('\n' + '─'.repeat(60) + '\n')
    
    // Step 2: GPT - コンセプト生成
    console.log('📍 Step 2: GPT - コンセプト生成')
    console.log('─'.repeat(60))
    
    const gptPrompt = await fs.readFile(
      path.join(process.cwd(), 'lib/prompts/gpt/generate-concepts.txt'),
      'utf-8'
    )
    
    // Perplexityの結果から最初のトピックを使用
    const topic = Array.isArray(perplexityResult.data) 
      ? perplexityResult.data[0] 
      : perplexityResult.data
    
    // GPT用の変数を展開
    const gptExpanded = gptPrompt
      .replace(/\${platform}/g, 'Twitter')
      .replace(/\${style}/g, 'エンターテイメント')
      .replace(/\${topicIndex}/g, '0')
      .replace(/\${topicTitle}/g, topic.TOPIC || topic.title || 'AIが変える働き方')
      .replace(/\${topicSource}/g, topic.source || 'ニュースソース')
      .replace(/\${topicDate}/g, topic.date || new Date().toISOString().split('T')[0])
      .replace(/\${topicUrl}/g, topic.url || 'https://example.com')
      .replace(/\${topicSummary}/g, topic.summary || 'トピックの要約')
      .replace(/\${topicKeyPoints}/g, topic.keyPoints ? topic.keyPoints.join('\n') : 'キーポイント')
      .replace(/\${topicAnalysis}/g, topic.perplexityAnalysis || '分析結果')
      .replace(/\${topic}/g, JSON.stringify(topic, null, 2))
    
    console.log('実行中...\n')
    
    const gptResult = await executor.execute('gpt', gptExpanded, {
      temperature: 0.8,
      maxTokens: 4000,
      jsonMode: true
    })
    
    if (!gptResult.success) {
      console.error('❌ GPT実行失敗:', gptResult.error)
      return
    }
    
    console.log('✅ GPT実行成功！')
    console.log('生成されたコンセプト:')
    console.log(`- フックタイプ: ${gptResult.data.hookType}`)
    console.log(`- 角度: ${gptResult.data.angle}`)
    console.log(`- バイラルスコア: ${gptResult.data.viralScore}/100`)
    
    console.log('\n結果を保存中...')
    
    // 結果を保存
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    const resultDir = path.join(process.cwd(), 'test-results', timestamp)
    await fs.mkdir(resultDir, { recursive: true })
    
    await fs.writeFile(
      path.join(resultDir, 'perplexity-result.json'),
      JSON.stringify(perplexityResult.data, null, 2)
    )
    
    await fs.writeFile(
      path.join(resultDir, 'gpt-result.json'),
      JSON.stringify(gptResult.data, null, 2)
    )
    
    console.log(`\n📁 結果を保存しました: ${resultDir}`)
    
    // Step 3: Claude - コンテンツ生成（準備）
    console.log('\n' + '─'.repeat(60))
    console.log('📍 Step 3: Claude - コンテンツ生成')
    console.log('準備完了。character-content-generator-v2.ts で実行可能です。')
    
  } catch (error) {
    console.error('エラー:', error)
  }
}

// 実行
runPromptChain()