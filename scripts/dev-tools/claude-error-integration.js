#!/usr/bin/env node

/**
 * Claude-devエラー統合システム
 * 
 * 機能:
 * 1. 自動エラー検出
 * 2. Claudeへの通知
 * 3. エラー解決提案
 * 4. エラー履歴管理
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const chalk = require('chalk');
const chokidar = require('chokidar');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class ClaudeErrorIntegration {
  constructor() {
    this.errorDir = '.error-details';
    this.claudeNotifyFile = '.claude-errors.md';
    this.watchPatterns = [
      'app/**/*.{js,jsx,ts,tsx}',
      'lib/**/*.{js,jsx,ts,tsx}',
      'scripts/**/*.js',
      '.next/**/*.js'
    ];
  }

  async start() {
    console.log(chalk.cyan('🤖 Claude Error Integration System'));
    console.log(chalk.yellow('================================'));
    
    // エラーディレクトリの確認
    await this.ensureDirectories();
    
    // 既存エラーのサマリー表示
    await this.showErrorSummary();
    
    // ファイル監視の開始
    this.startWatching();
    
    // 定期的なエラーチェック
    setInterval(() => this.checkForNewErrors(), 30000);
    
    console.log(chalk.green('\n✅ Claude統合エラー監視を開始しました'));
  }

  async ensureDirectories() {
    const dirs = [this.errorDir, 'logs', '.error-capture'];
    for (const dir of dirs) {
      if (!fsSync.existsSync(dir)) {
        await fs.mkdir(dir, { recursive: true });
      }
    }
  }

  async showErrorSummary() {
    try {
      const files = await fs.readdir(this.errorDir);
      const errorFiles = files.filter(f => f.endsWith('.json'));
      
      if (errorFiles.length === 0) {
        console.log(chalk.green('\n✨ 記録されたエラーはありません'));
        return;
      }

      console.log(chalk.yellow(`\n📊 エラーサマリー (${errorFiles.length}件)`));
      
      const errors = [];
      for (const file of errorFiles) {
        const data = JSON.parse(await fs.readFile(path.join(this.errorDir, file), 'utf8'));
        errors.push(data);
      }

      // 未解決エラーを優先表示
      const unresolved = errors.filter(e => !e.resolved);
      if (unresolved.length > 0) {
        console.log(chalk.red(`\n🚨 未解決エラー: ${unresolved.length}件`));
        unresolved.slice(0, 3).forEach(err => {
          console.log(chalk.yellow(`  - ${err.title}`));
          console.log(chalk.gray(`    ${err.errorMessage.split('\n')[0]}`));
        });
      }

      // カテゴリ別統計
      const categories = {};
      errors.forEach(err => {
        categories[err.category] = (categories[err.category] || 0) + 1;
      });
      
      console.log(chalk.cyan('\n📂 カテゴリ別:'));
      Object.entries(categories).forEach(([cat, count]) => {
        console.log(`  ${cat}: ${count}件`);
      });
    } catch (error) {
      console.error(chalk.red('エラーサマリーの取得に失敗:', error.message));
    }
  }

  startWatching() {
    const watcher = chokidar.watch(this.watchPatterns, {
      ignored: /node_modules/,
      persistent: true,
      ignoreInitial: true
    });

    watcher.on('change', async (filepath) => {
      // ビルドエラーファイルをチェック
      if (filepath.includes('.next')) {
        await this.checkBuildErrors();
      }
    });

    // エラーログファイルの監視
    if (fsSync.existsSync('logs/errors.log')) {
      const logWatcher = chokidar.watch('logs/errors.log', {
        persistent: true
      });
      
      logWatcher.on('change', () => this.checkLogErrors());
    }
  }

  async checkBuildErrors() {
    try {
      const { stderr } = await execAsync('npm run build 2>&1 || true');
      if (stderr && stderr.includes('error')) {
        await this.notifyClaude('Build Error Detected', stderr);
      }
    } catch (error) {
      // ビルドエラーは想定内
    }
  }

  async checkLogErrors() {
    try {
      const logs = await fs.readFile('logs/errors.log', 'utf8');
      const lines = logs.split('\n').slice(-50); // 最新50行
      const newErrors = lines.filter(line => 
        line.includes('ERROR') || 
        line.includes('FATAL') ||
        line.includes('TypeError') ||
        line.includes('ReferenceError')
      );
      
      if (newErrors.length > 0) {
        await this.notifyClaude('New Errors in Log', newErrors.join('\n'));
      }
    } catch (error) {
      // ログファイルがない場合は無視
    }
  }

  async checkForNewErrors() {
    // 最新のエラーをチェック
    try {
      const files = await fs.readdir(this.errorDir);
      const errorFiles = files
        .filter(f => f.endsWith('.json'))
        .map(f => ({
          name: f,
          path: path.join(this.errorDir, f),
          stat: fsSync.statSync(path.join(this.errorDir, f))
        }))
        .sort((a, b) => b.stat.mtime - a.stat.mtime);

      if (errorFiles.length > 0) {
        const latestError = errorFiles[0];
        const now = Date.now();
        const fileAge = now - latestError.stat.mtime.getTime();
        
        // 5分以内の新しいエラー
        if (fileAge < 5 * 60 * 1000) {
          const errorData = JSON.parse(await fs.readFile(latestError.path, 'utf8'));
          if (!errorData.notifiedClaude) {
            await this.notifyClaudeAboutError(errorData, latestError.path);
          }
        }
      }
    } catch (error) {
      console.error(chalk.red('エラーチェック失敗:', error.message));
    }
  }

  async notifyClaudeAboutError(errorData, errorPath) {
    const notification = `
# 🚨 新しいエラーが検出されました

## エラー情報
- **タイトル**: ${errorData.title}
- **カテゴリ**: ${errorData.category}
- **発生時刻**: ${errorData.timestamp}
- **ファイル**: ${errorData.relatedFiles?.join(', ') || 'N/A'}

## エラーメッセージ
\`\`\`
${errorData.errorMessage}
\`\`\`

## スタックトレース
\`\`\`
${errorData.stackTrace || 'スタックトレースなし'}
\`\`\`

## 再現手順
${errorData.reproductionSteps || '記録されていません'}

## 試した解決策
${errorData.attemptedSolutions?.join('\n') || 'まだ試していません'}

---
*このエラーはスマートエラーレコーダーに記録されています*
`;

    // Claude通知ファイルに書き込み
    await fs.writeFile(this.claudeNotifyFile, notification);
    
    // エラーデータに通知済みフラグを追加
    errorData.notifiedClaude = true;
    await fs.writeFile(errorPath, JSON.stringify(errorData, null, 2));
    
    console.log(chalk.yellow('\n🔔 Claudeに新しいエラーを通知しました'));
    console.log(chalk.gray(`   ${errorData.title}`));
  }

  async notifyClaude(title, content) {
    const notification = `
# 🚨 ${title}

\`\`\`
${content}
\`\`\`

検出時刻: ${new Date().toISOString()}
`;

    await fs.appendFile(this.claudeNotifyFile, notification + '\n---\n');
    console.log(chalk.yellow(`🔔 Claude通知: ${title}`));
  }
}

// メイン実行
const integration = new ClaudeErrorIntegration();
integration.start().catch(console.error);

// グレースフルシャットダウン
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n👋 Claude Error Integration を終了します'));
  process.exit(0);
});