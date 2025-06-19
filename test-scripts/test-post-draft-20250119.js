#!/usr/bin/env node

/**
 * 下書きから直接投稿するテスト
 * Date: 2025-01-19
 */

const { PrismaClient } = require('../lib/generated/prisma')
const prisma = new PrismaClient()
const chalk = require('chalk')

async function postDraft() {
  try {
    // 最新の下書きを取得
    const draft = await prisma.viralDraftV2.findFirst({
      where: { status: 'DRAFT' },
      orderBy: { createdAt: 'desc' }
    })
    
    if (!draft) {
      console.log(chalk.red('❌ 投稿可能な下書きがありません'))
      return
    }
    
    console.log(chalk.blue('📝 下書き情報:'))
    console.log(chalk.gray(`ID: ${draft.id}`))
    console.log(chalk.gray(`タイトル: ${draft.title}`))
    console.log(chalk.gray(`キャラクター: ${draft.characterId}`))
    
    // 投稿内容を構築
    const hashtags = draft.hashtags.map(tag => `#${tag.replace(/^#/, '')}`).join(' ')
    const tweetText = `${draft.content}\n\n${hashtags}`
    
    console.log(chalk.yellow('\n📱 投稿内容:'))
    console.log(chalk.gray('─'.repeat(50)))
    console.log(tweetText)
    console.log(chalk.gray('─'.repeat(50)))
    console.log(chalk.gray(`文字数: ${tweetText.length}`))
    
    if (tweetText.length > 280) {
      console.log(chalk.red('❌ 280文字を超えています'))
      return
    }
    
    // Twitter APIで投稿
    console.log(chalk.yellow('\n📤 Twitter投稿を実行します...'))
    
    const response = await fetch('http://localhost:3000/api/twitter/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: tweetText })
    })
    
    const result = await response.json()
    
    if (response.ok && result.success) {
      console.log(chalk.green('\n✅ 投稿成功!'))
      console.log(chalk.blue(`URL: ${result.url}`))
      console.log(chalk.gray(`Tweet ID: ${result.id}`))
      
      if (result.mock) {
        console.log(chalk.yellow('⚠️  モック投稿モード'))
      }
      
      // 下書きのステータスを更新
      await prisma.viralDraftV2.update({
        where: { id: draft.id },
        data: {
          status: 'POSTED',
          postedAt: new Date(),
          tweetId: result.id
        }
      })
      
      console.log(chalk.green('✅ 下書きステータス更新完了'))
      
    } else {
      console.log(chalk.red('❌ 投稿失敗'))
      console.log(chalk.red('エラー詳細:'))
      console.log(result)
      
      // 新しいpublish APIも試してみる
      console.log(chalk.yellow('\n🔄 新しいpublish APIで再試行...'))
      
      const publishResponse = await fetch('http://localhost:3000/api/publish/post/now', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: draft.content,
          draftId: draft.id,
          hashtags: draft.hashtags
        })
      })
      
      const publishResult = await publishResponse.json()
      console.log('Publish API結果:', publishResult)
    }
    
  } catch (error) {
    console.error(chalk.red('❌ エラー:'), error)
  } finally {
    await prisma.$disconnect()
  }
}

async function checkAuthStatus() {
  console.log(chalk.blue('🔐 認証状態確認\n'))
  
  // 環境変数の確認
  const hasTwitterV1 = !!(
    process.env.TWITTER_API_KEY &&
    process.env.TWITTER_API_SECRET &&
    process.env.TWITTER_ACCESS_TOKEN &&
    process.env.TWITTER_ACCESS_SECRET
  )
  
  const hasTwitterV2 = !!(
    process.env.TWITTER_CLIENT_ID &&
    process.env.TWITTER_CLIENT_SECRET
  )
  
  console.log(`Twitter v1.1 認証: ${hasTwitterV1 ? '✅' : '❌'}`)
  console.log(`Twitter v2 認証: ${hasTwitterV2 ? '✅' : '❌'}`)
  
  if (!hasTwitterV1 && !hasTwitterV2) {
    console.log(chalk.yellow('\n⚠️  Twitter認証情報が設定されていません'))
    console.log('モック投稿モードで動作します')
  }
}

async function main() {
  console.log(chalk.yellow('🚀 下書き投稿テスト'))
  console.log(chalk.gray('===================\n'))
  
  await checkAuthStatus()
  await postDraft()
}

main().catch(console.error)