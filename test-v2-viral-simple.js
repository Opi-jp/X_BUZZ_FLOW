#!/usr/bin/env node

/**
 * V2バイラルコンテンツ生成フローの簡易テスト
 */

const puppeteer = require('puppeteer');
const chalk = require('chalk');

const BASE_URL = 'http://localhost:3000';

async function testV2ViralFlow() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--window-size=1280,800']
  });

  const page = await browser.newPage();
  const results = [];

  try {
    // 1. Mission Controlへアクセス
    console.log(chalk.blue('📍 Mission Controlへアクセス...'));
    await page.goto(`${BASE_URL}/mission-control`, { waitUntil: 'networkidle0' });
    results.push({ step: 'Mission Control', status: '✅' });

    // 2. クイックスタートの「新規セッションを開始」ボタンをクリック
    console.log(chalk.blue('📍 新規セッションを開始...'));
    await new Promise(r => setTimeout(r, 2000)); // ページ読み込み待機
    
    // ボタンを探してクリック
    const button = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.textContent.includes('新規セッションを開始'));
    });
    
    if (button) {
      await button.click();
      await page.waitForNavigation();
      results.push({ step: 'Contentページへ移動', status: '✅' });
    } else {
      throw new Error('新規セッションボタンが見つかりません');
    }

    // 3. テーマ入力フォームを待つ
    console.log(chalk.blue('📍 テーマ入力フォームを確認...'));
    await page.waitForSelector('input[name="theme"]', { timeout: 10000 });
    results.push({ step: 'テーマフォーム表示', status: '✅' });

    // 4. テーマを入力
    console.log(chalk.blue('📍 テーマを入力...'));
    await page.type('input[name="theme"]', 'AIと働き方の未来');
    await new Promise(r => setTimeout(r, 500));
    results.push({ step: 'テーマ入力', status: '✅' });

    // 5. 送信ボタンをクリック
    console.log(chalk.blue('📍 テーマを送信...'));
    await page.click('button[type="submit"]');
    results.push({ step: 'テーマ送信', status: '✅' });

    // 6. APIレスポンスを待つ
    console.log(chalk.blue('📍 Perplexityでトピック収集中...'));
    await new Promise(r => setTimeout(r, 5000));
    
    // エラーメッセージをチェック
    const errorElement = await page.$('.text-red-600');
    if (errorElement) {
      const errorText = await page.evaluate(el => el.textContent, errorElement);
      throw new Error(`API Error: ${errorText}`);
    }
    
    results.push({ step: 'API実行', status: '⏳ 処理中...' });

  } catch (error) {
    console.error(chalk.red('❌ エラー発生:'), error.message);
    results.push({ step: 'エラー', status: `❌ ${error.message}` });
  }

  // 結果表示
  console.log('\n' + chalk.green('=== テスト結果 ==='));
  results.forEach(r => {
    console.log(`${r.status} ${r.step}`);
  });

  // スクリーンショットを撮る
  await page.screenshot({ path: 'test-result.png' });
  console.log(chalk.blue('📸 スクリーンショット: test-result.png'));

  // ブラウザは開いたままにする
  console.log(chalk.yellow('\n⚠️  ブラウザを閉じるにはCtrl+Cを押してください'));
}

// 実行
testV2ViralFlow().catch(console.error);