#!/usr/bin/env node

/**
 * リアルタイムコードチェッカー
 * ファイル保存時に即座にエラーを検出して修正案を提示
 */

const chokidar = require('chokidar');
const { exec } = require('child_process');
const { promisify } = require('util');
const chalk = require('chalk');
const boxen = require('boxen');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

// 監視対象
const WATCH_PATTERNS = [
  'app/**/*.{ts,tsx,js,jsx}',
  'components/**/*.{ts,tsx,js,jsx}',
  'lib/**/*.{ts,tsx,js,jsx}',
  'utils/**/*.{ts,tsx,js,jsx}'
];

// よくあるミスのパターン
const COMMON_MISTAKES = [
  {
    pattern: /\{[^}]*$/m,
    message: '閉じカッコ } が不足している可能性',
    fix: 'カッコを閉じる'
  },
  {
    pattern: /\([^)]*$/m,
    message: '閉じカッコ ) が不足している可能性',
    fix: 'カッコを閉じる'
  },
  {
    pattern: /\[[^\]]*$/m,
    message: '閉じカッコ ] が不足している可能性',
    fix: 'カッコを閉じる'
  },
  {
    pattern: /["'][^"']*$/m,
    message: '引用符が閉じられていない可能性',
    fix: '引用符を閉じる'
  },
  {
    pattern: /console\.log\(/,
    message: 'console.logが残っています',
    fix: 'プロダクションコードではconsole.logを削除'
  },
  {
    pattern: /[^=!]==[^=]/,
    message: '厳密等価演算子(===)の使用を推奨',
    fix: '== を === に変更'
  },
  {
    pattern: /\b(var)\s+\w+/,
    message: 'varの代わりにconstまたはletを使用',
    fix: 'var を const または let に変更'
  },
  {
    pattern: /useState\([^)]*\)[^;]*$/m,
    message: 'useStateの行末にセミコロンがない可能性',
    fix: 'セミコロンを追加'
  },
  {
    pattern: /import\s+{[^}]*\s+{/,
    message: 'importの中括弧が重複している',
    fix: '余分な中括弧を削除'
  },
  {
    pattern: /export\s+default\s+function.*\(\s*\)\s*$/m,
    message: '関数本体の中括弧がない',
    fix: '{ } を追加'
  }
];

// TypeScriptエラーチェック
async function checkTypeScript(filePath) {
  try {
    const { stdout, stderr } = await execAsync(`npx tsc --noEmit --skipLibCheck ${filePath}`);
    return { success: true, output: stdout };
  } catch (error) {
    return { success: false, output: error.stdout || error.stderr };
  }
}

// ESLintチェック
async function checkESLint(filePath) {
  try {
    const { stdout } = await execAsync(`npx eslint ${filePath} --format json`);
    const results = JSON.parse(stdout);
    return results[0]?.messages || [];
  } catch (error) {
    // ESLintエラーは正常な動作
    try {
      const results = JSON.parse(error.stdout);
      return results[0]?.messages || [];
    } catch {
      return [];
    }
  }
}

// ファイルをチェック
async function checkFile(filePath) {
  console.clear();
  console.log(chalk.cyan(`\n🔍 チェック中: ${filePath}\n`));

  try {
    // ファイル内容を読み込み
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    
    let hasError = false;
    const problems = [];

    // 1. 簡単な構文チェック
    for (const mistake of COMMON_MISTAKES) {
      const matches = content.match(mistake.pattern);
      if (matches) {
        hasError = true;
        const lineNum = content.substring(0, matches.index).split('\n').length;
        problems.push({
          type: 'pattern',
          line: lineNum,
          message: mistake.message,
          fix: mistake.fix,
          severity: 'warning'
        });
      }
    }

    // 2. カッコの対応をチェック
    const bracketPairs = [
      { open: '{', close: '}' },
      { open: '(', close: ')' },
      { open: '[', close: ']' }
    ];

    for (const pair of bracketPairs) {
      const openCount = (content.match(new RegExp(`\\${pair.open}`, 'g')) || []).length;
      const closeCount = (content.match(new RegExp(`\\${pair.close}`, 'g')) || []).length;
      
      if (openCount !== closeCount) {
        hasError = true;
        problems.push({
          type: 'bracket',
          message: `${pair.open} と ${pair.close} の数が一致しません (${openCount} vs ${closeCount})`,
          fix: `不足している ${openCount > closeCount ? pair.close : pair.open} を追加`,
          severity: 'error'
        });
      }
    }

    // 3. JSX/TSXファイルの場合、タグの対応をチェック
    if (filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) {
      const tagMatches = content.match(/<(\w+)[^>]*>/g) || [];
      const tags = {};
      
      for (const tag of tagMatches) {
        const tagName = tag.match(/<(\w+)/)[1];
        if (!tag.endsWith('/>')) {
          tags[tagName] = (tags[tagName] || 0) + 1;
        }
      }
      
      const closeTagMatches = content.match(/<\/(\w+)>/g) || [];
      for (const closeTag of closeTagMatches) {
        const tagName = closeTag.match(/<\/(\w+)>/)[1];
        tags[tagName] = (tags[tagName] || 0) - 1;
      }
      
      for (const [tagName, count] of Object.entries(tags)) {
        if (count !== 0) {
          hasError = true;
          problems.push({
            type: 'jsx',
            message: `<${tagName}> タグが正しく閉じられていません`,
            fix: count > 0 ? `</${tagName}> を追加` : `余分な </${tagName}> を削除`,
            severity: 'error'
          });
        }
      }
    }

    // 4. TypeScriptチェック
    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      const tsResult = await checkTypeScript(filePath);
      if (!tsResult.success && tsResult.output) {
        const errorLines = tsResult.output.split('\n').filter(line => line.includes('error'));
        for (const errorLine of errorLines) {
          const match = errorLine.match(/\((\d+),(\d+)\): error TS\d+: (.+)/);
          if (match) {
            hasError = true;
            problems.push({
              type: 'typescript',
              line: parseInt(match[1]),
              column: parseInt(match[2]),
              message: match[3],
              severity: 'error'
            });
          }
        }
      }
    }

    // 5. ESLintチェック
    const eslintMessages = await checkESLint(filePath);
    for (const msg of eslintMessages) {
      problems.push({
        type: 'eslint',
        line: msg.line,
        column: msg.column,
        message: msg.message,
        fix: msg.fix ? 'ESLintの自動修正が利用可能' : null,
        severity: msg.severity === 2 ? 'error' : 'warning'
      });
    }

    // 結果を表示
    if (problems.length === 0) {
      const successBox = boxen(
        chalk.green.bold('✨ エラーなし！\n\n') +
        chalk.white('コードは正常です'),
        {
          padding: 1,
          borderStyle: 'round',
          borderColor: 'green'
        }
      );
      console.log(successBox);
    } else {
      displayProblems(filePath, problems, lines);
    }

  } catch (error) {
    console.error(chalk.red('ファイルチェックエラー:'), error.message);
  }
}

// 問題を表示
function displayProblems(filePath, problems, lines) {
  const errorCount = problems.filter(p => p.severity === 'error').length;
  const warningCount = problems.filter(p => p.severity === 'warning').length;
  
  const headerBox = boxen(
    chalk.red.bold(`🚨 ${errorCount} エラー, ${warningCount} 警告\n\n`) +
    chalk.yellow('ファイル: ') + chalk.cyan(filePath),
    {
      padding: 1,
      borderStyle: 'double',
      borderColor: 'red'
    }
  );
  
  console.log(headerBox);

  // 問題をグループ化して表示
  const groupedProblems = {};
  for (const problem of problems) {
    const line = problem.line || 0;
    if (!groupedProblems[line]) {
      groupedProblems[line] = [];
    }
    groupedProblems[line].push(problem);
  }

  // 行番号順にソート
  const sortedLines = Object.keys(groupedProblems).sort((a, b) => parseInt(a) - parseInt(b));
  
  for (const lineNum of sortedLines) {
    const lineProblems = groupedProblems[lineNum];
    const lineNumber = parseInt(lineNum);
    
    if (lineNumber > 0 && lineNumber <= lines.length) {
      // 該当行のコードを表示
      console.log(chalk.gray(`\n${lineNumber}: `) + chalk.white(lines[lineNumber - 1]));
    }
    
    // 問題を表示
    for (const problem of lineProblems) {
      const icon = problem.severity === 'error' ? '❌' : '⚠️';
      const color = problem.severity === 'error' ? chalk.red : chalk.yellow;
      
      console.log(color(`   ${icon} ${problem.message}`));
      if (problem.fix) {
        console.log(chalk.green(`      💡 ${problem.fix}`));
      }
    }
  }

  // クイックフィックス
  if (errorCount > 0) {
    console.log(chalk.cyan('\n🔧 クイックフィックス:'));
    console.log(chalk.white('   • npx eslint --fix ' + filePath));
    console.log(chalk.white('   • カッコの対応を確認'));
    console.log(chalk.white('   • TypeScript型定義を確認'));
  }
}

// メイン処理
console.clear();
const welcomeBox = boxen(
  chalk.green.bold('🚀 リアルタイムコードチェッカー\n\n') +
  chalk.white('ファイル保存時に自動的にエラーを検出します\n\n') +
  chalk.cyan('チェック内容:\n') +
  chalk.white('  • 構文エラー（カッコ、引用符）\n') +
  chalk.white('  • TypeScriptエラー\n') +
  chalk.white('  • ESLintルール違反\n') +
  chalk.white('  • JSXタグの対応\n') +
  chalk.white('  • よくあるミスパターン\n\n') +
  chalk.yellow('監視中...'),
  {
    padding: 1,
    margin: 1,
    borderStyle: 'double',
    borderColor: 'green',
    title: '✨ Code Checker',
    titleAlignment: 'center'
  }
);

console.log(welcomeBox);

// ファイル監視を開始
const watcher = chokidar.watch(WATCH_PATTERNS, {
  persistent: true,
  ignoreInitial: true
});

watcher.on('change', (filePath) => {
  // node_modulesやビルドファイルは無視
  if (filePath.includes('node_modules') || filePath.includes('.next')) {
    return;
  }
  
  checkFile(filePath);
});

// プロセス終了時の処理
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\n👋 コードチェッカーを終了します...'));
  watcher.close();
  process.exit();
});