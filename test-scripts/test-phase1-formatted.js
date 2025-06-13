#!/usr/bin/env node

/**
 * Phase 1 Integrate - 整形フォーマット版
 * 検索結果を先に整形してから分析
 */

require('dotenv').config({ path: '.env.local' })
const OpenAI = require('openai')
const fs = require('fs')

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

function formatSearchResults(searchResults) {
  console.log('📝 検索結果を整形中...')
  
  let formattedText = '# 収集した記事一覧\n\n'
  let articleNumber = 1
  
  searchResults.forEach(queryResult => {
    queryResult.results.forEach(article => {
      formattedText += `${articleNumber}. **${article.title}**\n`
      formattedText += `   スニペット：${article.snippet}\n`
      formattedText += `   URL：${article.url}\n\n`
      articleNumber++
    })
  })
  
  console.log(`✅ ${articleNumber - 1}件の記事を整形完了`)
  return formattedText
}

async function analyzeWithFormattedResults(context, formattedResults) {
  console.log('\n🧠 整形済み結果でバズ機会を分析...')
  
  const prompt = `
あなたは、バズるコンテンツ戦略家です。
* 発信したい分野: ${context.expertise}
* プラットフォーム: ${context.platform}  
* スタイル: ${context.style}

${formattedResults}

上記の検索結果をもとに、バズの兆しとなるトピックを抽出してください。
以下のフォーマットに従って、最大3件構成してください。

【トピック名】
・要約：（50文字以内で核心を捉える）
・出典1：タイトル＋URL
・出典2：タイトル＋URL（複数の記事で裏付けがある場合）
・バズ要素：（感情トリガー／議論性／共感性から選択）
・専門家視点：${context.expertise}の観点から見た独自の切り口

## 評価基準
1. 複数の記事で言及されているトレンド
2. 感情的な反応を引き起こす要素
3. ${context.platform}でシェアされやすい内容
4. 今このタイミングだからこそ価値がある情報

## 注意事項
- 引用元は必ずURL付きで記載（URLなしの出典は無効）
- 各トピックには最低1つの出典URL必須
- 感情的な言葉は記事から具体的に引用
- ${context.expertise}の文脈を常に意識

必ずJSON形式で出力してください：
{
  "extractedTopics": [
    {
      "topicName": "バズりそうなトピック名",
      "summary": "50文字以内の要約",
      "sources": [
        {
          "title": "記事タイトル",
          "url": "記事URL"
        }
      ],
      "buzzElement": "感情トリガー/議論性/共感性",
      "expertPerspective": "専門家としての独自視点",
      "viralPotential": {
        "score": 0.0-1.0,
        "reasoning": "なぜバズると考えるか"
      }
    }
  ],
  "overallInsight": "全体を通じて見えてきたトレンド",
  "recommendedAction": "${context.platform}での具体的な投稿提案"
}`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'バズるコンテンツ戦略家として、必ずJSON形式で応答してください。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.5,
      max_tokens: 3000,
      response_format: { type: 'json_object' }
    })

    const result = JSON.parse(completion.choices[0].message.content || '{}')
    console.log(`✅ ${result.extractedTopics?.length || 0}個のバズ機会を特定`)
    
    return result
  } catch (error) {
    console.error('❌ 分析失敗:', error.message)
    return null
  }
}

async function testFormattedApproach() {
  console.log('=== Phase 1 Integrate: 整形フォーマット版 ===\n')
  
  // 前回の検索結果を読み込む
  const previousResults = JSON.parse(
    fs.readFileSync('phase1-simple-1749827632280.json', 'utf8')
  )
  
  const context = previousResults.context
  const searchResults = previousResults.searchResults
  
  console.log('📋 設定:')
  console.log(`発信したい分野: ${context.expertise}`)
  console.log(`プラットフォーム: ${context.platform}`)
  console.log(`スタイル: ${context.style}`)
  console.log('')

  // Step 1: 検索結果を整形
  const formattedResults = formatSearchResults(searchResults)
  
  // デバッグ用：整形結果の一部を表示
  console.log('\n📄 整形済みデータのサンプル:')
  const lines = formattedResults.split('\n')
  console.log(lines.slice(0, 10).join('\n'))
  if (lines.length > 10) console.log('...')
  console.log('')

  // Step 2: 整形済みデータで分析
  const analysis = await analyzeWithFormattedResults(context, formattedResults)
  
  if (!analysis) {
    console.error('分析に失敗しました')
    return
  }

  // 結果表示
  console.log('\n🎯 バズ機会の分析結果:\n')
  
  analysis.extractedTopics.forEach((topic, index) => {
    console.log(`【${topic.topicName}】`)
    console.log(`・要約：${topic.summary}`)
    topic.sources.forEach((source, i) => {
      console.log(`・出典${i + 1}：${source.title}`)
      console.log(`  ${source.url}`)
    })
    console.log(`・バズ要素：${topic.buzzElement}`)
    console.log(`・専門家視点：${topic.expertPerspective}`)
    console.log(`・バイラルスコア：${topic.viralPotential.score} - ${topic.viralPotential.reasoning}`)
    console.log('')
  })

  console.log('💡 全体インサイト:')
  console.log(analysis.overallInsight)
  
  console.log('\n📱 推奨アクション:')
  console.log(analysis.recommendedAction)

  // 結果を保存
  const results = {
    context,
    formattedResults,
    analysis,
    timestamp: new Date().toISOString()
  }

  const filename = `phase1-formatted-${Date.now()}.json`
  fs.writeFileSync(filename, JSON.stringify(results, null, 2))
  console.log(`\n💾 結果を保存: ${filename}`)
}

// 実行
testFormattedApproach().catch(console.error)