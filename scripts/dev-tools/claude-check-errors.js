#!/usr/bin/env node

/**
 * Claude用エラーチェックツール
 * Claudeが直接実行してエラー状況を確認できる
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const chalk = require('chalk');

async function checkErrors() {
  const errorDir = '.error-details';
  
  // エラーディレクトリの確認
  if (!fsSync.existsSync(errorDir)) {
    console.log('✅ エラーは記録されていません');
    return;
  }

  try {
    const files = await fs.readdir(errorDir);
    const errorFiles = files.filter(f => f.endsWith('.json'));
    
    if (errorFiles.length === 0) {
      console.log('✅ エラーは記録されていません');
      return;
    }

    // エラーデータの読み込み
    const errors = [];
    for (const file of errorFiles) {
      const data = JSON.parse(await fs.readFile(path.join(errorDir, file), 'utf8'));
      errors.push({
        ...data,
        filename: file
      });
    }

    // 最新順にソート
    errors.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // 未解決エラーと解決済みエラーを分離
    const unresolved = errors.filter(e => !e.resolved);
    const resolved = errors.filter(e => e.resolved);

    console.log('# エラー状況レポート\n');
    console.log(`総エラー数: ${errors.length}`);
    console.log(`未解決: ${unresolved.length}`);
    console.log(`解決済み: ${resolved.length}\n`);

    if (unresolved.length > 0) {
      console.log('## 🚨 未解決エラー\n');
      unresolved.forEach((err, index) => {
        console.log(`### ${index + 1}. ${err.title}`);
        console.log(`- **カテゴリ**: ${err.category}`);
        console.log(`- **発生時刻**: ${err.timestamp}`);
        console.log(`- **エラーメッセージ**: \`${err.errorMessage.split('\n')[0]}\``);
        if (err.relatedFiles && err.relatedFiles.length > 0) {
          console.log(`- **関連ファイル**: ${err.relatedFiles.join(', ')}`);
        }
        if (err.attemptedSolutions && err.attemptedSolutions.length > 0) {
          console.log(`- **試した解決策**: ${err.attemptedSolutions.length}個`);
        }
        console.log('');
      });
    }

    // 最近解決されたエラー（直近3件）
    if (resolved.length > 0) {
      console.log('## ✅ 最近解決されたエラー\n');
      resolved.slice(0, 3).forEach((err, index) => {
        console.log(`### ${index + 1}. ${err.title}`);
        console.log(`- **解決策**: ${err.actualSolution || 'N/A'}`);
        console.log(`- **解決時刻**: ${err.resolvedAt || err.timestamp}`);
        console.log('');
      });
    }

    // カテゴリ別統計
    const categories = {};
    errors.forEach(err => {
      categories[err.category] = (categories[err.category] || 0) + 1;
    });

    console.log('## 📊 カテゴリ別統計\n');
    Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, count]) => {
        console.log(`- ${cat}: ${count}件`);
      });

  } catch (error) {
    console.error('エラーチェック中にエラーが発生:', error.message);
  }
}

// 引数処理
const args = process.argv.slice(2);

if (args.includes('--json')) {
  // JSON形式で出力（プログラム処理用）
  checkErrorsJSON();
} else {
  // 通常の出力
  checkErrors();
}

async function checkErrorsJSON() {
  const errorDir = '.error-details';
  
  if (!fsSync.existsSync(errorDir)) {
    console.log(JSON.stringify({ errors: [], count: 0 }));
    return;
  }

  try {
    const files = await fs.readdir(errorDir);
    const errorFiles = files.filter(f => f.endsWith('.json'));
    
    const errors = [];
    for (const file of errorFiles) {
      const data = JSON.parse(await fs.readFile(path.join(errorDir, file), 'utf8'));
      errors.push(data);
    }

    console.log(JSON.stringify({
      errors: errors,
      count: errors.length,
      unresolved: errors.filter(e => !e.resolved).length,
      resolved: errors.filter(e => e.resolved).length
    }, null, 2));
  } catch (error) {
    console.log(JSON.stringify({ error: error.message }));
  }
}