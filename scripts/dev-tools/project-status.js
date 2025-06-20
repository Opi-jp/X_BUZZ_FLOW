#!/usr/bin/env node

/**
 * プロジェクトステータス統合チェックツール
 * 
 * 1コマンドでプロジェクト全体の状態を把握
 * 
 * 表示内容:
 * - Git状態（ブランチ、変更ファイル数、最新コミット）
 * - サーバー状態（Next.js、DB接続）
 * - エラー統計（最近のエラー、未解決エラー）
 * - API状態（エンドポイント数、重複）
 * - セッション状態（アクティブセッション数）
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const chalk = require('chalk');

const execAsync = promisify(exec);

class ProjectStatus {
  async checkAll() {
    console.log(chalk.blue.bold('🔍 X_BUZZ_FLOW プロジェクトステータス'));
    console.log(chalk.dim('=' .repeat(60)));
    console.log();

    // 各チェックを並列実行
    const [gitStatus, serverStatus, errorStatus, apiStatus, sessionStatus] = await Promise.all([
      this.checkGitStatus(),
      this.checkServerStatus(),
      this.checkErrorStatus(),
      this.checkApiStatus(),
      this.checkSessionStatus()
    ]);

    // 結果を表示
    this.displayGitStatus(gitStatus);
    this.displayServerStatus(serverStatus);
    this.displayErrorStatus(errorStatus);
    this.displayApiStatus(apiStatus);
    this.displaySessionStatus(sessionStatus);

    // サマリー
    this.displaySummary({
      git: gitStatus,
      server: serverStatus,
      error: errorStatus,
      api: apiStatus,
      session: sessionStatus
    });
  }

  async checkGitStatus() {
    try {
      const branch = await execAsync('git branch --show-current');
      const status = await execAsync('git status --porcelain');
      const lastCommit = await execAsync('git log -1 --oneline');
      const unpushed = await execAsync('git log origin/main..HEAD --oneline');

      const changedFiles = status.stdout.split('\n').filter(line => line.trim()).length;
      const unpushedCommits = unpushed.stdout.split('\n').filter(line => line.trim()).length;

      return {
        branch: branch.stdout.trim(),
        changedFiles,
        lastCommit: lastCommit.stdout.trim(),
        unpushedCommits,
        status: 'ok'
      };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }

  async checkServerStatus() {
    const status = {
      nextjs: 'unknown',
      port3000: 'unknown',
      database: 'unknown'
    };

    // Next.jsサーバーチェック
    try {
      const response = await fetch('http://localhost:3000/api/health');
      status.nextjs = response.ok ? 'running' : 'error';
      status.port3000 = 'active';
    } catch (error) {
      status.nextjs = 'stopped';
      status.port3000 = 'inactive';
    }

    // DB接続チェック
    try {
      const { PrismaClient } = require('@/lib/prisma');
      const prisma = new PrismaClient();
      await prisma.$connect();
      await prisma.$disconnect();
      status.database = 'connected';
    } catch (error) {
      status.database = 'disconnected';
    }

    return status;
  }

  async checkErrorStatus() {
    const status = {
      totalErrors: 0,
      unresolvedErrors: 0,
      recentErrors: [],
      mostCommonCategory: null
    };

    // ERRORS.mdから統計を取得
    try {
      const errorsContent = await fs.promises.readFile('ERRORS.md', 'utf-8');
      const errorMatches = errorsContent.match(/## 🔴/g);
      status.totalErrors = errorMatches ? errorMatches.length : 0;

      // 未解決エラーをチェック
      const unresolvedMatches = errorsContent.match(/未解決|調査中/g);
      status.unresolvedErrors = unresolvedMatches ? unresolvedMatches.length : 0;
    } catch (error) {
      // ファイルが読めない場合は無視
    }

    // 最近のエラーキャプチャをチェック
    try {
      const errorCaptureDir = '.error-capture';
      if (fs.existsSync(errorCaptureDir)) {
        const files = await fs.promises.readdir(errorCaptureDir);
        const errorFiles = files.filter(f => f.endsWith('.json')).slice(-5);
        
        for (const file of errorFiles) {
          const content = await fs.promises.readFile(path.join(errorCaptureDir, file), 'utf-8');
          const error = JSON.parse(content);
          status.recentErrors.push({
            category: error.category,
            timestamp: error.timestamp
          });
        }
      }
    } catch (error) {
      // エラーキャプチャディレクトリがない場合は無視
    }

    return status;
  }

  async checkApiStatus() {
    const status = {
      totalEndpoints: 0,
      duplicates: 0,
      unused: 0,
      categories: {}
    };

    try {
      // API依存関係スキャナーの結果を利用
      const { stdout } = await execAsync('node scripts/dev-tools/api-dependency-scanner.js --json');
      const apiData = JSON.parse(stdout);
      
      status.totalEndpoints = apiData.total || 0;
      status.duplicates = apiData.duplicates || 0;
      status.unused = apiData.unused || 0;
      status.categories = apiData.categories || {};
    } catch (error) {
      // スキャナーが実行できない場合は手動でカウント
      try {
        const apiDir = 'app/api';
        const countEndpoints = async (dir) => {
          let count = 0;
          const entries = await fs.promises.readdir(dir, { withFileTypes: true });
          
          for (const entry of entries) {
            if (entry.isDirectory()) {
              count += await countEndpoints(path.join(dir, entry.name));
            } else if (entry.name === 'route.ts' || entry.name === 'route.js') {
              count++;
            }
          }
          
          return count;
        };
        
        status.totalEndpoints = await countEndpoints(apiDir);
      } catch (err) {
        // APIディレクトリが読めない場合
      }
    }

    return status;
  }

  async checkSessionStatus() {
    const status = {
      activeSessions: 0,
      recentSessions: [],
      drafts: 0
    };

    try {
      const { PrismaClient } = require('@/lib/prisma');
      const prisma = new PrismaClient();

      // アクティブセッション数
      const sessions = await prisma.viralSession.count({
        where: {
          status: {
            not: 'COMPLETED'
          }
        }
      });
      status.activeSessions = sessions;

      // 最近のセッション
      const recentSessions = await prisma.viralSession.findMany({
        take: 3,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          createdAt: true
        }
      });
      status.recentSessions = recentSessions;

      // 下書き数
      const drafts = await prisma.viralDraftV2.count({
        where: { status: 'DRAFT' }
      });
      status.drafts = drafts;

      await prisma.$disconnect();
    } catch (error) {
      // DB接続エラーの場合
    }

    return status;
  }

  displayGitStatus(git) {
    console.log(chalk.yellow.bold('📁 Git状態'));
    
    if (git.status === 'error') {
      console.log(chalk.red(`  エラー: ${git.message}`));
    } else {
      console.log(`  ブランチ: ${chalk.green(git.branch)}`);
      console.log(`  変更ファイル: ${git.changedFiles > 0 ? chalk.yellow(git.changedFiles) : chalk.green('0')}個`);
      console.log(`  最新コミット: ${chalk.dim(git.lastCommit)}`);
      if (git.unpushedCommits > 0) {
        console.log(`  ${chalk.red('⚠️  未プッシュ')}: ${git.unpushedCommits}コミット`);
      }
    }
    console.log();
  }

  displayServerStatus(server) {
    console.log(chalk.cyan.bold('🖥️  サーバー状態'));
    
    const statusIcon = (status) => {
      switch(status) {
        case 'running':
        case 'active':
        case 'connected':
          return chalk.green('✅');
        case 'stopped':
        case 'inactive':
        case 'disconnected':
          return chalk.red('❌');
        default:
          return chalk.yellow('❓');
      }
    };

    console.log(`  Next.js: ${statusIcon(server.nextjs)} ${server.nextjs}`);
    console.log(`  Port 3000: ${statusIcon(server.port3000)} ${server.port3000}`);
    console.log(`  Database: ${statusIcon(server.database)} ${server.database}`);
    console.log();
  }

  displayErrorStatus(error) {
    console.log(chalk.red.bold('🚨 エラー状態'));
    
    console.log(`  記録済みエラー: ${error.totalErrors}個`);
    if (error.unresolvedErrors > 0) {
      console.log(`  ${chalk.yellow('⚠️  未解決')}: ${error.unresolvedErrors}個`);
    }
    
    if (error.recentErrors.length > 0) {
      console.log(`  最近のエラー:`);
      error.recentErrors.slice(0, 3).forEach(err => {
        const time = new Date(err.timestamp).toLocaleTimeString('ja-JP');
        console.log(`    ${chalk.dim(time)} - ${err.category}`);
      });
    }
    console.log();
  }

  displayApiStatus(api) {
    console.log(chalk.magenta.bold('🔌 API状態'));
    
    console.log(`  総エンドポイント: ${api.totalEndpoints}個`);
    if (api.duplicates > 0) {
      console.log(`  ${chalk.yellow('⚠️  重複')}: ${api.duplicates}個`);
    }
    if (api.unused > 0) {
      console.log(`  ${chalk.dim('未使用')}: ${api.unused}個`);
    }
    console.log();
  }

  displaySessionStatus(session) {
    console.log(chalk.blue.bold('📊 セッション状態'));
    
    console.log(`  アクティブセッション: ${session.activeSessions}個`);
    console.log(`  下書き: ${session.drafts}個`);
    
    if (session.recentSessions.length > 0) {
      console.log(`  最近のセッション:`);
      session.recentSessions.forEach(sess => {
        const time = new Date(sess.createdAt).toLocaleString('ja-JP');
        console.log(`    ${chalk.dim(sess.id.substring(0, 8))} - ${sess.status} (${time})`);
      });
    }
    console.log();
  }

  displaySummary(status) {
    console.log(chalk.dim('=' .repeat(60)));
    console.log(chalk.green.bold('📈 総合評価'));
    
    const issues = [];
    
    // 問題を検出
    if (status.git.changedFiles > 20) {
      issues.push('変更ファイルが多すぎます（コミット推奨）');
    }
    if (status.git.unpushedCommits > 5) {
      issues.push('未プッシュコミットが溜まっています');
    }
    if (status.server.nextjs !== 'running') {
      issues.push('Next.jsサーバーが起動していません');
    }
    if (status.server.database !== 'connected') {
      issues.push('データベース接続に問題があります');
    }
    if (status.error.unresolvedErrors > 5) {
      issues.push('未解決エラーが多すぎます');
    }
    if (status.api.duplicates > 0) {
      issues.push('APIエンドポイントに重複があります');
    }

    if (issues.length === 0) {
      console.log(chalk.green('  ✅ すべて正常です！'));
    } else {
      console.log(chalk.yellow(`  ⚠️  ${issues.length}個の問題があります:`));
      issues.forEach(issue => {
        console.log(chalk.yellow(`     • ${issue}`));
      });
    }
    
    console.log();
    console.log(chalk.dim('実行時刻: ' + new Date().toLocaleString('ja-JP')));
  }
}

// メイン処理
async function main() {
  const status = new ProjectStatus();
  await status.checkAll();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = ProjectStatus;