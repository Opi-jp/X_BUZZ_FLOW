#!/usr/bin/env node

/**
 * 開発ツール統合ランチャー
 * 全ツールをワンコマンドで起動・管理
 */

const { spawn } = require('child_process');
const chalk = require('chalk');
const readline = require('readline');
const path = require('path');

class DevLauncher {
  constructor() {
    this.tools = {
      server: {
        name: '開発サーバー',
        command: 'npm',
        args: ['run', 'dev'],
        color: chalk.blue,
        port: 3000,
        essential: true
      },
      debugger: {
        name: '統合デバッガー',
        command: 'node',
        args: ['scripts/dev-tools/unified-frontend-debugger.js'],
        color: chalk.green,
        port: 3335,
        essential: true
      },
      errorCollector: {
        name: 'エラーコレクター',
        command: 'node',
        args: ['scripts/dev-tools/smart-error-collector.js'],
        color: chalk.yellow,
        essential: false,
        oneShot: true // 一度実行して終了
      },
      syntaxGuard: {
        name: 'Syntax Guardian',
        command: 'node',
        args: ['scripts/dev-tools/syntax-guardian.js'],
        color: chalk.cyan,
        essential: true
      },
      linkChecker: {
        name: 'リンクチェッカー',
        command: 'node',
        args: ['scripts/dev-tools/page-link-checker.js'],
        color: chalk.magenta,
        port: 3338,
        essential: false
      }
    };
    
    this.processes = {};
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async start() {
    console.clear();
    console.log(chalk.bold.green('🚀 X_BUZZ_FLOW 開発環境ランチャー\n'));
    
    // メニュー表示
    this.showMenu();
  }

  showMenu() {
    console.log(chalk.bold('\n選択してください:'));
    console.log(chalk.gray('────────────────────────────────'));
    console.log(chalk.green('1') + ' - 必須ツールのみ起動（サーバー + デバッガー + Syntax）');
    console.log(chalk.blue('2') + ' - 全ツール起動');
    console.log(chalk.yellow('3') + ' - エラーチェックのみ実行（ワンショット）');
    console.log(chalk.cyan('4') + ' - カスタム選択');
    console.log(chalk.red('q') + ' - 終了');
    console.log(chalk.gray('────────────────────────────────'));
    
    this.rl.question('\n選択 > ', (answer) => {
      this.handleMenuChoice(answer);
    });
  }

  async handleMenuChoice(choice) {
    switch (choice) {
      case '1':
        await this.startEssentialTools();
        break;
      case '2':
        await this.startAllTools();
        break;
      case '3':
        await this.runErrorCheck();
        break;
      case '4':
        await this.customSelection();
        break;
      case 'q':
        this.shutdown();
        break;
      default:
        console.log(chalk.red('無効な選択です'));
        this.showMenu();
    }
  }

  async startEssentialTools() {
    console.log(chalk.green('\n🚀 必須ツールを起動中...\n'));
    
    // 必須ツールのみ起動
    for (const [key, tool] of Object.entries(this.tools)) {
      if (tool.essential && !tool.oneShot) {
        await this.startTool(key, tool);
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2秒待機
      }
    }
    
    this.showRunningTools();
    this.showCommands();
  }

  async startAllTools() {
    console.log(chalk.blue('\n🚀 全ツールを起動中...\n'));
    
    for (const [key, tool] of Object.entries(this.tools)) {
      if (!tool.oneShot) {
        await this.startTool(key, tool);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    this.showRunningTools();
    this.showCommands();
  }

  async runErrorCheck() {
    console.log(chalk.yellow('\n🔍 エラーチェックを実行中...\n'));
    
    // エラーコレクターを実行
    const collector = spawn('node', ['scripts/dev-tools/smart-error-collector.js'], {
      stdio: 'inherit'
    });
    
    collector.on('close', (code) => {
      console.log(chalk.green('\n✅ エラーチェック完了'));
      this.showMenu();
    });
  }

  async customSelection() {
    console.log(chalk.cyan('\n🎯 起動するツールを選択:\n'));
    
    const toolKeys = Object.keys(this.tools);
    toolKeys.forEach((key, index) => {
      const tool = this.tools[key];
      console.log(`${index + 1}. ${tool.name}`);
    });
    
    this.rl.question('\n番号をスペース区切りで入力 (例: 1 3 4) > ', async (answer) => {
      const indices = answer.split(' ').map(n => parseInt(n) - 1);
      
      for (const index of indices) {
        if (index >= 0 && index < toolKeys.length) {
          const key = toolKeys[index];
          const tool = this.tools[key];
          if (!tool.oneShot) {
            await this.startTool(key, tool);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
      
      this.showRunningTools();
      this.showCommands();
    });
  }

  async startTool(key, tool) {
    if (this.processes[key]) {
      console.log(chalk.yellow(`⚠️  ${tool.name} は既に起動しています`));
      return;
    }
    
    console.log(tool.color(`📦 ${tool.name} を起動中...`));
    
    const child = spawn(tool.command, tool.args, {
      stdio: 'pipe',
      shell: true
    });
    
    this.processes[key] = child;
    
    // 出力に色を付けて表示
    child.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');
      lines.forEach(line => {
        if (line.trim()) {
          console.log(tool.color(`[${tool.name}] ${line}`));
        }
      });
    });
    
    child.stderr.on('data', (data) => {
      console.error(chalk.red(`[${tool.name}] ${data}`));
    });
    
    child.on('close', (code) => {
      console.log(tool.color(`[${tool.name}] プロセス終了 (code ${code})`));
      delete this.processes[key];
    });
  }

  showRunningTools() {
    console.log(chalk.bold.green('\n\n✅ 起動中のツール:\n'));
    
    Object.entries(this.processes).forEach(([key, process]) => {
      const tool = this.tools[key];
      console.log(tool.color(`  • ${tool.name}${tool.port ? ` (ポート: ${tool.port})` : ''}`));
    });
  }

  showCommands() {
    console.log(chalk.bold.yellow('\n\n📌 コマンド:\n'));
    console.log(chalk.gray('  r  - ツールを再起動'));
    console.log(chalk.gray('  s  - ステータス表示'));
    console.log(chalk.gray('  e  - エラーチェック実行'));
    console.log(chalk.gray('  c  - コンソールクリア'));
    console.log(chalk.gray('  q  - 全て終了'));
    console.log(chalk.gray('────────────────────────────────\n'));
    
    this.waitForCommand();
  }

  waitForCommand() {
    this.rl.question('', (cmd) => {
      switch (cmd.toLowerCase()) {
        case 'r':
          this.restartTools();
          break;
        case 's':
          this.showRunningTools();
          this.showCommands();
          break;
        case 'e':
          this.runErrorCheck();
          break;
        case 'c':
          console.clear();
          this.showRunningTools();
          this.showCommands();
          break;
        case 'q':
          this.shutdown();
          break;
        default:
          this.waitForCommand();
      }
    });
  }

  async restartTools() {
    console.log(chalk.yellow('\n🔄 ツールを再起動中...\n'));
    
    // 現在のプロセスを保存
    const runningTools = Object.keys(this.processes);
    
    // 全て停止
    this.stopAllProcesses();
    
    // 2秒待機
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 再起動
    for (const key of runningTools) {
      const tool = this.tools[key];
      await this.startTool(key, tool);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    this.showRunningTools();
    this.showCommands();
  }

  stopAllProcesses() {
    Object.entries(this.processes).forEach(([key, process]) => {
      console.log(chalk.gray(`停止中: ${this.tools[key].name}`));
      process.kill('SIGTERM');
    });
    this.processes = {};
  }

  shutdown() {
    console.log(chalk.red('\n\n🛑 全ツールを終了中...\n'));
    
    this.stopAllProcesses();
    
    setTimeout(() => {
      console.log(chalk.green('👋 終了しました\n'));
      this.rl.close();
      process.exit(0);
    }, 1000);
  }
}

// エラーハンドリング
process.on('SIGINT', () => {
  const launcher = global.launcher;
  if (launcher) {
    launcher.shutdown();
  } else {
    process.exit(0);
  }
});

// 起動
const launcher = new DevLauncher();
global.launcher = launcher;
launcher.start();