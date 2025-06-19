#!/usr/bin/env node

/**
 * 自動デバッガー起動スクリプト
 * 開発サーバーと一緒にデバッガーも起動
 */

const { spawn } = require('child_process');
const chalk = require('chalk');
const path = require('path');

console.log(chalk.cyan('🚀 開発環境を起動します...\n'));

// デバッガーサーバーを起動
const debugger = spawn('node', [
  path.join(__dirname, 'frontend-debugger-ai.js')
], {
  stdio: 'inherit'
});

// 少し待ってから開発サーバーを起動
setTimeout(() => {
  console.log(chalk.green('\n📦 Next.js開発サーバーを起動します...\n'));
  
  const nextDev = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true
  });

  // プロセス終了時の処理
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n\n👋 開発環境を終了します...'));
    debugger.kill();
    nextDev.kill();
    process.exit();
  });

}, 2000);

console.log(chalk.green(`
✨ 自動デバッガーが有効になりました！

- フロントエンドエラーが自動的にキャッチされます
- AI分析で原因と解決策が提示されます
- http://localhost:3333 でエラーを確認できます

${chalk.yellow('Ctrl+C で終了')}
`));