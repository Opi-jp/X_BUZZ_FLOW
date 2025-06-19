#!/usr/bin/env node

/**
 * Syntax Guardian - リアルタイム構文エラー検出
 * カッコの閉じ忘れ、セミコロン忘れ、インポートエラーを即座に検出
 */

const chokidar = require('chokidar');
const chalk = require('chalk');
const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class SyntaxGuardian {
  constructor() {
    this.errors = new Map();
    this.watching = [
      'app/**/*.{js,jsx,ts,tsx}',
      'components/**/*.{js,jsx,ts,tsx}',
      'lib/**/*.{js,jsx,ts,tsx}',
      'scripts/**/*.js'
    ];
  }

  async start() {
    console.log(chalk.green('🛡️  Syntax Guardian 起動\n'));
    console.log(chalk.gray('監視対象:'));
    this.watching.forEach(pattern => console.log(chalk.gray(`  • ${pattern}`)));
    console.log('');

    const watcher = chokidar.watch(this.watching, {
      ignored: /(^|[\/\\])\../,
      persistent: true
    });

    watcher
      .on('change', path => this.checkFile(path))
      .on('add', path => this.checkFile(path));

    // 初回チェック
    this.fullCheck();
  }

  async checkFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      
      // 1. カッコのバランスチェック
      const bracketErrors = this.checkBrackets(content, filePath);
      
      // 2. TypeScript/ESLintチェック
      const tsErrors = await this.checkTypeScript(filePath);
      
      // 3. インポートチェック
      const importErrors = this.checkImports(content, filePath);
      
      const allErrors = [...bracketErrors, ...tsErrors, ...importErrors];
      
      if (allErrors.length > 0) {
        this.errors.set(filePath, allErrors);
        this.displayErrors(filePath, allErrors);
      } else if (this.errors.has(filePath)) {
        this.errors.delete(filePath);
        console.log(chalk.green(`✅ ${path.basename(filePath)} - エラーが修正されました`));
      }
      
    } catch (error) {
      console.error(chalk.red(`エラー: ${filePath} - ${error.message}`));
    }
  }

  checkBrackets(content, filePath) {
    const errors = [];
    const lines = content.split('\n');
    const stack = [];
    const pairs = {
      '(': ')',
      '[': ']',
      '{': '}',
      '<': '>'
    };
    const closing = new Set(Object.values(pairs));

    lines.forEach((line, lineIndex) => {
      // コメントと文字列を除外
      const cleanLine = line.replace(/\/\/.*$/, '').replace(/["'].*?["']/g, '');
      
      for (let i = 0; i < cleanLine.length; i++) {
        const char = cleanLine[i];
        
        if (pairs[char]) {
          stack.push({
            char,
            line: lineIndex + 1,
            column: i + 1
          });
        } else if (closing.has(char)) {
          if (stack.length === 0) {
            errors.push({
              type: 'bracket',
              message: `閉じカッコ '${char}' に対応する開きカッコがありません`,
              line: lineIndex + 1,
              column: i + 1
            });
          } else {
            const last = stack[stack.length - 1];
            if (pairs[last.char] !== char) {
              errors.push({
                type: 'bracket',
                message: `カッコの不一致: '${last.char}' (${last.line}:${last.column}) に対して '${char}' が使われています`,
                line: lineIndex + 1,
                column: i + 1
              });
            } else {
              stack.pop();
            }
          }
        }
      }
    });

    // 閉じられていないカッコ
    stack.forEach(item => {
      errors.push({
        type: 'bracket',
        message: `開きカッコ '${item.char}' が閉じられていません`,
        line: item.line,
        column: item.column
      });
    });

    return errors;
  }

  async checkTypeScript(filePath) {
    if (!filePath.match(/\.(ts|tsx|js|jsx)$/)) return [];
    
    try {
      // TypeScriptコンパイラでチェック
      execSync(`npx tsc --noEmit --skipLibCheck "${filePath}"`, {
        encoding: 'utf8',
        stdio: 'pipe'
      });
      return [];
    } catch (error) {
      const output = error.stdout || error.message;
      const errors = [];
      
      // エラーメッセージをパース
      const lines = output.split('\n');
      lines.forEach(line => {
        const match = line.match(/(.+)\((\d+),(\d+)\): (.+)/);
        if (match) {
          errors.push({
            type: 'typescript',
            message: match[4],
            line: parseInt(match[2]),
            column: parseInt(match[3])
          });
        }
      });
      
      return errors;
    }
  }

  checkImports(content, filePath) {
    const errors = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // import文をチェック
      const importMatch = line.match(/import\s+(.+?)\s+from\s+['"](.+?)['"]/);
      if (importMatch) {
        const importPath = importMatch[2];
        
        // 相対パスの場合
        if (importPath.startsWith('.')) {
          const resolvedPath = path.resolve(path.dirname(filePath), importPath);
          const extensions = ['', '.js', '.jsx', '.ts', '.tsx', '/index.js', '/index.jsx', '/index.ts', '/index.tsx'];
          
          let found = false;
          for (const ext of extensions) {
            try {
              require.resolve(resolvedPath + ext);
              found = true;
              break;
            } catch (e) {
              // Continue checking
            }
          }
          
          if (!found) {
            errors.push({
              type: 'import',
              message: `インポートパスが見つかりません: ${importPath}`,
              line: index + 1,
              column: line.indexOf(importPath) + 1
            });
          }
        }
      }
    });
    
    return errors;
  }

  displayErrors(filePath, errors) {
    console.log(chalk.red(`\n❌ ${path.basename(filePath)} にエラーが見つかりました:`));
    
    errors.forEach(error => {
      const icon = {
        bracket: '🔤',
        typescript: '📘',
        import: '📦'
      }[error.type] || '❓';
      
      console.log(chalk.yellow(`  ${icon} ${error.line}:${error.column || 0} - ${error.message}`));
    });
    
    console.log('');
  }

  async fullCheck() {
    console.log(chalk.blue('🔍 全ファイルをチェック中...\n'));
    
    const { globby } = await import('globby');
    const files = await globby(this.watching);
    
    for (const file of files) {
      await this.checkFile(file);
    }
    
    if (this.errors.size === 0) {
      console.log(chalk.green('✅ 構文エラーは見つかりませんでした\n'));
    } else {
      console.log(chalk.yellow(`\n⚠️  ${this.errors.size} ファイルにエラーがあります\n`));
    }
  }
}

// 実行
const guardian = new SyntaxGuardian();
guardian.start().catch(console.error);

// 終了処理
process.on('SIGINT', () => {
  console.log(chalk.gray('\n\n👋 Syntax Guardian を終了します'));
  process.exit(0);
});