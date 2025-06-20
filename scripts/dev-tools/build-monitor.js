#!/usr/bin/env node

/**
 * ビルド監視ツール
 * Next.jsのビルドプロセスを監視し、エラーを検出・記録
 */

const { spawn } = require('child_process');
const chalk = require('chalk');
const boxen = require('boxen').default || require('boxen');
const fs = require('fs').promises;
const path = require('path');
// Claude Logger を動的にインポート（エラーを避けるため）
let claudeLog;
try {
  claudeLog = require('../../lib/core/claude-logger').claudeLog;
} catch (error) {
  // claude-loggerが見つからない場合は、簡易的なログ関数を使用
  claudeLog = {
    error: (context, message, data) => {
      console.error(chalk.red(`[CLAUDE-LOG] ${message}`), data);
    },
    success: (context, message, duration) => {
      console.log(chalk.green(`[CLAUDE-LOG] ${message} (${duration}ms)`));
    },
    warn: (context, message, data) => {
      console.warn(chalk.yellow(`[CLAUDE-LOG] ${message}`), data);
    }
  };
}

// ビルド状態を保存するファイル
const BUILD_STATUS_FILE = path.join(process.cwd(), '.build-status.json');

// ビルド状態
let buildStatus = {
  lastBuildTime: null,
  lastBuildSuccess: null,
  lastBuildDuration: null,
  errors: [],
  warnings: [],
  consecutiveFailures: 0
};

// ビルド状態を保存
async function saveBuildStatus() {
  try {
    await fs.writeFile(BUILD_STATUS_FILE, JSON.stringify(buildStatus, null, 2));
  } catch (error) {
    console.error('Failed to save build status:', error);
  }
}

// ビルド状態を読み込み
async function loadBuildStatus() {
  try {
    const data = await fs.readFile(BUILD_STATUS_FILE, 'utf-8');
    buildStatus = JSON.parse(data);
  } catch (error) {
    // ファイルが存在しない場合は無視
  }
}

// ビルド実行
function runBuild() {
  const startTime = Date.now();
  
  console.clear();
  console.log(chalk.cyan('🔨 Starting Next.js build...\n'));
  
  const buildProcess = spawn('npm', ['run', 'build'], {
    cwd: process.cwd(),
    shell: true
  });
  
  let output = '';
  let errorOutput = '';
  
  buildProcess.stdout.on('data', (data) => {
    const text = data.toString();
    output += text;
    
    // リアルタイムで重要な情報を表示
    if (text.includes('Error') || text.includes('error')) {
      console.log(chalk.red(text));
    } else if (text.includes('Warning') || text.includes('warning')) {
      console.log(chalk.yellow(text));
    } else if (text.includes('✓') || text.includes('success')) {
      console.log(chalk.green(text));
    } else {
      process.stdout.write(text);
    }
  });
  
  buildProcess.stderr.on('data', (data) => {
    const text = data.toString();
    errorOutput += text;
    console.error(chalk.red(text));
  });
  
  buildProcess.on('close', async (code) => {
    const duration = Date.now() - startTime;
    const success = code === 0;
    
    // ビルド状態を更新
    buildStatus.lastBuildTime = new Date().toISOString();
    buildStatus.lastBuildSuccess = success;
    buildStatus.lastBuildDuration = duration;
    
    if (success) {
      buildStatus.consecutiveFailures = 0;
      buildStatus.errors = [];
      buildStatus.warnings = extractWarnings(output);
      
      const successBox = boxen(
        chalk.green.bold('✅ Build Successful!\n\n') +
        chalk.white(`Duration: ${(duration / 1000).toFixed(2)}s\n`) +
        chalk.yellow(`Warnings: ${buildStatus.warnings.length}`),
        {
          padding: 1,
          borderStyle: 'round',
          borderColor: 'green'
        }
      );
      
      console.log('\n' + successBox);
      
      // ClaudeLoggerに成功を記録
      claudeLog.success(
        { module: 'build', operation: 'complete' },
        'Build completed successfully',
        duration
      );
      
    } else {
      buildStatus.consecutiveFailures++;
      buildStatus.errors = extractErrors(output + errorOutput);
      
      const errorBox = boxen(
        chalk.red.bold('❌ Build Failed!\n\n') +
        chalk.white(`Duration: ${(duration / 1000).toFixed(2)}s\n`) +
        chalk.red(`Errors: ${buildStatus.errors.length}\n`) +
        chalk.yellow(`Consecutive failures: ${buildStatus.consecutiveFailures}`),
        {
          padding: 1,
          borderStyle: 'double',
          borderColor: 'red'
        }
      );
      
      console.log('\n' + errorBox);
      
      // エラー詳細を表示
      if (buildStatus.errors.length > 0) {
        console.log(chalk.red('\n📋 Error Details:\n'));
        buildStatus.errors.forEach((error, index) => {
          console.log(chalk.red(`${index + 1}. ${error.message}`));
          if (error.file) {
            console.log(chalk.gray(`   File: ${error.file}`));
          }
          if (error.line) {
            console.log(chalk.gray(`   Line: ${error.line}`));
          }
          console.log();
        });
      }
      
      // ClaudeLoggerにエラーを記録
      claudeLog.error(
        { module: 'build', operation: 'failed' },
        'Build failed',
        {
          duration,
          errors: buildStatus.errors,
          consecutiveFailures: buildStatus.consecutiveFailures
        }
      );
      
      // Claudeが読みやすい形式でエラーファイルを作成
      await createClaudeErrorReport(buildStatus.errors, errorOutput);
      
      // 連続失敗が多い場合は警告
      if (buildStatus.consecutiveFailures >= 3) {
        console.log(chalk.bgRed.white('\n⚠️  Build has failed 3+ times in a row! Consider checking:'));
        console.log(chalk.yellow('  • TypeScript errors: npm run type:watch'));
        console.log(chalk.yellow('  • Missing dependencies: npm install'));
        console.log(chalk.yellow('  • Syntax errors in recent changes'));
        console.log(chalk.yellow('  • Environment variables'));
      }
    }
    
    await saveBuildStatus();
    
    // 統合監視ダッシュボードに状態を送信
    sendToMonitoringDashboard();
  });
}

