#!/usr/bin/env node

/**
 * コンテンツ生成フローの実行ヘルパー
 * 
 * 使い方:
 * node scripts/dev-tools/run-generation-flow.js                    # 新規セッション作成
 * node scripts/dev-tools/run-generation-flow.js [sessionId]        # 既存セッションを続行
 * node scripts/dev-tools/run-generation-flow.js --complete         # 最新セッションを完了まで実行
 */

const { PrismaClient } = require('../../lib/generated/prisma')
const prisma = new PrismaClient()
const chalk = require('chalk')

async function main() {
  const args = process.argv.slice(2)
  const sessionId = args[0] && !args[0].startsWith('--') ? args[0] : null
  const completeFlag = args.includes('--complete')
  
  try {
    let targetSessionId = sessionId
    
    // セッションIDが指定されていない場合
    if (!targetSessionId) {
      if (completeFlag) {
        // 最新の未完了セッションを取得
        const latestSession = await prisma.viralSession.findFirst({
          where: {
            status: {
              notIn: ['COMPLETED', 'ERROR']
            }
          },
          orderBy: { createdAt: 'desc' }
        })
        
        if (latestSession) {
          targetSessionId = latestSession.id
          console.log(chalk.blue(`📋 最新セッションを使用: ${targetSessionId}`))
          console.log(chalk.gray(`テーマ: ${latestSession.theme}`))
          console.log(chalk.gray(`ステータス: ${latestSession.status}`))
        } else {
          console.log(chalk.yellow('⚠️  未完了のセッションがありません'))
          return
        }
      } else {
        // 新規セッション作成
        console.log(chalk.green('🆕 新規セッションを作成します'))
        
        const theme = 'AIと働き方の未来'
        const platform = 'Twitter'
        const style = 'エンターテイメント'
        
        const response = await fetch('http://localhost:3000/api/generation/content/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ theme, platform, style })
        })
        
        if (!response.ok) {
          throw new Error(`Failed to create session: ${await response.text()}`)
        }
        
        const result = await response.json()
        targetSessionId = result.session.id
        
        console.log(chalk.green(`✅ セッション作成完了: ${targetSessionId}`))
        console.log(chalk.gray(`テーマ: ${theme}`))
      }
    }
    
    // フロー実行
    console.log(chalk.blue(`\n🚀 フロー実行を開始します`))
    
    let isComplete = false
    let stepCount = 0
    const maxSteps = 10
    
    while (!isComplete && stepCount < maxSteps) {
      stepCount++
      console.log(chalk.gray(`\n--- Step ${stepCount} ---`))
      
      // 現在の状態を確認
      const statusResponse = await fetch(
        `http://localhost:3000/api/create/flow/process?sessionId=${targetSessionId}`,
        { method: 'GET' }
      )
      
      if (!statusResponse.ok) {
        throw new Error(`Failed to get status: ${await statusResponse.text()}`)
      }
      
      const statusData = await statusResponse.json()
      const currentStatus = statusData.data.session.status
      const progress = statusData.data.stats.progress || 0
      
      console.log(chalk.cyan(`📊 現在のステータス: ${currentStatus} (${progress}%)`))
      
      if (!statusData.data.stats.canProcess) {
        isComplete = true
        console.log(chalk.green(`\n✅ フロー完了!`))
        console.log(chalk.gray(`下書き数: ${statusData.data.stats.draftsCount}`))
        break
      }
      
      // 次のステップを実行
      console.log(chalk.yellow(`⏳ 次のステップを実行中...`))
      
      const processResponse = await fetch('http://localhost:3000/api/create/flow/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: targetSessionId })
      })
      
      if (!processResponse.ok) {
        const error = await processResponse.text()
        console.error(chalk.red(`❌ エラー: ${error}`))
        break
      }
      
      const processResult = await processResponse.json()
      console.log(chalk.green(`✅ ${processResult.data.action} 完了`))
      
      // 完了フラグが設定されていない場合は1ステップで終了
      if (!completeFlag) {
        console.log(chalk.yellow(`\n💡 完了まで実行するには --complete フラグを使用してください`))
        break
      }
      
      // API制限を考慮して少し待機
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
    
    if (stepCount >= maxSteps) {
      console.log(chalk.red(`\n⚠️  最大ステップ数に到達しました`))
    }
    
    // 最終結果を表示
    console.log(chalk.blue(`\n📋 最終結果:`))
    console.log(chalk.gray(`セッションID: ${targetSessionId}`))
    console.log(chalk.gray(`URL: http://localhost:3000/generation/content/results/${targetSessionId}`))
    
  } catch (error) {
    console.error(chalk.red(`\n❌ エラーが発生しました:`))
    console.error(error)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(console.error)