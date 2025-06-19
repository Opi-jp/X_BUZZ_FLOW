#!/usr/bin/env node

/**
 * ページ存在＆リンク切れチェッカー
 * 全ページとリンクをクロールして404エラーを検出
 */

const axios = require('axios');
const cheerio = require('cheerio');
const chalk = require('chalk');
const boxen = require('boxen');
const Table = require('cli-table3');

const BASE_URL = process.argv[2] || 'http://localhost:3000';
const checked = new Set();
const results = [];
const brokenLinks = [];

// 重要なページリスト（必ず存在すべきページ）
const CRITICAL_PAGES = [
  '/mission-control',
  '/generation/content',
  '/generation/drafts',
  '/generation/schedule',
  '/intelligence/news',
  '/intelligence/buzz',
  '/automation/publisher',
  '/auth/signin'
];

// APIエンドポイントリスト（存在確認）
const API_ENDPOINTS = [
  '/api/generation/content/sessions',
  '/api/generation/drafts',
  '/api/intelligence/news',
  '/api/automation/scheduled-posts',
  '/api/twitter/post'
];

// URLを正規化
function normalizeUrl(url) {
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return BASE_URL + url;
  return null;
}

// ページをチェック
async function checkPage(url, referrer = null) {
  if (checked.has(url)) return;
  checked.add(url);
  
  const startTime = Date.now();
  const result = {
    url,
    referrer,
    status: 0,
    message: '',
    duration: 0,
    links: []
  };
  
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      validateStatus: () => true // 全てのステータスコードを受け入れる
    });
    
    result.status = response.status;
    result.duration = Date.now() - startTime;
    
    if (response.status === 404) {
      result.message = '❌ ページが見つかりません';
      brokenLinks.push({ url, referrer });
    } else if (response.status >= 500) {
      result.message = '❌ サーバーエラー';
      brokenLinks.push({ url, referrer });
    } else if (response.status >= 400) {
      result.message = '⚠️ クライアントエラー';
    } else if (response.status >= 300) {
      result.message = '↪️ リダイレクト';
    } else {
      result.message = '✅ OK';
      
      // HTMLページの場合、リンクを抽出
      if (response.headers['content-type']?.includes('text/html')) {
        const $ = cheerio.load(response.data);
        
        // すべてのリンクを収集
        $('a[href]').each((i, elem) => {
          const href = $(elem).attr('href');
          if (href && !href.startsWith('#') && !href.startsWith('mailto:')) {
            const normalizedUrl = normalizeUrl(href);
            if (normalizedUrl && normalizedUrl.startsWith(BASE_URL)) {
              result.links.push(normalizedUrl);
            }
          }
        });
        
        // フォームのaction属性も収集
        $('form[action]').each((i, elem) => {
          const action = $(elem).attr('action');
          if (action) {
            const normalizedUrl = normalizeUrl(action);
            if (normalizedUrl && normalizedUrl.startsWith(BASE_URL)) {
              result.links.push(normalizedUrl);
            }
          }
        });
      }
    }
  } catch (error) {
    result.duration = Date.now() - startTime;
    if (error.code === 'ECONNREFUSED') {
      result.message = '❌ サーバーに接続できません';
    } else if (error.code === 'ETIMEDOUT') {
      result.message = '❌ タイムアウト';
    } else {
      result.message = `❌ エラー: ${error.message}`;
    }
    brokenLinks.push({ url, referrer, error: error.message });
  }
  
  results.push(result);
  
  // 進捗表示
  const icon = result.status === 200 ? '✅' : result.status === 404 ? '❌' : '⚠️';
  console.log(`${icon} [${result.status}] ${url.replace(BASE_URL, '')} (${result.duration}ms)`);
  
  // 発見したリンクを再帰的にチェック
  for (const link of result.links) {
    if (!checked.has(link)) {
      await checkPage(link, url);
    }
  }
}

