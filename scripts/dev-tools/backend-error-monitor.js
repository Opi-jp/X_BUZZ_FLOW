#!/usr/bin/env node

/**
 * バックエンドエラー専用モニター
 * 
 * APIルート、サーバーサイドレンダリング、バックグラウンドジョブのエラーを監視
 * 
 * 特徴:
 * - APIルートのエラーレスポンスを検出
 * - Next.jsサーバーログを解析
 * - LLM APIのエラーパターンを特別に監視
 * - Prismaクエリエラーの詳細記録
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { spawn } = require('child_process');

class BackendErrorMonitor {
  constructor() {
    this.errorPatterns = {
      // API Route Errors
      apiRoute: {
        patterns: [
          /API route .+ threw an error/,
          /API resolved without sending a response/,
          /API handler should not return a value/
        ],
        category: 'API Route Error'
      },
      
      // Database Errors
      database: {
        patterns: [
          /P\d{4}: (.+)/, // Prisma error codes
          /Invalid `prisma\.(\w+)\.(\w+)\(\)` invocation/,
          /Foreign key constraint .+ on table/,
          /Unique constraint failed on the fields: \((.+)\)/,
          /The table .+ does not exist in the current database/
        ],
        category: 'Database Error'
      },
      
      // LLM API Errors
      llmApi: {
        patterns: [
          /OpenAI API error: (.+)/,
          /Anthropic API error: (.+)/,
          /Perplexity API error: (.+)/,
          /429.*rate_limit_exceeded/,
          /insufficient_quota/,
          /model_not_found/
        ],
        category: 'LLM API Error'
      },
      
      // Server-Side Rendering Errors
      ssr: {
        patterns: [
          /Error occurred prerendering page/,
          /Failed to collect page data/,
          /getServerSideProps .+ threw an error/,
          /getStaticProps .+ threw an error/
        ],
        category: 'SSR Error'
      },
      
      // Runtime Errors
      runtime: {
        patterns: [
          /ECONNREFUSED.*127\.0\.0\.1:(\d+)/,
          /ETIMEDOUT/,
          /ENOTFOUND/,
          /Error: connect ECONNREFUSED/,
          /Error serializing .+ returned from/
        ],
        category: 'Runtime Error'
      }
    };
    
    this.monitoredFiles = [];
    this.errorBuffer = [];
    this.capturedErrors = new Map();
  }

  start() {
    console.log(chalk.blue.bold('🔍 バックエンドエラーモニターを起動しました'));
    console.log(chalk.dim('APIルート、データベース、LLM APIのエラーを監視中...\n'));

    // Next.jsサーバーログを監視
    this.watchServerOutput();
    
    // APIログファイルを監視
    this.watchApiLogs();
    
    // エラー処理
    setInterval(() => this.processErrors(), 3000);
  }

  watchServerOutput() {
    // Next.jsサーバープロセスの出力を監視
    const serverProcess = spawn('tail', ['-f', '.next/server/app-paths-manifest.json'], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    serverProcess.stdout.on('data', (data) => {
      this.analyzeOutput(data.toString(), 'server-stdout');
    });

    serverProcess.stderr.on('data', (data) => {
      this.analyzeOutput(data.toString(), 'server-stderr');
    });
  }

  watchApiLogs() {
    // APIアクセスログを監視
    const apiLogPath = path.join(process.cwd(), 'logs', 'api-access.log');
    
    if (fs.existsSync(apiLogPath)) {
      fs.watchFile(apiLogPath, { interval: 1000 }, (curr, prev) => {
        if (curr.mtime > prev.mtime) {
          this.checkApiLogFile(apiLogPath);
        }
      });
    }

    // カスタムエラーログも監視
    const errorLogPath = path.join(process.cwd(), 'logs', 'error.log');
    
    if (fs.existsSync(errorLogPath)) {
      fs.watchFile(errorLogPath, { interval: 1000 }, (curr, prev) => {
        if (curr.mtime > prev.mtime) {
          this.checkErrorLogFile(errorLogPath);
        }
      });
    }
  }

  analyzeOutput(content, source) {
    Object.entries(this.errorPatterns).forEach(([key, config]) => {
      config.patterns.forEach(pattern => {
        const match = content.match(pattern);
        if (match) {
          this.errorBuffer.push({
            pattern: match[0],
            category: config.category,
            content: content,
            source: source,
            timestamp: new Date(),
            details: this.extractErrorDetails(content, config.category)
          });
        }
      });
    });
  }

  extractErrorDetails(content, category) {
    const details = {
      stackTrace: [],
      affectedFile: null,
      errorCode: null,
      additionalInfo: {}
    };

    // スタックトレースを抽出
    const stackMatch = content.match(/at\s+.+\s+\(.+:\d+:\d+\)/g);
    if (stackMatch) {
      details.stackTrace = stackMatch.slice(0, 10);
    }

    // 影響を受けたファイルを検出
    const fileMatch = content.match(/([\/\w\-\.]+\.(ts|tsx|js|jsx))(?::\d+:\d+)?/);
    if (fileMatch) {
      details.affectedFile = fileMatch[1];
    }

    // カテゴリ別の詳細情報抽出
    switch (category) {
      case 'Database Error':
        // Prismaエラーコードを抽出
        const codeMatch = content.match(/P(\d{4})/);
        if (codeMatch) {
          details.errorCode = `P${codeMatch[1]}`;
          details.additionalInfo.prismaErrorMeaning = this.getPrismaErrorMeaning(details.errorCode);
        }
        
        // テーブル名を抽出
        const tableMatch = content.match(/table `?(\w+)`?/i);
        if (tableMatch) {
          details.additionalInfo.table = tableMatch[1];
        }
        break;
        
      case 'LLM API Error':
        // レート制限情報を抽出
        const rateLimitMatch = content.match(/retry_after.*?(\d+)/);
        if (rateLimitMatch) {
          details.additionalInfo.retryAfter = parseInt(rateLimitMatch[1]);
        }
        
        // APIプロバイダーを特定
        if (content.includes('OpenAI')) details.additionalInfo.provider = 'OpenAI';
        else if (content.includes('Anthropic')) details.additionalInfo.provider = 'Anthropic';
        else if (content.includes('Perplexity')) details.additionalInfo.provider = 'Perplexity';
        break;
        
      case 'API Route Error':
        // APIルートパスを抽出
        const routeMatch = content.match(/\/api\/[\/\w\-]+/);
        if (routeMatch) {
          details.additionalInfo.route = routeMatch[0];
        }
        break;
    }

    return details;
  }

  getPrismaErrorMeaning(code) {
    const errorMeanings = {
      'P1000': 'Authentication failed',
      'P1001': 'Cannot reach database server',
      'P1002': 'Database server timeout',
      'P2002': 'Unique constraint violation',
      'P2003': 'Foreign key constraint violation',
      'P2025': 'Record not found'
    };
    
    return errorMeanings[code] || 'Unknown Prisma error';
  }

  async processErrors() {
    if (this.errorBuffer.length === 0) return;

    const newErrors = [];
    
    for (const error of this.errorBuffer) {
      const errorKey = this.generateErrorKey(error);
      
      if (!this.capturedErrors.has(errorKey)) {
        newErrors.push(error);
        this.capturedErrors.set(errorKey, true);
      }
    }

    this.errorBuffer = [];

    if (newErrors.length > 0) {
      for (const error of newErrors) {
        await this.recordError(error);
      }
    }
  }

  generateErrorKey(error) {
    return `${error.category}-${error.pattern.replace(/\d+/g, 'N').substring(0, 50)}`;
  }

  async recordError(error) {
    console.log(chalk.red.bold(`\n🚨 バックエンドエラーを検出: ${error.category}`));
    console.log(chalk.yellow(`📍 ${new Date(error.timestamp).toLocaleTimeString()}`));
    console.log(chalk.white(error.pattern));

    if (error.details.affectedFile) {
      console.log(chalk.cyan(`📄 ファイル: ${error.details.affectedFile}`));
    }

    if (error.details.errorCode) {
      console.log(chalk.magenta(`🏷️  エラーコード: ${error.details.errorCode}`));
      if (error.details.additionalInfo.prismaErrorMeaning) {
        console.log(chalk.dim(`   意味: ${error.details.additionalInfo.prismaErrorMeaning}`));
      }
    }

    // 追加情報を表示
    Object.entries(error.details.additionalInfo).forEach(([key, value]) => {
      if (key !== 'prismaErrorMeaning') {
        console.log(chalk.blue(`ℹ️  ${key}: ${value}`));
      }
    });

    // スタックトレースを表示（最初の3行）
    if (error.details.stackTrace.length > 0) {
      console.log(chalk.dim('\nスタックトレース:'));
      error.details.stackTrace.slice(0, 3).forEach(trace => {
        console.log(chalk.dim(`  ${trace}`));
      });
    }

    // エラーをファイルに保存
    await this.saveError(error);
    
    // 解決策の提案
    this.suggestSolution(error);
    
    console.log(chalk.dim('─'.repeat(70)));
  }

  async saveError(error) {
    const errorDir = path.join(process.cwd(), '.backend-errors');
    await fs.promises.mkdir(errorDir, { recursive: true });

    const errorId = `backend-${Date.now()}`;
    const errorData = {
      id: errorId,
      ...error,
      savedAt: new Date().toISOString()
    };

    const filePath = path.join(errorDir, `${errorId}.json`);
    await fs.promises.writeFile(filePath, JSON.stringify(errorData, null, 2));
    
    console.log(chalk.green(`\n💾 保存済み: ${filePath}`));
  }

  suggestSolution(error) {
    console.log(chalk.yellow('\n💡 解決策の提案:'));

    switch (error.category) {
      case 'Database Error':
        if (error.details.errorCode === 'P2002') {
          console.log(chalk.dim('- 重複するデータを確認してください'));
          console.log(chalk.dim('- ユニーク制約を見直してください'));
        } else if (error.details.errorCode === 'P2003') {
          console.log(chalk.dim('- 参照先のレコードが存在するか確認してください'));
          console.log(chalk.dim('- 外部キー制約を見直してください'));
        } else if (error.details.errorCode === 'P1001') {
          console.log(chalk.dim('- データベース接続設定を確認してください'));
          console.log(chalk.dim('- DATABASE_URLとDIRECT_URLが正しいか確認してください'));
        }
        break;
        
      case 'LLM API Error':
        if (error.pattern.includes('rate_limit')) {
          console.log(chalk.dim('- APIレート制限に達しました'));
          console.log(chalk.dim('- リトライロジックを実装してください'));
          if (error.details.additionalInfo.retryAfter) {
            console.log(chalk.dim(`- ${error.details.additionalInfo.retryAfter}秒後に再試行してください`));
          }
        } else if (error.pattern.includes('insufficient_quota')) {
          console.log(chalk.dim('- APIクォータが不足しています'));
          console.log(chalk.dim('- 使用量を確認し、必要に応じてプランをアップグレードしてください'));
        }
        break;
        
      case 'API Route Error':
        console.log(chalk.dim('- APIルートのエラーハンドリングを確認してください'));
        console.log(chalk.dim('- レスポンスを正しく返しているか確認してください'));
        if (error.details.additionalInfo.route) {
          console.log(chalk.dim(`- 問題のルート: ${error.details.additionalInfo.route}`));
        }
        break;
    }
  }

  async checkApiLogFile(filePath) {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const lines = content.split('\n').slice(-100); // 最後の100行を確認
      
      lines.forEach(line => {
        // 5xx系のステータスコードを検出
        if (line.match(/\b5\d{2}\b/)) {
          this.errorBuffer.push({
            pattern: line,
            category: 'API Server Error',
            content: line,
            source: 'api-log',
            timestamp: new Date(),
            details: this.extractApiLogDetails(line)
          });
        }
      });
    } catch (error) {
      // ログファイルが読めない場合は無視
    }
  }

  extractApiLogDetails(logLine) {
    const details = {
      statusCode: null,
      method: null,
      path: null,
      duration: null
    };

    // ステータスコードを抽出
    const statusMatch = logLine.match(/\b(5\d{2})\b/);
    if (statusMatch) {
      details.statusCode = parseInt(statusMatch[1]);
    }

    // HTTPメソッドを抽出
    const methodMatch = logLine.match(/\b(GET|POST|PUT|DELETE|PATCH)\b/);
    if (methodMatch) {
      details.method = methodMatch[1];
    }

    // パスを抽出
    const pathMatch = logLine.match(/\/api\/[\/\w\-]+/);
    if (pathMatch) {
      details.path = pathMatch[0];
    }

    return details;
  }
}

// メイン処理
async function main() {
  const monitor = new BackendErrorMonitor();
  monitor.start();

  // プロセス終了時の処理
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n\n👋 バックエンドエラーモニターを停止します...'));
    process.exit(0);
  });
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = BackendErrorMonitor;