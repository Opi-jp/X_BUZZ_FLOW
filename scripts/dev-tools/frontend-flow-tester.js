#!/usr/bin/env node

/**
 * フロントエンド専用フローテスター
 * 
 * フロントエンドUIを通じて実際のユーザー操作をシミュレート
 * バックエンド直接呼び出しではなく、ブラウザでの動作を検証
 */

const puppeteer = require('puppeteer')
const chalk = require('chalk')

const BASE_URL = 'http://localhost:3000'

class FrontendFlowTester {
  constructor() {
    this.browser = null
    this.page = null
    this.testResults = []
  }

  async initialize() {
    console.log(chalk.blue('🚀 フロントエンドフローテスター開始'))
    
    this.browser = await puppeteer.launch({
      headless: false, // ヘッドレスモードOFF（画面確認のため）
      devtools: true,  // DevTools自動オープン
      slowMo: 1000     // 操作を1秒ごとに実行（確認しやすくする）
    })
    
    this.page = await this.browser.newPage()
    
    // Console log監視
    this.page.on('console', (msg) => {
      const type = msg.type()
      const text = msg.text()
      
      if (type === 'error') {
        console.log(chalk.red(`🔥 Browser Error: ${text}`))
      } else if (text.includes('CLAUDE_LOG')) {
        console.log(chalk.green(`🤖 Claude Log: ${text}`))
      }
    })
    
    // Network監視
    this.page.on('response', (response) => {
      const status = response.status()
      const url = response.url()
      
      if (url.includes('/api/') && status >= 400) {
        console.log(chalk.red(`❌ API Error: ${status} ${url}`))
      } else if (url.includes('/api/')) {
        console.log(chalk.cyan(`✅ API Success: ${status} ${url}`))
      }
    })
    
    await this.page.setViewport({ width: 1280, height: 800 })
  }

  async testCreateFlow() {
    console.log(chalk.yellow('📝 テスト1: Create Flow - テーマ入力〜フロー開始'))
    
    try {
      // 1. Createページにアクセス
      await this.page.goto(`${BASE_URL}/create`)
      await this.page.waitForSelector('input[placeholder*="例: AIと働き方"]', { timeout: 10000 })
      
      console.log(chalk.green('✅ Create page loaded'))
      
      // 2. テーマを入力
      const testTheme = 'フロントエンドテスト用AIテーマ'
      await this.page.type('input[placeholder*="例: AIと働き方"]', testTheme)
      
      console.log(chalk.green(`✅ Theme entered: ${testTheme}`))
      
      // 3. 生成開始ボタンをクリック
      await this.page.click('button:has-text("生成開始")')
      
      console.log(chalk.green('✅ Generate button clicked'))
      
      // 4. フロー詳細ページに遷移するのを待つ
      await this.page.waitForURL('**/create/flow/**', { timeout: 15000 })
      
      const currentUrl = this.page.url()
      console.log(chalk.green(`✅ Redirected to flow page: ${currentUrl}`))
      
      // 5. セッションIDを抽出
      const sessionId = currentUrl.split('/').pop()
      console.log(chalk.blue(`📝 Session ID: ${sessionId}`))
      
      this.testResults.push({
        test: 'Create Flow',
        status: 'PASSED',
        sessionId,
        details: 'Successfully created flow and redirected'
      })
      
      return sessionId
      
    } catch (error) {
      console.log(chalk.red(`❌ Create Flow test failed: ${error.message}`))
      
      this.testResults.push({
        test: 'Create Flow',
        status: 'FAILED',
        error: error.message
      })
      
      throw error
    }
  }