// APIエンドポイントをチェック
async function checkAPI(endpoint) {
  const url = BASE_URL + endpoint;
  const startTime = Date.now();
  
  try {
    const response = await axios.get(url, {
      timeout: 5000,
      validateStatus: () => true
    });
    
    const duration = Date.now() - startTime;
    const icon = response.status < 400 ? '✅' : '❌';
    
    console.log(`${icon} [${response.status}] ${endpoint} (${duration}ms)`);
    
    return {
      endpoint,
      status: response.status,
      duration,
      success: response.status < 400
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`❌ [ERR] ${endpoint} - ${error.message}`);
    
    return {
      endpoint,
      status: 0,
      duration,
      success: false,
      error: error.message
    };
  }
}

// メイン処理
async function main() {
  console.clear();
  
  const welcomeBox = boxen(
    chalk.blue.bold('🔍 ページ＆リンクチェッカー\n\n') +
    chalk.white('全ページの存在確認とリンク切れを検出します\n\n') +
    chalk.cyan(`対象: ${BASE_URL}`),
    {
      padding: 1,
      margin: 1,
      borderStyle: 'double',
      borderColor: 'blue',
      title: '✨ Page & Link Checker',
      titleAlignment: 'center'
    }
  );
  
  console.log(welcomeBox);
  
  // 1. 重要ページのチェック
  console.log(chalk.cyan('\n📋 重要ページの確認...\n'));
  
  for (const page of CRITICAL_PAGES) {
    await checkPage(BASE_URL + page);
  }
  
  // 2. ホームページからクロール開始
  console.log(chalk.cyan('\n🕷️ 全ページをクロール...\n'));
  await checkPage(BASE_URL);
  
  // 3. APIエンドポイントのチェック
  console.log(chalk.cyan('\n🔌 APIエンドポイントの確認...\n'));
  
  const apiResults = [];
  for (const endpoint of API_ENDPOINTS) {
    const result = await checkAPI(endpoint);
    apiResults.push(result);
  }
  
  // 結果表示
  displayResults();
}

// 結果を表示
function displayResults() {
  // ページチェック結果
  const pageTable = new Table({
    head: ['ページ', 'ステータス', '応答時間', 'リンク数'],
    colWidths: [40, 15, 12, 10]
  });
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const result of results) {
    const path = result.url.replace(BASE_URL, '') || '/';
    const statusColor = result.status === 200 ? chalk.green : 
                       result.status === 404 ? chalk.red : chalk.yellow;
    
    pageTable.push([
      path,
      statusColor(result.status || 'ERR'),
      `${result.duration}ms`,
      result.links.length
    ]);
    
    if (result.status === 200) {
      successCount++;
    } else {
      errorCount++;
    }
  }
  
  console.log(chalk.bold('\n📊 ページチェック結果\n'));
  console.log(pageTable.toString());
  
  // 404エラーの詳細
  if (brokenLinks.length > 0) {
    const brokenBox = boxen(
      chalk.red.bold('🚨 リンク切れ一覧\n\n') +
      brokenLinks.map(link => 
        chalk.red(`❌ ${link.url.replace(BASE_URL, '')}\n`) +
        chalk.gray(`   参照元: ${link.referrer?.replace(BASE_URL, '') || 'なし'}`)
      ).join('\n'),
      {
        padding: 1,
        borderStyle: 'round',
        borderColor: 'red'
      }
    );
    
    console.log(brokenBox);
  }
  
  // サマリー
  const summaryBox = boxen(
    chalk.bold('📈 サマリー\n\n') +
    chalk.green(`✅ 正常: ${successCount} ページ\n`) +
    chalk.red(`❌ エラー: ${errorCount} ページ\n`) +
    chalk.cyan(`🔗 総チェック数: ${results.length} ページ`),
    {
      padding: 1,
      borderStyle: 'round',
      borderColor: errorCount > 0 ? 'red' : 'green'
    }
  );
  
  console.log(summaryBox);
  
  // 推奨アクション
  if (errorCount > 0) {
    console.log(chalk.yellow('\n💡 推奨アクション:'));
    console.log(chalk.white('  1. app/ディレクトリに該当ページが存在するか確認'));
    console.log(chalk.white('  2. リンクのhref属性が正しいパスか確認'));
    console.log(chalk.white('  3. 動的ルート [id] の場合は適切なパラメータを指定'));
  }
}

// 実行
main().catch(error => {
  console.error(chalk.red('\n実行エラー:'), error.message);
  console.log(chalk.yellow('\nサーバーが起動していることを確認してください'));
  process.exit(1);
});