// エラーを抽出
function extractErrors(output) {
  const errors = [];
  const lines = output.split('\n');
  
  const errorPatterns = [
    /Error: (.+)/,
    /TypeError: (.+)/,
    /SyntaxError: (.+)/,
    /ReferenceError: (.+)/,
    /Failed to compile/,
    /Module not found: (.+)/,
    /Cannot find module '(.+)'/,
    /(.+):(\d+):(\d+) - error TS\d+: (.+)/
  ];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    for (const pattern of errorPatterns) {
      const match = line.match(pattern);
      if (match) {
        const error = {
          message: match[0],
          type: 'build'
        };
        
        // TypeScriptエラーの場合、詳細情報を抽出
        if (match[4]) {
          error.file = match[1];
          error.line = match[2];
          error.column = match[3];
          error.message = match[4];
          error.type = 'typescript';
        }
        
        // ファイルパスを探す
        if (i > 0 && lines[i - 1].includes('.tsx') || lines[i - 1].includes('.ts')) {
          error.file = lines[i - 1].trim();
        }
        
        errors.push(error);
        break;
      }
    }
  }
  
  return errors;
}

// 警告を抽出
function extractWarnings(output) {
  const warnings = [];
  const lines = output.split('\n');
  
  const warningPatterns = [
    /Warning: (.+)/,
    /warn - (.+)/,
    /⚠ (.+)/
  ];
  
  for (const line of lines) {
    for (const pattern of warningPatterns) {
      const match = line.match(pattern);
      if (match) {
        warnings.push({
          message: match[1] || match[0],
          type: 'warning'
        });
        break;
      }
    }
  }
  
  return warnings;
}

