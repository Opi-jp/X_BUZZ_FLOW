#!/usr/bin/env node

/**
 * バックエンドエラー自動キャプチャツール
 * 
 * Next.js APIルートのエラーを自動的に検出して記録
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const chalk = require('chalk');
const chokidar = require('chokidar');

class BackendErrorCapture {
  constructor() {
    this.errorDir = '.error-details';
    this.logFile = 'logs/backend-errors.log';
    this.lastErrors = new Map();
    this.errorPatterns = [
      // Prismaエラー
      /Cannot read properties of undefined \(reading '(\w+)'\)/,
      /PrismaClientKnownRequestError/,
      /Invalid `prisma\.(\w+)\.(\w+)\(\)` invocation/,
      /The column `(\w+)` does not exist/,
      
      // APIエラー
      /Failed to (\w+)/,
      /Internal Server Error/,
      /TypeError: (.+)/,
      /ReferenceError: (.+)/,
      
      // 環境変数エラー
      /(\w+) is not defined in environment variables/,
      /Missing required environment variable: (\w+)/,
      
      // 認証エラー
      /Unauthorized/,
      /Authentication failed/,
      /Invalid token/
    ];
  }

  async start() {
    console.log(chalk.cyan('🎯 Backend Error Capture System'));
    console.log(chalk.yellow('================================'));
    
    // ディレクトリの確認
    await this.ensureDirectories();
    
    // tmuxペインの監視
    this.startTmuxMonitoring();
    
    // ログファイルの監視
    this.startLogMonitoring();
    
    console.log(chalk.green('✅ バックエンドエラー監視を開始しました'));
    console.log(chalk.gray('監視対象:'));
    console.log(chalk.gray('  - tmux claude-dev:next ウィンドウ'));
    console.log(chalk.gray('  - logs/backend-errors.log'));
  }

  async ensureDirectories() {
    const dirs = [this.errorDir, 'logs', '.error-capture'];
    for (const dir of dirs) {
      if (!fsSync.existsSync(dir)) {
        await fs.mkdir(dir, { recursive: true });
      }
    }
  }

  startTmuxMonitoring() {
    // 5秒ごとにtmuxペインをチェック
    setInterval(async () => {
      try {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        // claude-dev:nextペインの内容を取得
        const { stdout } = await execAsync('tmux capture-pane -t claude-dev:next -p | tail -100');
        
        // エラーパターンをチェック
        for (const pattern of this.errorPatterns) {
          const matches = stdout.match(pattern);
          if (matches) {
            await this.captureError({
              type: 'API Error',
              pattern: pattern.toString(),
              match: matches[0],
              context: this.extractContext(stdout, matches.index),
              timestamp: new Date().toISOString()
            });
          }
        }
        
        // 500エラーをチェック
        const serverErrors = stdout.match(/(\w+) (\/api\/[^\s]+) 500 in (\d+)ms/g);
        if (serverErrors) {
          for (const error of serverErrors) {
            await this.captureError({
              type: '500 Error',
              error: error,
              context: this.extract500Context(stdout, error),
              timestamp: new Date().toISOString()
            });
          }
        }
      } catch (error) {
        // tmuxが利用できない場合は無視
      }
    }, 5000);
  }

  startLogMonitoring() {
    // ログファイルが存在しない場合は作成
    if (!fsSync.existsSync(this.logFile)) {
      fsSync.writeFileSync(this.logFile, '');
    }

    // ログファイルの監視
    const watcher = chokidar.watch(this.logFile, {
      persistent: true,
      usePolling: true,
      interval: 1000
    });

    watcher.on('change', async () => {
      try {
        const content = await fs.readFile(this.logFile, 'utf8');
        const lines = content.split('\n').slice(-50); // 最新50行
        
        for (const line of lines) {
          for (const pattern of this.errorPatterns) {
            if (pattern.test(line)) {
              await this.captureError({
                type: 'Log Error',
                line: line,
                pattern: pattern.toString(),
                timestamp: new Date().toISOString()
              });
            }
          }
        }
      } catch (error) {
        // ログ読み取りエラーは無視
      }
    });
  }

  extractContext(content, index) {
    const lines = content.split('\n');
    let lineIndex = 0;
    let charCount = 0;
    
    // エラーが含まれる行を特定
    for (let i = 0; i < lines.length; i++) {
      if (charCount + lines[i].length >= index) {
        lineIndex = i;
        break;
      }
      charCount += lines[i].length + 1;
    }
    
    // 前後5行を抽出
    const start = Math.max(0, lineIndex - 5);
    const end = Math.min(lines.length, lineIndex + 6);
    
    return lines.slice(start, end).join('\n');
  }

  extract500Context(content, errorLine) {
    const lines = content.split('\n');
    const errorIndex = lines.findIndex(line => line.includes(errorLine));
    
    if (errorIndex === -1) return errorLine;
    
    // エラーの前20行を確認してスタックトレースを探す
    const start = Math.max(0, errorIndex - 20);
    const contextLines = lines.slice(start, errorIndex + 1);
    
    // スタックトレースやエラーメッセージを抽出
    const relevantLines = contextLines.filter(line => 
      line.includes('Error') ||
      line.includes('at ') ||
      line.includes('TypeError') ||
      line.includes('ReferenceError') ||
      line.includes('Cannot read')
    );
    
    return relevantLines.join('\n') || errorLine;
  }

  async captureError(errorData) {
    // 重複チェック（5分以内の同じエラーは無視）
    const errorKey = JSON.stringify(errorData.match || errorData.error || errorData.line);
    const lastSeen = this.lastErrors.get(errorKey);
    
    if (lastSeen && Date.now() - lastSeen < 5 * 60 * 1000) {
      return;
    }
    
    this.lastErrors.set(errorKey, Date.now());
    
    // エラーを記録
    const errorId = `backend-${Date.now()}`;
    const errorRecord = {
      id: errorId,
      ...errorData,
      capturedAt: new Date().toISOString(),
      resolved: false
    };
    
    // ファイルに保存
    const filename = path.join(this.errorDir, `${errorId}.json`);
    await fs.writeFile(filename, JSON.stringify(errorRecord, null, 2));
    
    // コンソールに通知
    console.log(chalk.red(`\n🚨 バックエンドエラーを検出: ${errorData.type}`));
    if (errorData.match) {
      console.log(chalk.yellow(`   ${errorData.match}`));
    } else if (errorData.error) {
      console.log(chalk.yellow(`   ${errorData.error}`));
    }
    console.log(chalk.gray(`   詳細: ${filename}`));
    
    // 特定のエラーに対する自動提案
    this.suggestFix(errorData);
  }

  suggestFix(errorData) {
    const suggestions = [];
    
    if (errorData.match?.includes("Cannot read properties of undefined (reading 'viralSession')")) {
      suggestions.push('Prismaクライアントが正しく初期化されていません');
      suggestions.push('1. npx prisma generate を実行');
      suggestions.push('2. サーバーを再起動');
      suggestions.push('3. import文を確認');
    }
    
    if (errorData.match?.includes('environment variables')) {
      suggestions.push('環境変数が設定されていません');
      suggestions.push('1. .env.localファイルを確認');
      suggestions.push('2. DATABASE_URLが正しく設定されているか確認');
    }
    
    if (errorData.error?.includes('500')) {
      suggestions.push('サーバーエラーが発生しています');
      suggestions.push('詳細なスタックトレースを確認してください');
    }
    
    if (suggestions.length > 0) {
      console.log(chalk.cyan('\n💡 修正提案:'));
      suggestions.forEach(s => console.log(chalk.gray(`   - ${s}`)));
    }
  }
}

// メイン実行
async function main() {
  const capture = new BackendErrorCapture();
  await capture.start();
  
  // 統計情報を定期的に表示
  setInterval(async () => {
    const files = fsSync.readdirSync('.error-details')
      .filter(f => f.startsWith('backend-') && f.endsWith('.json'));
    
    if (files.length > 0) {
      console.log(chalk.cyan(`\n📊 バックエンドエラー統計: ${files.length}件記録済み`));
    }
  }, 60000); // 1分ごと
}

main().catch(console.error);

// グレースフルシャットダウン
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n👋 Backend Error Capture を終了します'));
  process.exit(0);
});