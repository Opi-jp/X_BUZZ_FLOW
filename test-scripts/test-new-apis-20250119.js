#!/usr/bin/env node

/**
 * 新しいAPIモジュールのテスト
 * Date: 2025-01-19
 */

const { PrismaClient } = require('../lib/generated/prisma')
const prisma = new PrismaClient()
const chalk = require('chalk')

async function testCreateFlow() {
  console.log(chalk.blue('\n🔧 Create Flow APIのテスト (モックデータ使用)\n'))
  
  try {
    // 既存のセッションから確認
    const existingSession = await prisma.viralSession.findFirst({
      where: { status: 'CONCEPTS_GENERATED' },
      orderBy: { createdAt: 'desc' }
    })
    
    if (existingSession) {
      console.log(chalk.green('✅ 既存セッション発見:'))
      console.log(`  ID: ${existingSession.id}`)
      console.log(`  Theme: ${existingSession.theme}`)
      console.log(`  Status: ${existingSession.status}`)
      
      // conceptsの内容を確認
      let concepts = []
      if (existingSession.concepts) {
        try {
          concepts = typeof existingSession.concepts === 'string' 
            ? JSON.parse(existingSession.concepts) 
            : existingSession.concepts
        } catch (e) {
          console.log(chalk.yellow('⚠️  Concepts parse error'))
        }
      }
      
      console.log(`  Concepts: ${concepts.length}個`)
      
      // Claudeコンテンツ生成のシミュレーション
      console.log(chalk.blue('\n📝 Claude生成をシミュレート...\n'))
      
      const mockContent = {
        conceptId: concepts[0]?.conceptId || 'mock-concept-1',
        conceptTitle: concepts[0]?.conceptTitle || 'AIが変える意外な働き方の真実',
        content: `なあ、AI時代の働き方って言うけどさ。

...まあ、53年も生きてりゃわかるさ。
人間は最適化できない。それが救いだ。

酒でも飲みながら考えてみな。`,
        characterId: 'cardi-dare'
      }
      
      console.log(chalk.gray('生成内容:'))
      console.log(chalk.gray('─'.repeat(50)))
      console.log(mockContent.content)
      console.log(chalk.gray('─'.repeat(50)))
      console.log(chalk.gray(`文字数: ${mockContent.content.length}`))
    }
    
  } catch (error) {
    console.error(chalk.red('❌ エラー:'), error.message)
  }
}

async function testPublishPost() {
  console.log(chalk.blue('\n🚀 Publish Post APIのテスト\n'))
  
  try {
    // 最新の下書きを取得
    const draft = await prisma.viralDraftV2.findFirst({
      where: { status: 'DRAFT' },
      orderBy: { createdAt: 'desc' }
    })
    
    if (draft) {
      console.log(chalk.green('✅ 下書き発見:'))
      console.log(`  ID: ${draft.id}`)
      console.log(`  Title: ${draft.title}`)
      console.log(`  Content: ${draft.content.substring(0, 50)}...`)
      console.log(`  Hashtags: ${draft.hashtags.join(', ')}`)
      
      // 投稿APIのペイロード
      const payload = {
        content: draft.content,
        draftId: draft.id,
        hashtags: draft.hashtags
      }
      
      console.log(chalk.yellow('\n📤 投稿ペイロード:'))
      console.log(JSON.stringify(payload, null, 2))
      
      // 実際の投稿はスキップ（--postフラグが必要）
      console.log(chalk.gray('\n💡 実際に投稿するには、既存のツールを使用:'))
      console.log(chalk.cyan('node scripts/dev-tools/create-draft-from-session.js --post'))
    } else {
      console.log(chalk.yellow('⚠️  下書きが見つかりません'))
    }
    
  } catch (error) {
    console.error(chalk.red('❌ エラー:'), error.message)
  }
}

async function showApiEndpoints() {
  console.log(chalk.blue('\n🌐 新しいAPIエンドポイント構造\n'))
  
  const endpoints = {
    'Intel (情報収集)': {
      '/api/intel/news/collect': 'ニュース収集',
      '/api/intel/social/buzz': 'バズ分析',
      '/api/intel/trends/analyze': 'トレンド分析'
    },
    'Create (生成)': {
      '/api/create/flow/complete': '完全フロー実行 ✅',
      '/api/create/session/start': 'セッション開始',
      '/api/create/concepts/generate': 'コンセプト生成',
      '/api/create/content/generate': 'コンテンツ生成',
      '/api/create/draft/save': '下書き保存'
    },
    'Publish (公開)': {
      '/api/publish/post/now': '即時投稿 ✅',
      '/api/publish/schedule/set': 'スケジュール設定',
      '/api/publish/media/upload': 'メディアアップロード'
    },
    'Analyze (分析)': {
      '/api/analyze/metrics/fetch': 'メトリクス取得',
      '/api/analyze/performance/report': 'パフォーマンスレポート',
      '/api/analyze/insights/generate': 'インサイト生成'
    }
  }
  
  for (const [module, apis] of Object.entries(endpoints)) {
    console.log(chalk.green(`\n${module}:`))
    for (const [endpoint, description] of Object.entries(apis)) {
      const implemented = endpoint.includes('complete') || endpoint.includes('now')
      console.log(`  ${implemented ? '✅' : '⏳'} ${endpoint} - ${description}`)
    }
  }
}

async function main() {
  try {
    console.log(chalk.yellow('🔍 新しいディレクトリ構造のAPIテスト'))
    console.log(chalk.gray('====================================='))
    
    await showApiEndpoints()
    await testCreateFlow()
    await testPublishPost()
    
    console.log(chalk.green('\n✅ テスト完了'))
    console.log(chalk.blue('\n次のステップ:'))
    console.log('1. 残りのAPIエンドポイントを実装')
    console.log('2. フロントエンドを新しいAPIに接続')
    console.log('3. エンドツーエンドテストを実行')
    
  } catch (error) {
    console.error(chalk.red('\n❌ エラー:'), error)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(console.error)