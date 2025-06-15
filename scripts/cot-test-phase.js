#!/usr/bin/env node

/**
 * CoT 特定フェーズテストツール
 * DBに保存されたデータを使って特定のフェーズだけをテスト
 * 
 * 使い方:
 * node scripts/cot-test-phase.js [セッションID] [フェーズ] [ステップ]
 * 
 * 例:
 * node scripts/cot-test-phase.js abc123 2 THINK      # Phase 2のTHINKだけ実行
 * node scripts/cot-test-phase.js abc123 3 INTEGRATE  # Phase 3のINTEGRATEだけ実行
 */

const { PrismaClient } = require('../app/generated/prisma')
const OpenAI = require('openai')
const { 
  Phase1Strategy, 
  Phase2Strategy, 
  Phase3Strategy,
  Phase4Strategy,
  Phase5Strategy 
} = require('../lib/orchestrated-cot-strategy')

const prisma = new PrismaClient()
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const phaseStrategies = {
  1: Phase1Strategy,
  2: Phase2Strategy,
  3: Phase3Strategy,
  4: Phase4Strategy,
  5: Phase5Strategy
}

function interpolatePrompt(template, context) {
  return template.replace(/{(\w+)}/g, (match, key) => {
    const value = context[key]
    if (value === undefined) {
      return match
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2)
    }
    return value.toString()
  })
}

async function buildContext(session, targetPhase) {
  const baseContext = {
    expertise: session.expertise,
    style: session.style,
    platform: session.platform,
    userConfig: {
      expertise: session.expertise,
      style: session.style,
      platform: session.platform
    }
  }
  
  // 前のフェーズの結果を含める
  const context = { ...baseContext }
  
  session.phases.forEach(phase => {
    if (phase.phaseNumber < targetPhase && phase.integrateResult) {
      // Phase 1の結果
      if (phase.phaseNumber === 1) {
        context.trendedTopics = phase.integrateResult.trendedTopics || []
        context.searchResults = phase.executeResult?.searchResults || []
      }
      // Phase 2の結果
      else if (phase.phaseNumber === 2) {
        context.opportunities = phase.integrateResult.opportunities || []
        context.selectedOpportunities = phase.integrateResult.finalSelection?.topOpportunities || []
      }
      // Phase 3の結果
      else if (phase.phaseNumber === 3) {
        context.concepts = phase.integrateResult.concepts || []
      }
      // Phase 4の結果
      else if (phase.phaseNumber === 4) {
        context.contents = phase.integrateResult.contents || []
      }
    }
  })
  
  return context
}