// Claudeが読みやすいエラーレポートを作成
async function createClaudeErrorReport(errors, fullOutput) {
  const reportPath = path.join(process.cwd(), '.claude-build-errors.md');
  
  let report = `# Build Error Report\n\n`;
  report += `**Time**: ${new Date().toISOString()}\n`;
  report += `**Error Count**: ${errors.length}\n\n`;
  
  if (errors.length > 0) {
    report += `## Errors\n\n`;
    
    errors.forEach((error, index) => {
      report += `### Error ${index + 1}\n`;
      report += `- **Type**: ${error.type}\n`;
      report += `- **Message**: ${error.message}\n`;
      if (error.file) {
        report += `- **File**: ${error.file}\n`;
      }
      if (error.line) {
        report += `- **Location**: Line ${error.line}${error.column ? `, Column ${error.column}` : ''}\n`;
      }
      report += `\n`;
    });
  }
  
  // よくあるエラーの解決策を提案
  report += `## Suggested Solutions\n\n`;
  
  const hasTSError = errors.some(e => e.type === 'typescript');
  const hasModuleError = errors.some(e => e.message.includes('Module not found'));
  const hasSyntaxError = errors.some(e => e.message.includes('SyntaxError'));
  
  if (hasTSError) {
    report += `- **TypeScript Errors**: Check type definitions and imports\n`;
    report += `  - Run \`npm run type:watch\` for real-time type checking\n`;
  }
  
  if (hasModuleError) {
    report += `- **Module Not Found**: Missing dependencies or incorrect imports\n`;
    report += `  - Run \`npm install\` to ensure all dependencies are installed\n`;
    report += `  - Check import paths are correct\n`;
  }
  
  if (hasSyntaxError) {
    report += `- **Syntax Errors**: Check for missing brackets, quotes, or semicolons\n`;
    report += `  - Use the realtime-code-checker.js tool\n`;
  }
  
  report += `\n## Full Output (Last 100 lines)\n\n\`\`\`\n`;
  const outputLines = fullOutput.split('\n');
  const lastLines = outputLines.slice(-100).join('\n');
  report += lastLines;
  report += `\n\`\`\`\n`;
  
  try {
    await fs.writeFile(reportPath, report);
    console.log(chalk.cyan(`\n📄 Error report saved to: ${reportPath}`));
    console.log(chalk.yellow('   Claude can read this file for detailed error information'));
  } catch (error) {
    console.error('Failed to create error report:', error);
  }
}

// 統合監視ダッシュボードに送信
async function sendToMonitoringDashboard() {
  try {
    const response = await fetch('http://localhost:3335/api/build-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildStatus)
    });
    
    if (!response.ok) {
      console.error('Failed to send build status to monitoring dashboard');
    }
  } catch (error) {
    // ダッシュボードが起動していない場合は無視
  }
}

// ファイル変更を監視
function watchForChanges() {
  const chokidar = require('chokidar');
  
  const watcher = chokidar.watch([
    'app/**/*.{ts,tsx,js,jsx}',
    'components/**/*.{ts,tsx,js,jsx}',
    'lib/**/*.{ts,tsx,js,jsx}',
    'pages/**/*.{ts,tsx,js,jsx}',
    'styles/**/*.css',
    'tailwind.config.ts',
    'next.config.js',
    'tsconfig.json'
  ], {
    persistent: true,
    ignoreInitial: true,
    ignored: [
      '**/node_modules/**',
      '**/.next/**',
      '**/.git/**',
      '**/dist/**',
      '**/build/**'
    ]
  });
  
  let buildTimeout;
  
  watcher.on('change', (filePath) => {
    console.log(chalk.blue(`\n📝 File changed: ${filePath}`));
    
    // デバウンス処理（ファイル保存が連続する場合に対応）
    clearTimeout(buildTimeout);
    buildTimeout = setTimeout(() => {
      console.log(chalk.yellow('⏱️  Waiting 2 seconds before build...\n'));
      setTimeout(runBuild, 2000);
    }, 500);
  });
  
  console.log(chalk.green('👀 Watching for file changes...\n'));
}

// メイン処理
async function main() {
  console.clear();
  
  const welcomeBox = boxen(
    chalk.cyan.bold('🔨 Next.js Build Monitor\n\n') +
    chalk.white('Monitoring your build process in real-time\n\n') +
    chalk.yellow('Features:\n') +
    chalk.white('  • Automatic rebuild on file changes\n') +
    chalk.white('  • Error detection and reporting\n') +
    chalk.white('  • Build time tracking\n') +
    chalk.white('  • Integration with Claude Logger\n') +
    chalk.white('  • Monitoring dashboard support\n\n') +
    chalk.green('Starting initial build...'),
    {
      padding: 1,
      margin: 1,
      borderStyle: 'double',
      borderColor: 'cyan'
    }
  );
  
  console.log(welcomeBox);
  
  await loadBuildStatus();
  
  // 初回ビルド
  setTimeout(runBuild, 1000);
  
  // ファイル監視を開始
  setTimeout(watchForChanges, 3000);
}

// プロセス終了時の処理
process.on('SIGINT', async () => {
  console.log(chalk.yellow('\n\n👋 Stopping build monitor...'));
  await saveBuildStatus();
  process.exit();
});

// エントリーポイント
main().catch(console.error);