  async testFlowProgress(sessionId) {
    console.log(chalk.yellow('⏳ テスト2: Flow Progress - フロー進行監視'))
    
    try {
      // 1. プログレスバーの確認
      await this.page.waitForSelector('.bg-purple-600', { timeout: 5000 })
      console.log(chalk.green('✅ Progress bar found'))
      
      // 2. Phase 1 (Topics) の完了を待つ
      console.log(chalk.blue('⌛ Waiting for Phase 1 (Topics) completion...'))
      
      await this.page.waitForFunction(
        () => {
          const phase1Icon = document.querySelector('h3:has-text("Phase 1")').parentElement.querySelector('svg')
          return phase1Icon && phase1Icon.classList.contains('text-green-600')
        },
        { timeout: 60000 } // 60秒待機
      )
      
      console.log(chalk.green('✅ Phase 1 (Topics) completed'))
      
      // 3. コンセプト生成の開始を確認
      const conceptsGenerated = await this.page.waitForFunction(
        () => {
          const conceptSection = document.querySelector('h3:has-text("コンセプト生成")')?.parentElement
          return conceptSection && conceptSection.querySelector('.text-green-600, .animate-spin')
        },
        { timeout: 30000 }
      )
      
      if (conceptsGenerated) {
        console.log(chalk.green('✅ Phase 2 (Concepts) started'))
      }
      
      this.testResults.push({
        test: 'Flow Progress',
        status: 'PASSED',
        sessionId,
        details: 'Successfully monitored flow progress'
      })
      
    } catch (error) {
      console.log(chalk.red(`❌ Flow Progress test failed: ${error.message}`))
      
      this.testResults.push({
        test: 'Flow Progress', 
        status: 'FAILED',
        error: error.message
      })
    }
  }

  async testConceptSelection(sessionId) {
    console.log(chalk.yellow('🎯 テスト3: Concept Selection - コンセプト選択UI'))
    
    try {
      // 1. コンセプト選択UIの表示を待つ
      console.log(chalk.blue('⌛ Waiting for concept selection UI...'))
      
      await this.page.waitForSelector('input[type="checkbox"]', { timeout: 120000 }) // 2分待機
      console.log(chalk.green('✅ Concept selection UI appeared'))
      
      // 2. 利用可能なコンセプトを確認
      const concepts = await this.page.$$('input[type="checkbox"]')
      console.log(chalk.blue(`📊 Found ${concepts.length} concepts`))
      
      // 3. 最初の2つのコンセプトを選択
      const selectCount = Math.min(2, concepts.length)
      
      for (let i = 0; i < selectCount; i++) {
        await concepts[i].click()
        console.log(chalk.green(`✅ Selected concept ${i + 1}`))
        await this.page.waitForTimeout(500)
      }
      
      // 4. 選択ボタンをクリック
      await this.page.click('button:has-text("選択したコンセプトで続行")')
      console.log(chalk.green('✅ Concept selection submitted'))
      
      this.testResults.push({
        test: 'Concept Selection',
        status: 'PASSED',
        sessionId,
        details: `Selected ${selectCount} concepts successfully`
      })
      
    } catch (error) {
      console.log(chalk.red(`❌ Concept Selection test failed: ${error.message}`))
      
      this.testResults.push({
        test: 'Concept Selection',
        status: 'FAILED', 
        error: error.message
      })
    }
  }

  async testCharacterSelection(sessionId) {
    console.log(chalk.yellow('🎭 テスト4: Character Selection - キャラクター選択UI'))
    
    try {
      // 1. キャラクター選択UIの表示を待つ
      console.log(chalk.blue('⌛ Waiting for character selection UI...'))
      
      await this.page.waitForSelector('button:has-text("カーディ・ダーレ")', { timeout: 60000 })
      console.log(chalk.green('✅ Character selection UI appeared'))
      
      // 2. カーディ・ダーレを選択
      await this.page.click('button:has-text("カーディ・ダーレ")')
      console.log(chalk.green('✅ Selected Cardi Dare character'))
      
      this.testResults.push({
        test: 'Character Selection',
        status: 'PASSED',
        sessionId,
        details: 'Selected Cardi Dare character successfully'
      })
      
    } catch (error) {
      console.log(chalk.red(`❌ Character Selection test failed: ${error.message}`))
      
      this.testResults.push({
        test: 'Character Selection',
        status: 'FAILED',
        error: error.message
      })
    }
  }

