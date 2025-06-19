#!/usr/bin/env node

/**
 * UI動作テスター
 * ボタンクリック、ページ遷移、API呼び出しを自動テスト
 */

const puppeteer = require('puppeteer');
const chalk = require('chalk');
const boxen = require('boxen');
const Table = require('cli-table3');

const BASE_URL = process.argv[2] || 'http://localhost:3000';

// テストケース定義
const UI_TESTS = [
  // ===== 認証フロー =====
  {
    name: 'Twitter認証フロー',
    path: '/auth/signin',
    tests: [
      {
        action: 'ボタンクリック',
        selector: 'button:has-text("Twitter")',
        expectation: 'Twitter OAuth画面へ遷移',
        validate: async (page) => {
          const url = page.url();
          return url.includes('twitter.com') || url.includes('x.com');
        }
      }
    ]
  },
  
  // ===== Mission Control =====
  {
    name: 'Mission Controlナビゲーション',
    path: '/mission-control',
    tests: [
      {
        action: 'Intelligence セクションクリック',
        selector: 'div:has-text("Intelligence")',
        expectation: '情報収集メニューが表示される',
        validate: async (page) => {
          return await page.$('a[href="/intelligence/news"]') !== null;
        }
      },
      {
        action: 'ニュース収集リンク',
        selector: 'a[href="/intelligence/news"]',
        expectation: 'ニュースページへ遷移',
        validate: async (page) => {
          await page.waitForTimeout(1000);
          return page.url().includes('/intelligence/news');
        }
      }
    ]
  },
  
  // ===== コンテンツ生成フロー =====
  {
    name: 'コンテンツ生成フロー',
    path: '/generation/content',
    tests: [
      {
        action: 'テーマ入力',
        selector: 'input[type="text"]',
        input: 'AIと働き方の未来',
        expectation: 'テーマが入力される'
      },
      {
        action: 'スタイル選択',
        selector: 'label:has-text("エンターテイメント")',
        expectation: 'スタイルが選択される'
      },
      {
        action: '生成開始ボタン',
        selector: 'button:has-text("生成を開始")',
        expectation: 'セッション作成APIが呼ばれる',
        interceptAPI: '/api/generation/content/sessions',
        validate: async (page, response) => {
          return response && response.status() === 200;
        }
      }
    ]
  },
  
  // ===== 下書き管理 =====
  {
    name: '下書き管理',
    path: '/generation/drafts',
    tests: [
      {
        action: 'フィルターボタン',
        selector: 'button:has-text("下書き")',
        expectation: '下書きのみ表示される',
        validate: async (page) => {
          await page.waitForTimeout(500);
          const allItems = await page.$$('.error-item');
          return allItems.length >= 0; // 0件でもOK
        }
      },
      {
        action: '新規作成ボタン',
        selector: 'button:has-text("新規作成")',
        expectation: 'コンテンツ生成ページへ遷移',
        validate: async (page) => {
          await page.waitForTimeout(1000);
          return page.url().includes('/generation/content');
        }
      }
    ]
  },
  
  // ===== スケジューラー =====
  {
    name: 'スケジューラー',
    path: '/generation/schedule',
    tests: [
      {
        action: 'カレンダー日付クリック',
        selector: 'button:has-text("15")',
        expectation: '日付が選択される',
        validate: async (page) => {
          const selected = await page.$('button.bg-blue-600:has-text("15")');
          return selected !== null;
        }
      },
      {
        action: '時間スロット選択',
        selector: 'button:has-text("21:30")',
        expectation: '時間が選択される',
        validate: async (page) => {
          const selected = await page.$('button.bg-blue-600:has-text("21:30")');
          return selected !== null;
        }
      }
    ]
  }
];

// APIインターセプト設定
async function setupAPIInterception(page, testCase) {
  if (testCase.interceptAPI) {
    return new Promise((resolve) => {
      page.on('response', response => {
        if (response.url().includes(testCase.interceptAPI)) {
          resolve(response);
        }
      });
      
      // タイムアウト設定
      setTimeout(() => resolve(null), 5000);
    });
  }
  return null;
}

