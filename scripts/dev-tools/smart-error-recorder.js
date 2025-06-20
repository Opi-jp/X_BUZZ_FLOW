#!/usr/bin/env node

/**
 * スマートエラー記録ツール
 * 
 * エラーの詳細を自動的に収集し、後から追記する必要をなくす
 * 
 * 特徴:
 * - 現在のコンテキストを自動記録
 * - スクリーンショットのパス記録
 * - 関連ファイルの自動検出
 * - エラーパターンの自動分類
 * - リマインダー機能
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
// readline は削除: 非対話的モードのため不要
const { exec } = require('child_process');
const { promisify } = require('util');
const chalk = require('chalk');

const execAsync = promisify(exec);
const ERRORS_FILE = path.join(process.cwd(), 'ERRORS.md');
const ERROR_DETAILS_DIR = path.join(process.cwd(), '.error-details');

class SmartErrorRecorder {
  constructor() {
    // 非対話的モードのため、readlineは不要
  }

  // 削除: readline関連のメソッドは不要
  // 非対話的モードのため、これらのメソッドは削除されました

  async collectContextInfo() {
    const context = {
      timestamp: new Date().toISOString(),
      gitBranch: await this.getGitBranch(),
      gitStatus: await this.getGitStatus(),
      recentCommits: await this.getRecentCommits(),
      nodeVersion: process.version,
      workingDirectory: process.cwd()
    };
    return context;
  }

  async getGitBranch() {
    try {
      const { stdout } = await execAsync('git branch --show-current');
      return stdout.trim();
    } catch {
      return 'unknown';
    }
  }

  async getGitStatus() {
    try {
      const { stdout } = await execAsync('git status --short');
      return stdout.trim().split('\n').slice(0, 5).join('\n'); // 最初の5行
    } catch {
      return 'unknown';
    }
  }

  async getRecentCommits() {
    try {
      const { stdout } = await execAsync('git log --oneline -5');
      return stdout.trim();
    } catch {
      return 'unknown';
    }
  }

  async detectErrorPattern(errorMessage) {
    const patterns = [
      { pattern: /prisma|database|db/i, category: 'Database', tags: ['prisma', 'db'] },
      { pattern: /type|typescript|ts\d+/i, category: 'TypeScript', tags: ['typescript', 'type-error'] },
      { pattern: /module not found|cannot find module/i, category: 'Module', tags: ['import', 'dependency'] },
      { pattern: /build|compile/i, category: 'Build', tags: ['build', 'compilation'] },
      { pattern: /api|fetch|network/i, category: 'API', tags: ['api', 'network'] },
      { pattern: /auth|permission|forbidden/i, category: 'Authentication', tags: ['auth', 'permission'] },
      { pattern: /css|style|tailwind/i, category: 'Styling', tags: ['css', 'tailwind'] }
    ];

    for (const { pattern, category, tags } of patterns) {
      if (pattern.test(errorMessage)) {
        return { category, tags };
      }
    }

    return { category: 'Other', tags: ['uncategorized'] };
  }

  async findRelatedFiles(errorMessage) {
    const files = [];
    
    // ファイルパスを抽出
    const filePathMatch = errorMessage.match(/([\/\w\-\.]+\.(ts|tsx|js|jsx))/g);
    if (filePathMatch) {
      files.push(...filePathMatch);
    }

    // 行番号も含むパターン
    const fileLineMatch = errorMessage.match(/([\/\w\-\.]+\.(ts|tsx|js|jsx)):(\d+):(\d+)/g);
    if (fileLineMatch) {
      files.push(...fileLineMatch);
    }

    return [...new Set(files)]; // 重複を削除
  }

  async saveErrorDetails(errorId, details) {
    // エラー詳細ディレクトリを作成
    await fs.mkdir(ERROR_DETAILS_DIR, { recursive: true });
    
    const detailsPath = path.join(ERROR_DETAILS_DIR, `${errorId}.json`);
    await fs.writeFile(detailsPath, JSON.stringify(details, null, 2));
    
    return detailsPath;
  }

  async recordErrorFromArgs(title, message, solution, cause) {
    console.log(chalk.red.bold('🔴 スマートエラー記録システム\n'));

    // コンテキスト情報を収集
    console.log(chalk.blue('📊 コンテキスト情報を収集中...'));
    const context = await this.collectContextInfo();

    // エラーパターンを検出
    const { category, tags } = await this.detectErrorPattern(message);
    console.log(chalk.yellow(`🏷️  検出されたカテゴリ: ${category}`));
    console.log(chalk.yellow(`🏷️  タグ: ${tags.join(', ')}`));

    // 関連ファイルを検出
    const relatedFiles = await this.findRelatedFiles(message);
    if (relatedFiles.length > 0) {
      console.log(chalk.cyan(`📁 関連ファイル: ${relatedFiles.join(', ')}`));
    }

    // エラーIDを生成
    const errorId = `error-${Date.now()}`;

    // 詳細情報を保存
    const details = {
      id: errorId,
      title,
      message,
      category,
      tags,
      relatedFiles,
      context,
      reproduceSteps: '',
      attemptedSolutions: '',
      actualSolution: solution,
      rootCause: cause,
      prevention: '',
      screenshot: '',
      recordedAt: new Date().toISOString()
    };

    const detailsPath = await this.saveErrorDetails(errorId, details);

    // ERRORS.mdに追記
    const errorEntry = this.formatErrorEntry(details);
    await this.appendToErrorsFile(errorEntry);

    console.log(chalk.green('\n✅ エラー記録を追加しました！'));
    console.log(chalk.blue(`📄 詳細情報: ${detailsPath}`));

    // リマインダーを設定
    if (solution === '調査中' || cause === '調査中') {
      console.log(chalk.yellow('\n⏰ リマインダー: このエラーは未解決です'));
      console.log(chalk.yellow('   後で詳細を更新してください'));
      
      // 未解決エラーリストに追加
      await this.addToUnresolvedList(errorId, title);
    }
  }

  // 削除: 対話的モードは不要
  // recordError() メソッドは削除されました
  // 代わりに recordErrorFromArgs() を使用してください

  formatErrorEntry(details) {
    const {
      title,
      message,
      category,
      tags,
      relatedFiles,
      reproduceSteps,
      attemptedSolutions,
      actualSolution,
      rootCause,
      prevention,
      screenshot,
      recordedAt
    } = details;

    let entry = `
## 🔴 ${title}

**カテゴリ**: ${category} | **タグ**: ${tags.join(', ')}
**記録日時**: ${new Date(recordedAt).toLocaleString('ja-JP')}
${relatedFiles.length > 0 ? `**関連ファイル**: ${relatedFiles.join(', ')}` : ''}

### 症状
\`\`\`
${message}
\`\`\`

### 再現手順
${reproduceSteps}

### 試した解決策
${attemptedSolutions}

### 実際の解決策
${actualSolution === '未解決' ? chalk.red('⚠️ 未解決') : ''}
${actualSolution}

### 根本原因
${rootCause === '調査中' ? chalk.yellow('🔍 調査中') : ''}
${rootCause}

### 再発防止策
${prevention}
${screenshot ? `\n### スクリーンショット\n![エラー画面](${screenshot})` : ''}

---
`;

    return entry;
  }

  async appendToErrorsFile(content) {
    try {
      let currentContent = await fs.readFile(ERRORS_FILE, 'utf-8');
      
      // "## 📝 エラー記録方法"の前に挿入
      const insertPoint = currentContent.indexOf('## 📝 エラー記録方法');
      if (insertPoint !== -1) {
        currentContent = 
          currentContent.slice(0, insertPoint) + 
          content + '\n' +
          currentContent.slice(insertPoint);
      } else {
        // 見つからない場合は末尾に追加
        currentContent += '\n' + content;
      }
      
      await fs.writeFile(ERRORS_FILE, currentContent);
    } catch (error) {
      console.error('エラーファイルへの書き込みに失敗:', error);
    }
  }

  async addToUnresolvedList(errorId, title) {
    const unresolvedFile = path.join(ERROR_DETAILS_DIR, 'unresolved.json');
    let unresolved = [];
    
    try {
      const data = await fs.readFile(unresolvedFile, 'utf-8');
      unresolved = JSON.parse(data);
    } catch {
      // ファイルが存在しない場合は空配列
    }
    
    unresolved.push({
      id: errorId,
      title,
      recordedAt: new Date().toISOString()
    });
    
    await fs.writeFile(unresolvedFile, JSON.stringify(unresolved, null, 2));
  }

  async showUnresolved() {
    const unresolvedFile = path.join(ERROR_DETAILS_DIR, 'unresolved.json');
    
    try {
      const data = await fs.readFile(unresolvedFile, 'utf-8');
      const unresolved = JSON.parse(data);
      
      if (unresolved.length === 0) {
        console.log(chalk.green('✅ 未解決のエラーはありません'));
        return;
      }
      
      console.log(chalk.red.bold('⚠️  未解決のエラー一覧:\n'));
      
      for (const error of unresolved) {
        const date = new Date(error.recordedAt);
        const daysAgo = Math.floor((Date.now() - date) / (1000 * 60 * 60 * 24));
        
        console.log(chalk.yellow(`• ${error.title}`));
        console.log(chalk.dim(`  ID: ${error.id}`));
        console.log(chalk.dim(`  記録: ${daysAgo}日前`));
        console.log();
      }
      
    } catch {
      console.log(chalk.dim('未解決エラーリストが見つかりません'));
    }
  }
}

// メイン処理
async function main() {
  const args = process.argv.slice(2);
  const recorder = new SmartErrorRecorder();

  try {
    if (args.includes('--unresolved')) {
      await recorder.showUnresolved();
      process.exit(0);
    }

    if (args.includes('--check-status')) {
      console.log(chalk.green('✅ スマートエラー記録システム - 状態確認'));
      console.log(chalk.yellow('\n📁 エラー記録ディレクトリ:'));
      console.log(`  - .error-details/ : ${fsSync.existsSync('.error-details') ? '✅ 存在' : '❌ 未作成'}`);
      console.log(`  - .error-capture/ : ${fsSync.existsSync('.error-capture') ? '✅ 存在' : '❌ 未作成'}`);
      console.log(`  - logs/ : ${fsSync.existsSync('logs') ? '✅ 存在' : '❌ 未作成'}`);
      
      // エラー統計
      try {
        const errorFiles = fsSync.existsSync('.error-details') ? 
          fsSync.readdirSync('.error-details').filter(f => f.endsWith('.json')) : [];
        console.log(chalk.yellow('\n📊 エラー統計:'));
        console.log(`  - 記録済みエラー数: ${errorFiles.length}`);
        
        if (errorFiles.length > 0) {
          let resolved = 0;
          let unresolved = 0;
          errorFiles.forEach(file => {
            const data = JSON.parse(fsSync.readFileSync(path.join('.error-details', file), 'utf8'));
            if (data.resolved) resolved++;
            else unresolved++;
          });
          console.log(`  - 解決済み: ${resolved}`);
          console.log(`  - 未解決: ${unresolved}`);
        }
      } catch (error) {
        console.log(chalk.red('  エラー統計の取得に失敗しました'));
      }
      
      console.log(chalk.yellow('\n💡 使い方:'));
      console.log('  - エラーを記録: node scripts/dev-tools/smart-error-recorder.js [タイトル] [メッセージ] [解決策] [原因]');
      console.log('  - 状態確認: node scripts/dev-tools/smart-error-recorder.js --check-status');
      console.log('  - 未解決エラーを表示: node scripts/dev-tools/smart-error-recorder.js --unresolved');
      console.log('  - 自動エラーキャプチャを起動: node scripts/dev-tools/auto-error-capture.js');
      process.exit(0);
    }

    // コマンドライン引数からエラー情報を取得
    if (args.length >= 4) {
      const [title, message, solution, cause] = args;
      await recorder.recordErrorFromArgs(title, message, solution, cause);
    } else {
      console.log(chalk.red('エラー: 引数が不足しています'));
      console.log(chalk.yellow('\n使い方:'));
      console.log('  node scripts/dev-tools/smart-error-recorder.js [タイトル] [メッセージ] [解決策] [原因]');
      console.log('\n例:');
      console.log('  node scripts/dev-tools/smart-error-recorder.js "API 404エラー" "collect APIが見つからない" "パスを修正" "古いAPIパスを使用"');
      console.log('\nオプション:');
      console.log('  --unresolved    未解決エラーを表示');
      console.log('  --check-status  システム状態を確認');
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red('エラーが発生しました:'), error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('予期しないエラーが発生しました:'), error);
    process.exit(1);
  });
}

module.exports = SmartErrorRecorder;