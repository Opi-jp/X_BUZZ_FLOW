#!/usr/bin/env node

/**
 * エラー記録ツール
 * 
 * 新しいエラーと解決策をERRORS.mdに記録
 * 
 * 使い方:
 * node scripts/dev-tools/error-recorder.js
 * node scripts/dev-tools/error-recorder.js --quick "エラー内容" "解決策"
 */

const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

const ERRORS_FILE = path.join(process.cwd(), 'ERRORS.md');

class ErrorRecorder {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async prompt(question) {
    return new Promise(resolve => {
      this.rl.question(question, answer => {
        resolve(answer);
      });
    });
  }

  async recordError() {
    console.log('🔴 新しいエラーを記録します\n');

    // エラー情報を収集
    const errorTitle = await this.prompt('エラーのタイトル（例: Prismaクライアントエラー）: ');
    const symptoms = await this.prompt('症状・エラーメッセージ: ');
    const cause = await this.prompt('原因: ');
    const solution = await this.prompt('解決策: ');
    const prevention = await this.prompt('根本対策: ');

    // マークダウン形式でフォーマット
    const errorEntry = `
## 🔴 ${errorTitle}

### 症状
${symptoms}

### 原因
${cause}

### 解決策
\`\`\`bash
${solution}
\`\`\`

### 根本対策
${prevention}

---
`;

    // ERRORS.mdに追記
    await this.appendToErrorsFile(errorEntry);
    
    console.log('\n✅ エラー記録を追加しました！');
    this.rl.close();
  }

  async quickRecord(title, solution) {
    const errorEntry = `
## 🔴 ${title}

### 解決策
${solution}

*詳細は後で追記*

---
`;

    await this.appendToErrorsFile(errorEntry);
    console.log('✅ クイック記録を追加しました！');
  }

  async appendToErrorsFile(content) {
    try {
      // 現在の内容を読み込む
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
      
      // ファイルに書き込む
      await fs.writeFile(ERRORS_FILE, currentContent);
      
      // 更新日時を更新
      const dateRegex = /\*最終更新: .+\*/;
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '/');
      currentContent = currentContent.replace(dateRegex, `*最終更新: ${today}*`);
      await fs.writeFile(ERRORS_FILE, currentContent);
      
    } catch (error) {
      console.error('❌ ファイルの更新に失敗しました:', error);
      throw error;
    }
  }

  async showRecentErrors() {
    console.log('📋 最近のエラー記録:\n');
    
    const content = await fs.readFile(ERRORS_FILE, 'utf-8');
    const errors = content.match(/## 🔴 .+/g);
    
    if (errors) {
      errors.slice(-5).forEach((error, index) => {
        console.log(`${index + 1}. ${error.replace('## 🔴 ', '')}`);
      });
    }
  }
}

async function main() {
  const recorder = new ErrorRecorder();
  
  const args = process.argv.slice(2);
  
  if (args.includes('--quick') && args.length >= 3) {
    // クイック記録モード
    const titleIndex = args.indexOf('--quick') + 1;
    const title = args[titleIndex];
    const solution = args[titleIndex + 1];
    await recorder.quickRecord(title, solution);
  } else if (args.includes('--list')) {
    // 最近のエラー一覧
    await recorder.showRecentErrors();
  } else {
    // 対話形式で記録
    await recorder.recordError();
  }
}

main().catch(console.error);