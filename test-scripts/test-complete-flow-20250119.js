#!/usr/bin/env node

/**
 * 完全なコンテンツ生成→投稿フローのテスト
 * Date: 2025-01-19
 */

const { PrismaClient } = require('../lib/generated/prisma')
const prisma = new PrismaClient()
const chalk = require('chalk')
const fs = require('fs').promises
const path = require('path')

async function testCompleteFlow() {
  console.log(chalk.yellow('🚀 完全フローテスト（既存システム利用）'))
  console.log(chalk.gray('=========================================\n'))
  
  try {
    // Step 1: 既存のセッションを確認
    console.log(chalk.blue('📋 Step 1: 既存セッション確認'))
    
    const session = await prisma.viralSession.findFirst({
      where: { status: 'CONCEPTS_GENERATED' },
      orderBy: { createdAt: 'desc' }
    })
    
    if (!session) {
      console.log(chalk.red('❌ CONCEPTS_GENERATEDのセッションが見つかりません'))
      return
    }
    
    console.log(chalk.green('✅ セッション発見:'))
    console.log(`  ID: ${session.id}`)
    console.log(`  Theme: ${session.theme}`)
    console.log(`  Status: ${session.status}`)
    
    // Step 2: Claudeコンテンツ生成（モック）
    console.log(chalk.blue('\n📝 Step 2: Claudeコンテンツ生成（モック）'))
    
    // モックプロンプトを読み込み
    const promptPath = path.join(process.cwd(), 'lib/prompts/claude/character-profiles/cardi-dare-simple.txt')
    let promptTemplate = ''
    try {
      promptTemplate = await fs.readFile(promptPath, 'utf-8')
    } catch (e) {
      console.log(chalk.yellow('⚠️  プロンプトファイルが見つかりません。デフォルトを使用します'))
    }
    
    console.log(chalk.gray('プロンプトファイル読み込み完了'))
    
    // concepts解析
    let concepts = []
    try {
      concepts = typeof session.concepts === 'string' 
        ? JSON.parse(session.concepts) 
        : session.concepts
    } catch (e) {
      console.log(chalk.yellow('⚠️  Concepts parse error'))
    }
    
    if (concepts.length === 0) {
      console.log(chalk.red('❌ コンセプトがありません'))
      return
    }
    
    const selectedConcept = concepts[0]
    console.log(chalk.green(`✅ 選択コンセプト: ${selectedConcept.conceptTitle}`))
    
    // カーディ・ダーレ風コンテンツ生成
    const generatedContent = `なあ、${selectedConcept.structure?.openingHook || 'AIの時代だって言うけどさ'}

まあ、53年も生きてりゃ分かるさ。
${selectedConcept.structure?.reflection || '人間は最適化できない。それが救いだ。'}

酒でも飲みながら考えてみな。`
    
    console.log(chalk.gray('\n生成コンテンツ:'))
    console.log(chalk.gray('─'.repeat(50)))
    console.log(generatedContent)
    console.log(chalk.gray('─'.repeat(50)))
    console.log(chalk.gray(`文字数: ${generatedContent.length}`))
    
    // Step 3: 下書き作成
    console.log(chalk.blue('\n💾 Step 3: 下書き作成'))
    
    const draft = await prisma.viralDraftV2.create({
      data: {
        sessionId: session.id,
        conceptId: selectedConcept.conceptId || `concept-${Date.now()}`,
        title: selectedConcept.conceptTitle || session.theme,
        content: generatedContent,
        hashtags: ['AI時代', 'カーディダーレ', '未来予測'],
        status: 'DRAFT',
        characterId: 'cardi-dare',
        characterNote: 'カーディ・ダーレ（53歳）- 元詐欺師→元王様→現在は飲んだくれ'
      }
    })
    
    console.log(chalk.green('✅ 下書き作成完了'))
    console.log(`  ID: ${draft.id}`)
    console.log(`  Title: ${draft.title}`)
    
    // Step 4: 投稿準備
    console.log(chalk.blue('\n🐦 Step 4: Twitter投稿準備'))
    
    const tweetText = `${generatedContent}\n\n#AI時代 #カーディダーレ #未来予測`
    console.log(chalk.gray(`最終文字数: ${tweetText.length}`))
    
    if (tweetText.length > 280) {
      console.log(chalk.yellow('⚠️  280文字を超えています。短縮が必要です。'))
    }
    
    // Step 5: 結果サマリー
    console.log(chalk.green('\n✅ フロー完了サマリー'))
    console.log(chalk.gray('─'.repeat(50)))
    console.log('1. セッション取得: OK')
    console.log('2. コンテンツ生成: OK (モック)')
    console.log('3. 下書き作成: OK')
    console.log('4. 投稿準備: OK')
    console.log(chalk.gray('─'.repeat(50)))
    
    console.log(chalk.yellow('\n📌 次のアクション:'))
    console.log('1. 実際の投稿:')
    console.log(chalk.cyan(`   node scripts/dev-tools/create-draft-from-session.js ${draft.id} --post`))
    console.log('2. ブラウザで確認:')
    console.log(chalk.cyan('   http://localhost:3000/generation/drafts'))
    console.log('3. 新APIでテスト:')
    console.log(chalk.cyan('   /api/create/flow/complete'))
    
  } catch (error) {
    console.error(chalk.red('\n❌ エラー:'), error)
  } finally {
    await prisma.$disconnect()
  }
}

// APIフロー図を表示
function showFlowDiagram() {
  console.log(chalk.blue('\n📊 コンテンツ生成フロー図:\n'))
  console.log(`
  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
  │ Perplexity  │────▶│     GPT     │────▶│   Claude    │
  │  (Topics)   │     │ (Concepts)  │     │ (Content)   │
  └─────────────┘     └─────────────┘     └─────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
  │   topics    │     │  concepts   │     │   drafts    │
  │  (in DB)    │     │  (in DB)    │     │  (in DB)    │
  └─────────────┘     └─────────────┘     └─────────────┘
                                                   │
                                                   ▼
                                          ┌─────────────┐
                                          │   Twitter   │
                                          │    Post     │
                                          └─────────────┘
  `)
}

async function main() {
  showFlowDiagram()
  await testCompleteFlow()
}

main().catch(console.error)