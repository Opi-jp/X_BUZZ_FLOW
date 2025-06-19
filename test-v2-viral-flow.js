#!/usr/bin/env node

/**
 * V2バイラルコンテンツ生成フローの自動テスト
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

    // 2. Generationセクションを探してクリック
    console.log(chalk.blue('📍 Generationセクションを開く...'));
    const generationSection = await page.evaluateHandle(() => {
      const elements = Array.from(document.querySelectorAll('div'));
      return elements.find(el => el.textContent.includes('Generation'));
    });
    await generationSection.click();
    await page.waitForTimeout(1000);
    results.push({ step: 'Generation開く', status: '✅' });

    // 3. Contentリンクをクリック
    console.log(chalk.blue('📍 Contentページへ移動...'));
    await page.waitForSelector('a[href="/generation/content"]');
    await page.click('a[href="/generation/content"]');
    await page.waitForNavigation();
    results.push({ step: 'Contentページ', status: '✅' });

    // 4. テーマを入力
    console.log(chalk.blue('📍 テーマを入力...'));
    await page.type('input[name="theme"]', 'AIと働き方の未来');
    await page.waitForTimeout(500);
    results.push({ step: 'テーマ入力', status: '✅' });

    // 5. 送信ボタンをクリック
    console.log(chalk.blue('📍 テーマを送信...'));
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    results.push({ step: 'テーマ送信', status: '✅' });

    // 6. Perplexity実行を待つ
    console.log(chalk.blue('📍 Perplexityでトピック収集中...'));
    await page.waitForSelector('button:has-text("コンセプトを生成")', { timeout: 30000 });
    results.push({ step: 'Perplexity完了', status: '✅' });

    // 7. コンセプト生成ボタンをクリック
    console.log(chalk.blue('📍 GPTでコンセプト生成...'));
    await page.click('button:has-text("コンセプトを生成")');
    await page.waitForTimeout(3000);
    results.push({ step: 'GPT実行', status: '✅' });

    // 8. コンセプト選択画面を待つ
    console.log(chalk.blue('📍 コンセプト選択画面を確認...'));
    await page.waitForSelector('input[type="checkbox"]', { timeout: 30000 });
    results.push({ step: 'コンセプト表示', status: '✅' });

    // 9. コンセプトを選択（最初の2つ）
    console.log(chalk.blue('📍 コンセプトを選択...'));
    const checkboxes = await page.$$('input[type="checkbox"]');
    if (checkboxes.length >= 2) {
      await checkboxes[0].click();
      await checkboxes[1].click();
    }
    results.push({ step: 'コンセプト選択', status: '✅' });

    // 10. 次へボタンをクリック
    console.log(chalk.blue('📍 キャラクター選択へ...'));
    await page.click('button:has-text("次へ")');
    await page.waitForTimeout(2000);
    results.push({ step: 'キャラクター画面', status: '✅' });

  } catch (error) {
    console.error(chalk.red('❌ エラー発生:'), error.message);
    results.push({ step: 'エラー', status: `❌ ${error.message}` });
  }

  // 結果表示
  console.log('\n' + chalk.green('=== テスト結果 ==='));
  results.forEach(r => {
    console.log(`${r.status} ${r.step}`);
  });

  // ブラウザは開いたままにする（確認用）
  console.log(chalk.yellow('\n⚠️  ブラウザを閉じるにはCtrl+Cを押してください'));
}

// 実行
testV2ViralFlow().catch(console.error);