  async testContentGeneration(sessionId) {
    console.log(chalk.yellow('✍️ テスト5: Content Generation - 投稿生成完了'))
    
    try {
      // 1. 投稿生成の完了を待つ
      console.log(chalk.blue('⌛ Waiting for content generation completion...'))
      
      await this.page.waitForSelector('.bg-green-50', { timeout: 120000 }) // 2分待機
      console.log(chalk.green('✅ Content generation completed'))
      
      // 2. 完了メッセージの確認
      const completionMessage = await this.page.$('h3:has-text("生成完了")')
      if (completionMessage) {
        console.log(chalk.green('✅ Completion message displayed'))
      }
      
      // 3. 下書き確認ボタンの確認
      const draftButton = await this.page.$('button:has-text("下書きを確認")')
      if (draftButton) {
        console.log(chalk.green('✅ Draft button available'))
      }
      
      this.testResults.push({
        test: 'Content Generation',
        status: 'PASSED',
        sessionId,
        details: 'Content generation completed successfully'
      })
      
    } catch (error) {
      console.log(chalk.red(`❌ Content Generation test failed: ${error.message}`))
      
      this.testResults.push({
        test: 'Content Generation',
        status: 'FAILED',
        error: error.message
      })
    }
  }

  async testDraftNavigation() {
    console.log(chalk.yellow('📄 テスト6: Draft Navigation - 下書きページ遷移'))
    
    try {
      // 1. 下書き確認ボタンをクリック
      await this.page.click('button:has-text("下書きを確認")')
      console.log(chalk.green('✅ Draft button clicked'))
      
      // 2. 下書きページへの遷移を確認
      await this.page.waitForURL('**/drafts', { timeout: 10000 })
      console.log(chalk.green('✅ Navigated to drafts page'))
      
      // 3. 作成された下書きの確認
      await this.page.waitForSelector('.bg-white', { timeout: 5000 })
      
      const draftCards = await this.page.$$('.bg-white')
      console.log(chalk.blue(`📊 Found ${draftCards.length} draft items`))
      
      this.testResults.push({
        test: 'Draft Navigation',
        status: 'PASSED',
        details: `Found ${draftCards.length} draft items`
      })
      
    } catch (error) {
      console.log(chalk.red(`❌ Draft Navigation test failed: ${error.message}`))
      
      this.testResults.push({
        test: 'Draft Navigation',
        status: 'FAILED',
        error: error.message
      })
    }
  }

  async runFullTest() {
    try {
      await this.initialize()
      
      console.log(chalk.bold.blue('🧪 フロントエンド完全フローテスト開始'))
      console.log(chalk.gray('=' .repeat(60)))
      
      const sessionId = await this.testCreateFlow()
      await this.testFlowProgress(sessionId)
      await this.testConceptSelection(sessionId)
      await this.testCharacterSelection(sessionId)
      await this.testContentGeneration(sessionId)
      await this.testDraftNavigation()
      
      this.displayResults()
      
    } catch (error) {
      console.log(chalk.red(`💥 Test suite failed: ${error.message}`))
    } finally {
      if (this.browser) {
        console.log(chalk.blue('🔚 Closing browser...'))
        await this.browser.close()
      }
    }
  }

  displayResults() {
    console.log(chalk.bold.green('\n📊 テスト結果サマリー'))
    console.log(chalk.gray('=' .repeat(60)))
    
    let passed = 0
    let failed = 0
    
    for (const result of this.testResults) {
      const status = result.status === 'PASSED' 
        ? chalk.green('✅ PASSED')
        : chalk.red('❌ FAILED')
      
      console.log(`${status} ${result.test}`)
      
      if (result.details) {
        console.log(chalk.gray(`   └─ ${result.details}`))
      }
      
      if (result.error) {
        console.log(chalk.red(`   └─ Error: ${result.error}`))
      }
      
      if (result.status === 'PASSED') passed++
      else failed++
    }
    
    console.log(chalk.gray('─'.repeat(60)))
    console.log(chalk.blue(`Total: ${this.testResults.length} | Passed: ${passed} | Failed: ${failed}`))
    
    if (failed === 0) {
      console.log(chalk.bold.green('🎉 All tests passed! Frontend flow is working correctly.'))
    } else {
      console.log(chalk.bold.red('🚨 Some tests failed. Check the errors above.'))
    }
  }
}

// メイン実行
if (require.main === module) {
  const tester = new FrontendFlowTester()
  tester.runFullTest().catch(console.error)
}

module.exports = FrontendFlowTester