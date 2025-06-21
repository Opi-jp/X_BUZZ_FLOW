#!/usr/bin/env node

/**
 * シンプルなコンテンツ生成・投稿フロー
 * 
 * 使い方:
 * node scripts/dev-tools/simple-content-flow.js               # モックデータで投稿文生成
 * node scripts/dev-tools/simple-content-flow.js --post        # 生成して投稿まで実行
 * node scripts/dev-tools/simple-content-flow.js --theme "テーマ"  # 新規テーマで生成
 */

const { PrismaClient } = require('../../lib/generated/prisma')
const prisma = new PrismaClient()
const chalk = require('chalk')
const fs = require('fs').promises
const path = require('path')

async function loadMockData() {
  const conceptsPath = path.join(process.cwd(), 'lib/prompts/mock-data/gpt/concepts.json')
  const conceptsData = await fs.readFile(conceptsPath, 'utf-8')
  return JSON.parse(conceptsData).default
}

async function generateContent(concept, characterId = 'cardi-dare') {
  console.log(chalk.blue('📝 コンテンツ生成中...'))
  
  // カーディ・ダーレのキャラクター設定
  const character = {
    name: 'カーディ・ダーレ',
    age: 53,
    background: '元詐欺師 → 元王様 → 現在はただの飲んだくれ',
    philosophy: '人間は最適化できない。それが救いだ',
    style: 'シニカルで辛辣、しかし根は優しい。人生経験豊富'
  }
  
  // キャラクターの視点でコンテンツを生成
  const content = generateCharacterContent(concept, character)
  
  return content
}

function generateCharacterContent(concept, character) {
  // カーディ・ダーレ風にコンセプトを解釈
  const templates = [
    `${concept.structure.openingHook}

...まあ、${character.age}年も生きてりゃわかるさ。
${concept.structure.mainContent}

${concept.structure.reflection}
酒でも飲みながら考えてみな。`,
    
    `なあ、知ってるか？
${concept.structure.openingHook}

${concept.structure.background}
${concept.structure.mainContent}

...ま、俺も昔は騙す側だったけどな。
今は酒の方が正直でいい。`,
    
    `${concept.structure.openingHook}

${concept.structure.mainContent}

${character.philosophy}
${concept.structure.reflection}

${concept.structure.cta}`
  ]
  
  // ランダムにテンプレートを選択
  const template = templates[Math.floor(Math.random() * templates.length)]
  
  // 140文字以内に調整
  let content = template
  if (content.length > 140) {
    // 重要な部分を残して短縮
    content = `${concept.structure.openingHook}\n\n${concept.structure.reflection}`
  }
  
  return {
    content,
    hashtags: ['AI時代の生き方', 'カーディダーレの呟き'],
    character: character.name,
    concept: concept.conceptTitle
  }
}

async function postToTwitter(content, hashtags) {
  const tweetText = `${content}\n\n${hashtags.map(tag => `#${tag}`).join(' ')}`
  
  console.log(chalk.yellow('\n📱 投稿内容:'))
  console.log(chalk.gray('─'.repeat(50)))
  console.log(tweetText)
  console.log(chalk.gray('─'.repeat(50)))
  console.log(chalk.gray(`文字数: ${tweetText.length}`))
  
  const response = await fetch('http://localhost:3000/api/twitter/post', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: tweetText })
  })
  
  if (!response.ok) {
    throw new Error(`投稿失敗: ${await response.text()}`)
  }
  
  const result = await response.json()
  return result
}

async function saveDraft(content, sessionId, conceptId) {
  const draft = await prisma.viralDraft.create({
    data: {
      sessionId: sessionId || 'mock-session',
      conceptId: conceptId || 'mock-concept-1',
      title: content.concept,
      content: content.content,
      hashtags: content.hashtags,
      platform: 'Twitter',
      status: 'draft',
      characterId: 'cardi-dare'
    }
  })
  
  return draft
}

async function main() {
  const args = process.argv.slice(2)
  const shouldPost = args.includes('--post')
  const theme = args.find(arg => arg.startsWith('--theme'))?.split('=')[1]
  
  try {
    console.log(chalk.green('🚀 シンプルコンテンツフロー開始\n'))
    
    // モックデータを読み込み
    const concept = await loadMockData()
    console.log(chalk.blue(`📋 コンセプト: ${concept.conceptTitle}`))
    console.log(chalk.gray(`フック: ${concept.hookType}`))
    console.log(chalk.gray(`角度: ${concept.angle}`))
    console.log(chalk.gray(`バイラルスコア: ${concept.viralScore}`))
    
    // コンテンツ生成
    const content = await generateContent(concept)
    console.log(chalk.green('\n✅ コンテンツ生成完了'))
    console.log(chalk.gray(`キャラクター: ${content.character}`))
    
    // 下書き保存
    const draft = await saveDraft(content)
    console.log(chalk.green(`\n💾 下書き保存完了 (ID: ${draft.id})`))
    
    // 投稿実行
    if (shouldPost) {
      console.log(chalk.yellow('\n📤 Twitter投稿を実行します...'))
      
      try {
        const postResult = await postToTwitter(content.content, content.hashtags)
        console.log(chalk.green(`\n✅ 投稿成功!`))
        console.log(chalk.blue(`URL: ${postResult.url}`))
        
        // 下書きのステータスを更新
        await prisma.viralDraft.update({
          where: { id: draft.id },
          data: { 
            status: 'posted',
            postedAt: new Date()
          }
        })
        
      } catch (error) {
        console.error(chalk.red(`\n❌ 投稿エラー: ${error.message}`))
        console.log(chalk.yellow('💡 下書きは保存されています'))
      }
    } else {
      console.log(chalk.yellow('\n💡 投稿するには --post フラグを使用してください'))
    }
    
    // 結果サマリー
    console.log(chalk.blue('\n📊 実行結果サマリー:'))
    console.log(chalk.gray('─'.repeat(50)))
    console.log(`テーマ: ${theme || concept.conceptTitle}`)
    console.log(`キャラクター: カーディ・ダーレ`)
    console.log(`下書きID: ${draft.id}`)
    console.log(`ステータス: ${draft.status}`)
    console.log(chalk.gray('─'.repeat(50)))
    
  } catch (error) {
    console.error(chalk.red(`\n❌ エラーが発生しました:`))
    console.error(error)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(console.error)