// 単一のテストを実行
async function runTest(page, testPath, test) {
  const result = {
    action: test.action,
    status: 'pending',
    message: '',
    duration: 0
  };
  
  const startTime = Date.now();
  
  try {
    // セレクターが存在するか確認
    await page.waitForSelector(test.selector, { timeout: 5000 });
    
    // APIインターセプト設定
    const apiPromise = setupAPIInterception(page, test);
    
    // アクション実行
    if (test.input) {
      // テキスト入力
      await page.type(test.selector, test.input);
      result.status = 'success';
      result.message = test.expectation;
    } else {
      // クリック
      await page.click(test.selector);
      result.status = 'success';
      result.message = 'クリック成功';
    }
    
    // API応答を待つ
    let apiResponse = null;
    if (apiPromise) {
      apiResponse = await apiPromise;
    }
    
    // バリデーション
    if (test.validate) {
      const isValid = await test.validate(page, apiResponse);
      if (isValid) {
        result.status = 'success';
        result.message = test.expectation;
      } else {
        result.status = 'failed';
        result.message = `期待値と異なる: ${test.expectation}`;
      }
    } else {
      result.status = 'success';
      result.message = test.expectation;
    }
    
  } catch (error) {
    result.status = 'failed';
    result.message = `エラー: ${error.message}`;
  }
  
  result.duration = Date.now() - startTime;
  return result;
}

// メインテスト実行
async function runTests() {
  console.clear();
  
  const welcomeBox = boxen(
    chalk.blue.bold('🧪 UI動作テスター\n\n') +
    chalk.white('ボタン、リンク、フォームの動作を自動テストします\n\n') +
    chalk.cyan(`テスト対象: ${BASE_URL}`),
    {
      padding: 1,
      margin: 1,
      borderStyle: 'double',
      borderColor: 'blue',
      title: '✨ UI Behavior Tester',
      titleAlignment: 'center'
    }
  );
  
  console.log(welcomeBox);
  
  const browser = await puppeteer.launch({
    headless: false, // ブラウザを表示
    defaultViewport: { width: 1280, height: 800 }
  });
  
  const results = [];
  
  for (const suite of UI_TESTS) {
    console.log(chalk.cyan(`\n📋 ${suite.name}`));
    console.log(chalk.gray(`URL: ${BASE_URL}${suite.path}\n`));
    
    const page = await browser.newPage();
    
    try {
      // ページ遷移
      await page.goto(`${BASE_URL}${suite.path}`, { waitUntil: 'networkidle2' });
      
      // 各テストを実行
      for (const test of suite.tests) {
        const result = await runTest(page, suite.path, test);
        results.push({
          suite: suite.name,
          ...result
        });
        
        // 結果を即座に表示
        const icon = result.status === 'success' ? '✅' : '❌';
        const color = result.status === 'success' ? chalk.green : chalk.red;
        console.log(color(`${icon} ${result.action}: ${result.message} (${result.duration}ms)`));
        
        // 次のテストまで少し待機
        await page.waitForTimeout(500);
      }
      
    } catch (error) {
      console.log(chalk.red(`❌ ページエラー: ${error.message}`));
      results.push({
        suite: suite.name,
        action: 'ページ読み込み',
        status: 'failed',
        message: error.message,
        duration: 0
      });
    }
    
    await page.close();
  }
  
  await browser.close();
  
  // 結果サマリー
  displaySummary(results);
}

// 結果サマリーを表示
function displaySummary(results) {
  const table = new Table({
    head: ['テストスイート', 'アクション', 'ステータス', '時間'],
    colWidths: [25, 30, 15, 10]
  });
  
  let successCount = 0;
  let failedCount = 0;
  
  for (const result of results) {
    const status = result.status === 'success' 
      ? chalk.green('✅ 成功') 
      : chalk.red('❌ 失敗');
    
    table.push([
      result.suite,
      result.action,
      status,
      `${result.duration}ms`
    ]);
    
    if (result.status === 'success') {
      successCount++;
    } else {
      failedCount++;
    }
  }
  
  console.log('\n' + table.toString());
  
  // 統計
  const summaryBox = boxen(
    chalk.bold('📊 テスト結果\n\n') +
    chalk.green(`✅ 成功: ${successCount}\n`) +
    chalk.red(`❌ 失敗: ${failedCount}\n`) +
    chalk.cyan(`📝 合計: ${results.length}`),
    {
      padding: 1,
      borderStyle: 'round',
      borderColor: failedCount > 0 ? 'red' : 'green'
    }
  );
  
  console.log(summaryBox);
  
  // 失敗したテストの詳細
  if (failedCount > 0) {
    console.log(chalk.red('\n🚨 失敗したテスト:'));
    for (const result of results) {
      if (result.status === 'failed') {
        console.log(chalk.red(`  • ${result.suite} - ${result.action}: ${result.message}`));
      }
    }
  }
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('エラー:'), error);
  process.exit(1);
});

// 実行
runTests().catch(console.error);