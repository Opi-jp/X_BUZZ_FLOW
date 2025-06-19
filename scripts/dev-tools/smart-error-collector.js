#!/usr/bin/env node

/**
 * スマートエラーコレクター
 * ブラウザのコンソールエラー、ネットワークエラー、実行時エラーを自動収集
 */

const puppeteer = require('puppeteer');
const chalk = require('chalk');
const fs = require('fs').promises;

class SmartErrorCollector {
  constructor() {
    this.errors = [];
    this.browser = null;
    this.page = null;
  }

  async init() {
    this.browser = await puppeteer.launch({
      headless: false,
      devtools: true,
      args: ['--auto-open-devtools-for-tabs']
    });

    this.page = await this.browser.newPage();
    
    // コンソールエラーを収集
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        this.errors.push({
          type: 'console',
          url: this.page.url(),
          message: msg.text(),
          timestamp: new Date().toISOString()
        });
        console.log(chalk.red(`🚨 Console Error: ${msg.text()}`));
      }
    });

    // ページエラーを収集
    this.page.on('pageerror', error => {
      this.errors.push({
        type: 'pageerror',
        url: this.page.url(),
        message: error.toString(),
        timestamp: new Date().toISOString()
      });
      console.log(chalk.red(`❌ Page Error: ${error.toString()}`));
    });

    // ネットワークエラーを収集
    this.page.on('requestfailed', request => {
      this.errors.push({
        type: 'network',
        url: request.url(),
        method: request.method(),
        failure: request.failure().errorText,
        timestamp: new Date().toISOString()
      });
      console.log(chalk.red(`🌐 Network Error: ${request.url()} - ${request.failure().errorText}`));
    });

    // APIレスポンスを監視
    this.page.on('response', response => {
      if (response.url().includes('/api/') && response.status() >= 400) {
        this.errors.push({
          type: 'api',
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
          timestamp: new Date().toISOString()
        });
        console.log(chalk.yellow(`⚠️  API Error: ${response.status()} ${response.url()}`));
      }
    });
  }

  async runTestFlow() {
    console.log(chalk.blue('🚀 V2バイラルコンテンツ生成フローのエラー収集開始\n'));

    try {
      // 1. コンテンツ生成ページへ直接アクセス
      console.log(chalk.gray('📍 /generation/content へアクセス...'));
      await this.page.goto('http://localhost:3000/generation/content', {
        waitUntil: 'networkidle0',
        timeout: 30000
      });
      
      await new Promise(r => setTimeout(r, 3000));

      // 2. 認証チェック
      const currentUrl = this.page.url();
      if (currentUrl.includes('/auth/signin')) {
        console.log(chalk.yellow('🔐 認証が必要です'));
        
        // モックセッションを注入
        await this.page.evaluateOnNewDocument(() => {
          window.__mockSession = {
            user: { id: 'test-user', username: 'testuser' }
          };
        });
        
        // リロード
        await this.page.reload();
        await new Promise(r => setTimeout(r, 2000));
      }

      // 3. フォーム入力を試みる
      console.log(chalk.gray('📝 フォーム入力を試行...'));
      try {
        await this.page.type('input[name="theme"]', 'AIと働き方', { delay: 100 });
        await this.page.click('button[type="submit"]');
      } catch (e) {
        console.log(chalk.yellow('⚠️  フォームが見つかりません'));
      }

      // 4. 5秒待機してエラーを収集
      await new Promise(r => setTimeout(r, 5000));

      // 5. Mission Controlもチェック
      console.log(chalk.gray('\n📍 Mission Control へアクセス...'));
      await this.page.goto('http://localhost:3000/mission-control', {
        waitUntil: 'networkidle0',
        timeout: 30000
      });
      
      await new Promise(r => setTimeout(r, 3000));

    } catch (error) {
      console.log(chalk.red(`\n❌ テスト実行エラー: ${error.message}`));
    }

    // エラーサマリーを出力
    await this.outputErrorSummary();
  }

  async outputErrorSummary() {
    console.log(chalk.green('\n\n=== エラーサマリー ===\n'));

    if (this.errors.length === 0) {
      console.log(chalk.green('✅ エラーは検出されませんでした'));
      return;
    }

    // エラーをタイプ別に分類
    const errorsByType = {};
    this.errors.forEach(error => {
      if (!errorsByType[error.type]) {
        errorsByType[error.type] = [];
      }
      errorsByType[error.type].push(error);
    });

    // タイプ別に出力
    Object.entries(errorsByType).forEach(([type, errors]) => {
      console.log(chalk.yellow(`\n${type.toUpperCase()} エラー (${errors.length}件):`));
      errors.forEach((error, index) => {
        console.log(chalk.gray(`  ${index + 1}. ${this.formatError(error)}`));
      });
    });

    // JSONファイルに保存
    const filename = `error-report-${Date.now()}.json`;
    await fs.writeFile(filename, JSON.stringify(this.errors, null, 2));
    console.log(chalk.blue(`\n📄 詳細レポート: ${filename}`));

    // 修正提案
    console.log(chalk.green('\n\n=== 修正提案 ===\n'));
    this.suggestFixes();
  }

  formatError(error) {
    switch (error.type) {
      case 'console':
        return `${error.message} (${error.url})`;
      case 'network':
        return `${error.method} ${error.url} - ${error.failure}`;
      case 'api':
        return `${error.status} ${error.statusText} - ${error.url}`;
      case 'pageerror':
        return `${error.message} (${error.url})`;
      default:
        return JSON.stringify(error);
    }
  }

  suggestFixes() {
    const suggestions = new Map();

    this.errors.forEach(error => {
      if (error.message?.includes('perplexity-sdk')) {
        suggestions.set('perplexity', '✅ Perplexity SDKの問題は修正済みです');
      }
      if (error.status === 500) {
        suggestions.set('500', '🔧 API 500エラー: サーバーログを確認してください');
      }
      if (error.status === 404) {
        suggestions.set('404', '🔧 API 404エラー: エンドポイントが未実装です');
      }
      if (error.message?.includes('session')) {
        suggestions.set('session', '🔧 セッションエラー: 認証状態を確認してください');
      }
    });

    suggestions.forEach(suggestion => {
      console.log(chalk.cyan(`  • ${suggestion}`));
    });
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// 実行
async function main() {
  const collector = new SmartErrorCollector();
  
  try {
    await collector.init();
    await collector.runTestFlow();
  } catch (error) {
    console.error(chalk.red('致命的エラー:'), error);
  } finally {
    // ブラウザは開いたままにする（手動確認用）
    console.log(chalk.yellow('\n\n⚠️  ブラウザを閉じるにはCtrl+Cを押してください'));
  }
}

main();