async function main() {
  const [sessionId, phaseNum, step] = process.argv.slice(2)
  
  if (!sessionId || !phaseNum || !step) {
    console.log('使い方: node scripts/cot-test-phase.js [セッションID] [フェーズ] [ステップ]')
    console.log('ステップ: THINK, EXECUTE, INTEGRATE')
    process.exit(1)
  }
  
  const phaseNumber = parseInt(phaseNum)
  const strategy = phaseStrategies[phaseNumber]
  
  if (!strategy) {
    console.error(`Phase ${phaseNumber} の戦略が見つかりません`)
    process.exit(1)
  }
  
  // セッションとフェーズ情報を取得
  const session = await prisma.cotSession.findUnique({
    where: { id: sessionId },
    include: {
      phases: {
        orderBy: { phaseNumber: 'asc' }
      }
    }
  })
  
  if (!session) {
    console.error(`セッション ${sessionId} が見つかりません`)
    process.exit(1)
  }
  
  const currentPhase = session.phases.find(p => p.phaseNumber === phaseNumber)
  const context = await buildContext(session, phaseNumber)
  
  console.log('\n=== テスト情報 ===')
  console.log(`セッション: ${sessionId}`)
  console.log(`フェーズ: ${phaseNumber}`)
  console.log(`ステップ: ${step}`)
  console.log(`コンテキスト: ${Object.keys(context).filter(k => k !== 'userConfig').join(', ')}`)
  
  try {
    if (step === 'THINK') {
      console.log('\n=== THINK実行 ===')
      const prompt = interpolatePrompt(strategy.think.prompt, context)
      console.log(`プロンプト長: ${prompt.length}文字`)
      
      const startTime = Date.now()
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: 'あなたは、新たなトレンドを特定し、流行の波がピークに達する前にその波に乗るコンテンツのコンセプトを作成するバズるコンテンツ戦略家です。' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: strategy.think.temperature || 0.7,
        max_tokens: strategy.think.maxTokens,
        response_format: { type: 'json_object' }
      })
      
      const duration = Date.now() - startTime
      const result = JSON.parse(completion.choices[0].message.content || '{}')
      
      console.log(`\n実行時間: ${duration}ms`)
      console.log(`使用トークン: ${completion.usage?.total_tokens}`)
      console.log('\n=== 結果 ===')
      console.log(JSON.stringify(result, null, 2))
      
      // DBに保存するか確認
      console.log('\n\nこの結果をDBに保存しますか？ (y/n): ')
      
    } else if (step === 'EXECUTE') {
      if (!currentPhase?.thinkResult) {
        console.error('THINKの結果が見つかりません。先にTHINKを実行してください。')
        process.exit(1)
      }
      
      console.log('\n=== EXECUTE実行 ===')
      console.log('Think結果を使用:', Object.keys(currentPhase.thinkResult).join(', '))
      
      const startTime = Date.now()
      const result = await strategy.execute.handler(currentPhase.thinkResult, context)
      const duration = Date.now() - startTime
      
      console.log(`\n実行時間: ${duration}ms`)
      console.log('\n=== 結果 ===')
      
      // 大きな結果は要約して表示
      if (result.searchResults && Array.isArray(result.searchResults)) {
        console.log(`検索結果: ${result.searchResults.length}件`)
        result.searchResults.forEach((r, i) => {
          console.log(`\n[${i+1}] ${r.question || r.topic || r.title}`)
          if (r.analysis) {
            console.log(`分析: ${r.analysis.substring(0, 200)}...`)
          }
        })
      } else {
        console.log(JSON.stringify(result, null, 2))
      }
      
      console.log('\n\nこの結果をDBに保存しますか？ (y/n): ')
      
    } else if (step === 'INTEGRATE') {
      if (!currentPhase?.executeResult) {
        console.error('EXECUTEの結果が見つかりません。先にEXECUTEを実行してください。')
        process.exit(1)
      }
      
      console.log('\n=== INTEGRATE実行 ===')
      
      // INTEGRATEのコンテキストにはTHINKとEXECUTEの結果も含める
      const integrateContext = {
        ...context,
        ...currentPhase.thinkResult,
        ...currentPhase.executeResult
      }
      
      const prompt = interpolatePrompt(strategy.integrate.prompt, integrateContext)
      console.log(`プロンプト長: ${prompt.length}文字`)
      
      const startTime = Date.now()
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: 'あなたは、新たなトレンドを特定し、流行の波がピークに達する前にその波に乗るコンテンツのコンセプトを作成するバズるコンテンツ戦略家です。' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: strategy.integrate.temperature || 0.5,
        max_tokens: strategy.integrate.maxTokens,
        response_format: { type: 'json_object' }
      })
      
      const duration = Date.now() - startTime
      const result = JSON.parse(completion.choices[0].message.content || '{}')
      
      console.log(`\n実行時間: ${duration}ms`)
      console.log(`使用トークン: ${completion.usage?.total_tokens}`)
      console.log('\n=== 結果 ===')
      console.log(JSON.stringify(result, null, 2))
      
      console.log('\n\nこの結果をDBに保存しますか？ (y/n): ')
    }
    
    // ユーザー入力を待つ
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    })
    
    readline.question('', async (answer) => {
      if (answer.toLowerCase() === 'y') {
        // DBに保存する処理をここに追加
        console.log('保存機能は未実装です。APIを直接呼び出すか、cot-resumeツールを使用してください。')
      }
      
      readline.close()
      await prisma.$disconnect()
    })
    
  } catch (error) {
    console.error('\nエラーが発生しました:')
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  }
}

main().catch(console.error)