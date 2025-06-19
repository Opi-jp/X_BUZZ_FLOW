#!/usr/bin/env node

/**
 * 既存セッションから下書きを作成
 * 
 * 使い方:
 * node scripts/dev-tools/create-draft-from-session.js                    # 最新セッションから作成
 * node scripts/dev-tools/create-draft-from-session.js [sessionId]        # 特定セッションから作成
 * node scripts/dev-tools/create-draft-from-session.js --post             # 作成して投稿まで実行
 */

const { PrismaClient } = require('../../lib/generated/prisma')
const prisma = new PrismaClient()
const chalk = require('chalk')

async function main() {
  const args = process.argv.slice(2)
  const sessionId = args[0] && !args[0].startsWith('--') ? args[0] : null
  const shouldPost = args.includes('--post')
  
  try {
    // セッションを取得
    let session
    if (sessionId) {
      session = await prisma.viralSession.findUnique({
        where: { id: sessionId }
      })
    } else {
      // 最新のCONCEPTS_GENERATEDセッションを取得
      session = await prisma.viralSession.findFirst({
        where: { status: 'CONCEPTS_GENERATED' },
        orderBy: { createdAt: 'desc' }
      })
    }
    
    if (!session) {
      console.log(chalk.red('❌ 利用可能なセッションが見つかりません'))
      return
    }
    
    console.log(chalk.blue('📋 セッション情報:'))
    console.log(chalk.gray(`ID: ${session.id}`))
    console.log(chalk.gray(`テーマ: ${session.theme}`))
    console.log(chalk.gray(`ステータス: ${session.status}`))
    console.log(chalk.gray(`作成日: ${session.createdAt}`))
    
    // conceptsを解析
    let concepts = []
    if (session.concepts) {
      try {
        // 文字列の場合はパース
        if (typeof session.concepts === 'string') {
          concepts = JSON.parse(session.concepts)
        } else {
          concepts = session.concepts
        }
      } catch (e) {
        console.log(chalk.yellow('⚠️  コンセプトのパースに失敗しました'))
        // オブジェクトの配列として扱う
        if (Array.isArray(session.concepts)) {
          concepts = session.concepts
        }
      }
    }
    
    console.log(chalk.blue(`\n📝 利用可能なコンセプト: ${concepts.length}個`))
    
    if (concepts.length === 0) {
      console.log(chalk.red('❌ コンセプトが見つかりません'))
      return
    }
    
    // 最初のコンセプトを使用（または選択されたもの）
    const selectedConcept = concepts[0]
    console.log(chalk.green(`\n✅ 選択されたコンセプト: ${selectedConcept.conceptTitle || 'タイトルなし'}`))
    
    // カーディ・ダーレのキャラクターでコンテンツ生成
    const content = generateCardiDareContent(selectedConcept, session.theme)
    
    console.log(chalk.yellow('\n📱 生成された投稿:'))
    console.log(chalk.gray('─'.repeat(50)))
    console.log(content)
    console.log(chalk.gray('─'.repeat(50)))
    console.log(chalk.gray(`文字数: ${content.length}`))
    
    // 下書き作成
    const draft = await prisma.viralDraftV2.create({
      data: {
        sessionId: session.id,
        conceptId: selectedConcept.conceptId || `concept-${Date.now()}`,
        title: selectedConcept.conceptTitle || session.theme,
        content: content,
        hashtags: ['AI時代', 'カーディダーレ'],
        status: 'DRAFT',
        characterId: 'cardi-dare',
        characterNote: 'カーディ・ダーレ（53歳）- 元詐欺師→元王様→現在は飲んだくれ'
      }
    })
    
    console.log(chalk.green(`\n✅ 下書き作成完了!`))
    console.log(chalk.gray(`下書きID: ${draft.id}`))
    console.log(chalk.gray(`URL: http://localhost:3000/generation/drafts`))
    
    // 投稿実行
    if (shouldPost) {
      console.log(chalk.yellow('\n📤 Twitter投稿を実行します...'))
      
      const tweetText = `${content}\n\n#AI時代 #カーディダーレ`
      
      const response = await fetch('http://localhost:3000/api/twitter/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: tweetText })
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log(chalk.green(`\n✅ 投稿成功!`))
        console.log(chalk.blue(`URL: ${result.url}`))
        
        // 下書きステータス更新
        await prisma.viralDraftV2.update({
          where: { id: draft.id },
          data: { 
            status: 'posted',
            postedAt: new Date()
          }
        })
      } else {
        console.error(chalk.red(`\n❌ 投稿エラー: ${await response.text()}`))
      }
    } else {
      console.log(chalk.yellow('\n💡 投稿するには --post フラグを使用してください'))
    }
    
  } catch (error) {
    console.error(chalk.red(`\n❌ エラーが発生しました:`))
    console.error(error)
  } finally {
    await prisma.$disconnect()
  }
}

function generateCardiDareContent(concept, theme) {
  // カーディ・ダーレのキャラクター設定
  const cardiDare = {
    age: 53,
    background: '元詐欺師→元王様→現在は飲んだくれ',
    philosophy: '人間は最適化できない。それが救いだ',
    drinkingPhrases: ['酒でも飲みながら考えてみな', '俺から言わせりゃ、酒の方が正直だ', '飲みながら聞いてくれ'],
    cynicalPhrases: ['はっ、笑わせる', 'まあ、53年も生きてりゃ分かるさ', 'そういうもんだろ'],
    pastPhrases: ['昔、王様だった頃があってな', '俺も昔は騙す側だったけどな', '詐欺師時代を思い出すね']
  }
  
  // コンセプトから実際のデータを取得
  const hook = concept.structure?.openingHook || concept.selectedHook || `${theme}について考えたことあるか？`
  const background = concept.structure?.background || concept.angle || ''
  const mainContent = concept.structure?.mainContent || concept.viralFactors?.join('、') || ''
  const reflection = concept.structure?.reflection || concept.angleRationale || cardiDare.philosophy
  const cta = concept.structure?.cta || '...どう思う？'
  
  // カーディ・ダーレ風に変換
  let content = ''
  
  // 短い投稿の場合（単独投稿）
  if (concept.format === 'single' || !concept.format) {
    // フックから始める
    content = hook + '\n\n'
    
    // カーディ・ダーレの視点を追加
    const randomPhrase = cardiDare.cynicalPhrases[Math.floor(Math.random() * cardiDare.cynicalPhrases.length)]
    content += randomPhrase + '\n'
    
    // 核心部分を追加（短く）
    if (reflection && reflection.length < 50) {
      content += reflection
    } else if (mainContent && mainContent.length < 50) {
      content += mainContent
    } else {
      content += cardiDare.philosophy
    }
    
    // 140文字に収める
    if (content.length > 140) {
      content = hook + '\n\n' + cardiDare.philosophy
    }
  } else {
    // スレッド形式の場合は最初の投稿のみ
    content = hook + '\n\n' + 
              cardiDare.pastPhrases[Math.floor(Math.random() * cardiDare.pastPhrases.length)] + '\n' +
              '（続く）'
  }
  
  return content
}

main().catch(console.error)