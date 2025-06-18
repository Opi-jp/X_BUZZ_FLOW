#!/usr/bin/env ts-node

/**
 * キャラクターコンテンツ生成のテスト
 * 2025-06-19
 */

// .envファイルを最初に読み込む
require('dotenv').config()

import { generateCharacterContentV2 } from '../lib/character-content-generator-v2.js'
import { DEFAULT_CHARACTERS } from '../types/character'

async function testCharacterGeneration() {
  console.log('=== Chain of Thought - Step 3: Claude ===\n')
  
  // 環境変数の確認
  console.log('環境変数チェック:')
  console.log('CLAUDE_API_KEY:', process.env.CLAUDE_API_KEY ? '設定済み' : '未設定')
  console.log('')

  // Step 1 (Perplexity) の結果
  const topicInfo = {
    title: 'AIがホワイトカラー職を奪う',
    url: 'https://www.independent.co.uk/news/world/americas/ai-job-layoffs-tech-unemployment-b2769796.html'
  }

  // Step 2 (GPT) の結果
  const concept = {
    conceptId: 'topic0_conceptA',
    conceptTitle: 'AI時代の生存戦略',
    format: 'thread',
    hookType: '問い・未完性',
    hookCombination: ['問い・未完性', '緊急性'],
    angle: 'ライフハック型',
    angleCombination: ['ライフハック型', '問題提起型'],
    angleRationale: 'AIの台頭による職業消滅の不安を解消するための実用的なヒントを提供する。',
    viralScore: 8,
    viralFactors: ['実用性', '緊急性'],
    structure: {
      openingHook: 'AIがあなたの仕事を奪う前に、何をすべきか知っていますか？',
      background: 'AIはホワイトカラー職を急速に代替し始めており、失業率も上昇する見込みです。',
      mainContent: 'AI時代において生き残るための3つのスキル。\n- 新しい技術の基本的な理解\n- 創造的思考の強化\n- 人間関係の構築能力',
      reflection: '今こそ、自分のスキルセットを見直すときです。AIが変えるのは、あなたの仕事だけではありません。',
      cta: 'あなたのAI時代の生存戦略は何ですか？コメントで教えてください！'
    },
    visual: 'インフォグラフィック：AI時代に必要なスキル3つ',
    timing: '平日夜（21時〜23時）',
    hashtags: ['#AI時代', '#職業スキル', '#生存戦略']
  }

  try {
    // カーディ・ダーレを取得
    const cardiDare = DEFAULT_CHARACTERS.find(c => c.id === 'cardi-dare')!
    
    console.log('📍 実行パラメータ:')
    console.log('キャラクター:', cardiDare.name)
    console.log('トピック:', topicInfo.title)
    console.log('コンセプト:', concept.conceptTitle)
    console.log('フック:', concept.structure.openingHook)
    console.log('\n実行中...\n')

    const result = await generateCharacterContentV2({
      character: cardiDare,
      concept,
      voiceMode: 'normal',
      topicInfo,
      format: 'simple'
    })

    console.log('✅ 生成成功！\n')
    console.log('📝 生成された投稿:')
    console.log('─'.repeat(60))
    console.log(result.content)
    console.log('─'.repeat(60))
    
    console.log('\n📊 文字数:', result.content.length, '文字')
    console.log('🔗 ソースURL:', result.sourceUrl)
    console.log('💬 キャラクターノート:', result.characterNote)
    
    // ハッシュタグ（参考）
    if (result.hashtags && result.hashtags.length > 0) {
      console.log('🏷️ ハッシュタグ（参考）:', result.hashtags.join(' '))
    }

    // 結果をファイルに保存
    const fs = require('fs').promises
    const path = require('path')
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    const resultDir = path.join(process.cwd(), 'test-results', 'character-generation')
    await fs.mkdir(resultDir, { recursive: true })
    
    const resultFile = path.join(resultDir, `result-${timestamp}.json`)
    await fs.writeFile(resultFile, JSON.stringify({
      input: { character: cardiDare.name, concept, topicInfo },
      output: result,
      timestamp: new Date().toISOString()
    }, null, 2))
    
    console.log(`\n💾 結果を保存しました: ${resultFile}`)

  } catch (error) {
    console.error('❌ エラー:', error)
  }
}

// 実行
testCharacterGeneration()