#!/usr/bin/env node

/**
 * 自動エラーキャプチャツール
 * 
 * エラーが発生した瞬間に自動的に詳細情報を収集して記録
 * 
 * 使い方:
 * 1. 開発サーバーと一緒に起動
 * 2. エラーログを監視
 * 3. エラーパターンを検出したら自動記録
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const chalk = require('chalk');
const notifier = require('node-notifier');

const ERROR_LOG_FILE = path.join(process.cwd(), '.error-capture.log');
const ERROR_PATTERNS = [
  // Next.jsエラー
  /Error: (.+)/,
  /TypeError: (.+)/,
  /ReferenceError: (.+)/,
  /SyntaxError: (.+)/,
  
  // ビルドエラー
  /Failed to compile/,
  /Module not found: (.+)/,
  /Cannot find module '(.+)'/,
  
  // TypeScriptエラー
  /TS\d+: (.+)/,
  
  // Prismaエラー
  /PrismaClientKnownRequestError/,
  /Invalid `prisma\.(.+)` invocation/,
  /The column (.+) does not exist/,
  /Foreign key constraint failed/,
  /Unique constraint failed/,
  
  // APIエラー
  /fetch failed/,
  /NetworkError/,
  /Response status: (\d+)/,
  /ECONNREFUSED/,
  /ETIMEDOUT/,
  
  // バックエンドエラー
  /UnhandledPromiseRejection/,
  /Cannot read prop(?:erty|erties) of undefined/,
  /Cannot read prop(?:erty|erties) of null/,
  /is not a function/,
  /Maximum call stack size exceeded/,
  
  // 認証エラー
  /Unauthorized/,
  /jwt expired/,
  /TokenExpiredError/,
  /JsonWebTokenError/,
  
  // バリデーションエラー
  /ValidationError/,
  /Invalid input/,
  /Required field missing/,
  
  // LLM APIエラー
  /OpenAI API error/,
  /Anthropic API error/,
  /Perplexity API error/,
  /rate limit exceeded/,
  /insufficient_quota/
];

class AutoErrorCapture {
  constructor() {
    this.capturedErrors = new Map();
    this.errorBuffer = [];
    this.isCapturing = false;
  }

  startCapture() {
    console.log(chalk.green('🎯 自動エラーキャプチャを開始しました'));
    console.log(chalk.dim('エラーを検出すると自動的に記録します...\n'));

    // 標準エラー出力をキャプチャ
    this.captureStderr();
    
    // ログファイルを監視
    this.watchLogFiles();
    
    // Next.jsのエラーオーバーレイを監視
    this.watchNextErrors();
    
    // 定期的にバッファをチェック
    setInterval(() => this.processErrorBuffer(), 2000);
  }

  captureStderr() {
    const originalStderrWrite = process.stderr.write;
    
    process.stderr.write = (chunk, encoding, callback) => {
      // エラー出力をバッファに追加
      this.errorBuffer.push({
        type: 'stderr',
        content: chunk.toString(),
        timestamp: new Date()
      });
      
      // 元の出力も実行
      return originalStderrWrite.call(process.stderr, chunk, encoding, callback);
    };
  }

  watchLogFiles() {
    const logFiles = [
      '.next/server/app-paths-manifest.json',
      'npm-debug.log',
      'yarn-error.log'
    ];

    logFiles.forEach(logFile => {
      const fullPath = path.join(process.cwd(), logFile);
      
      if (fs.existsSync(fullPath)) {
        fs.watchFile(fullPath, { interval: 1000 }, (curr, prev) => {
          if (curr.mtime > prev.mtime) {
            this.checkFileForErrors(fullPath);
          }
        });
      }
    });
  }

  watchNextErrors() {
    // Next.jsのエラーAPIエンドポイントを監視
    const checkInterval = setInterval(() => {
      fetch('http://localhost:3000/_next/webpack-hmr')
        .then(res => res.text())
        .then(data => {
          if (data.includes('error')) {
            this.errorBuffer.push({
              type: 'next-hmr',
              content: data,
              timestamp: new Date()
            });
          }
        })
        .catch(() => {
          // サーバーが起動していない場合は無視
        });
    }, 1000);
  }

  checkFileForErrors(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      ERROR_PATTERNS.forEach(pattern => {
        const match = content.match(pattern);
        if (match) {
          this.errorBuffer.push({
            type: 'file',
            source: filePath,
            content: match[0],
            timestamp: new Date()
          });
        }
      });
    } catch (error) {
      // ファイル読み込みエラーは無視
    }
  }

  processErrorBuffer() {
    if (this.errorBuffer.length === 0 || this.isCapturing) {
      return;
    }

    // エラーパターンをチェック
    const newErrors = [];
    
    for (const entry of this.errorBuffer) {
      for (const pattern of ERROR_PATTERNS) {
        const match = entry.content.match(pattern);
        if (match) {
          const errorKey = this.generateErrorKey(match[0]);
          
          // 同じエラーが既にキャプチャされていない場合
          if (!this.capturedErrors.has(errorKey)) {
            newErrors.push({
              pattern: match[0],
              fullContent: entry.content,
              type: entry.type,
              source: entry.source,
              timestamp: entry.timestamp
            });
            
            this.capturedErrors.set(errorKey, true);
          }
        }
      }
    }

    // バッファをクリア
    this.errorBuffer = [];

    // 新しいエラーがあれば処理
    if (newErrors.length > 0) {
      this.isCapturing = true;
      this.captureErrors(newErrors).then(() => {
        this.isCapturing = false;
      });
    }
  }

  generateErrorKey(errorMessage) {
    // エラーメッセージから一意のキーを生成
    return errorMessage
      .replace(/\d+/g, 'N') // 数字を正規化
      .replace(/['"]/g, '') // 引用符を削除
      .substring(0, 100); // 最初の100文字
  }

  async captureErrors(errors) {
    console.log(chalk.red.bold(`\n🚨 ${errors.length}個のエラーを検出しました！`));

    for (const error of errors) {
      await this.captureError(error);
    }
  }

  async captureError(error) {
    const timestamp = new Date().toISOString();
    const errorId = `auto-${Date.now()}`;

    // エラーの詳細情報を収集
    const errorDetails = {
      id: errorId,
      timestamp,
      pattern: error.pattern,
      fullContent: error.fullContent,
      type: error.type,
      source: error.source || 'unknown',
      
      // コンテキスト情報
      context: {
        workingDirectory: process.cwd(),
        nodeVersion: process.version,
        platform: process.platform,
        memory: process.memoryUsage(),
        uptime: process.uptime()
      },
      
      // スタックトレースを抽出
      stackTrace: this.extractStackTrace(error.fullContent),
      
      // 関連ファイルを検出
      relatedFiles: this.detectRelatedFiles(error.fullContent),
      
      // エラータイプを分類
      category: this.categorizeError(error.pattern)
    };

    // エラーをファイルに記録
    await this.saveErrorDetails(errorDetails);

    // 通知を表示
    this.notifyError(errorDetails);

    // コンソールに表示
    this.displayError(errorDetails);
  }

  extractStackTrace(content) {
    const stackMatch = content.match(/at\s+.+\s+\(.+:\d+:\d+\)/g);
    return stackMatch ? stackMatch.slice(0, 5) : [];
  }

  detectRelatedFiles(content) {
    const fileMatches = content.match(/([\/\w\-\.]+\.(ts|tsx|js|jsx))(:\d+:\d+)?/g);
    return fileMatches ? [...new Set(fileMatches)] : [];
  }

  categorizeError(pattern) {
    if (pattern.includes('TypeError')) return 'Type Error';
    if (pattern.includes('Module not found')) return 'Module Error';
    if (pattern.includes('Failed to compile')) return 'Build Error';
    if (pattern.includes('Prisma') || pattern.includes('column') || pattern.includes('constraint')) return 'Database Error';
    if (pattern.includes('fetch') || pattern.includes('ECONNREFUSED') || pattern.includes('ETIMEDOUT')) return 'Network Error';
    if (pattern.includes('Unauthorized') || pattern.includes('jwt') || pattern.includes('Token')) return 'Authentication Error';
    if (pattern.includes('ValidationError') || pattern.includes('Invalid input')) return 'Validation Error';
    if (pattern.includes('OpenAI') || pattern.includes('Anthropic') || pattern.includes('Perplexity') || pattern.includes('rate limit')) return 'LLM API Error';
    if (pattern.includes('UnhandledPromiseRejection') || pattern.includes('Maximum call stack')) return 'Backend Runtime Error';
    return 'Other Error';
  }

  async saveErrorDetails(details) {
    const errorDir = path.join(process.cwd(), '.error-capture');
    await fs.promises.mkdir(errorDir, { recursive: true });

    const filePath = path.join(errorDir, `${details.id}.json`);
    await fs.promises.writeFile(filePath, JSON.stringify(details, null, 2));

    // ログファイルにも追記
    const logEntry = `[${details.timestamp}] ${details.category}: ${details.pattern}\n`;
    await fs.promises.appendFile(ERROR_LOG_FILE, logEntry);
  }

  notifyError(details) {
    // デスクトップ通知
    notifier.notify({
      title: `エラー検出: ${details.category}`,
      message: details.pattern.substring(0, 100),
      sound: true,
      wait: false
    });
  }

  displayError(details) {
    console.log(chalk.red('━'.repeat(70)));
    console.log(chalk.red.bold(`📍 ${details.category}`));
    console.log(chalk.yellow(`🕐 ${new Date(details.timestamp).toLocaleTimeString()}`));
    console.log(chalk.white(`📄 ${details.source || 'console'}`));
    console.log();
    console.log(chalk.red(details.pattern));
    
    if (details.relatedFiles.length > 0) {
      console.log();
      console.log(chalk.cyan('📁 関連ファイル:'));
      details.relatedFiles.forEach(file => {
        console.log(chalk.dim(`   ${file}`));
      });
    }
    
    if (details.stackTrace.length > 0) {
      console.log();
      console.log(chalk.magenta('📚 スタックトレース:'));
      details.stackTrace.forEach(trace => {
        console.log(chalk.dim(`   ${trace}`));
      });
    }
    
    console.log();
    console.log(chalk.green(`💾 保存済み: .error-capture/${details.id}.json`));
    console.log(chalk.dim('━'.repeat(70)));
  }

  async showSummary() {
    const errorDir = path.join(process.cwd(), '.error-capture');
    
    try {
      const files = await fs.promises.readdir(errorDir);
      const errors = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.promises.readFile(path.join(errorDir, file), 'utf-8');
          errors.push(JSON.parse(content));
        }
      }
      
      // カテゴリ別に集計
      const summary = {};
      errors.forEach(error => {
        summary[error.category] = (summary[error.category] || 0) + 1;
      });
      
      console.log(chalk.cyan.bold('\n📊 エラーサマリー\n'));
      
      Object.entries(summary).forEach(([category, count]) => {
        console.log(chalk.yellow(`${category}: ${count}件`));
      });
      
      console.log();
      console.log(chalk.dim(`合計: ${errors.length}件のエラー`));
      
    } catch (error) {
      console.log(chalk.dim('エラー記録が見つかりません'));
    }
  }
}

// メイン処理
async function main() {
  const args = process.argv.slice(2);
  const capture = new AutoErrorCapture();

  if (args.includes('--summary')) {
    await capture.showSummary();
    process.exit(0);
  }

  // 自動キャプチャを開始
  capture.startCapture();

  // プロセス終了時の処理
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n\n👋 エラーキャプチャを停止します...'));
    capture.showSummary().then(() => {
      process.exit(0);
    });
  });
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = AutoErrorCapture;