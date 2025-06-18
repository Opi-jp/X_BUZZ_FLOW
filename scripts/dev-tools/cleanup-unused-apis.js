#!/usr/bin/env node

/**
 * 未使用APIクリーンアップツール
 * 
 * 未使用のAPIエンドポイントを検出して削除
 * 
 * 使い方:
 * node scripts/dev-tools/cleanup-unused-apis.js           # ドライラン（削除せずに表示のみ）
 * node scripts/dev-tools/cleanup-unused-apis.js --execute # 実際に削除
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function getUnusedAPIs() {
  // APIスキャナーを実行
  const { stdout } = await execAsync('node scripts/dev-tools/api-dependency-scanner.js --json');
  
  // JSON出力部分を抽出
  const jsonMatch = stdout.match(/📄 JSON形式の依存関係:\s*(\{[\s\S]*\})/m);
  if (!jsonMatch) {
    throw new Error('Failed to parse scanner output');
  }
  
  const dependencies = JSON.parse(jsonMatch[1]);
  return dependencies.unusedApis;
}

function apiPathToFilePath(apiPath) {
  // /api/viral/cot-session/[sessionId] → app/api/viral/cot-session/[sessionId]/route.ts
  return `app${apiPath}/route.ts`;
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    // .tsが存在しない場合は.jsを試す
    try {
      await fs.access(filePath.replace('.ts', '.js'));
      return true;
    } catch {
      return false;
    }
  }
}

async function deleteAPIFile(apiPath) {
  const tsPath = apiPathToFilePath(apiPath);
  const jsPath = tsPath.replace('.ts', '.js');
  
  try {
    // .tsファイルを削除
    await fs.unlink(tsPath);
    console.log(`  ✅ 削除: ${tsPath}`);
  } catch {
    try {
      // .jsファイルを削除
      await fs.unlink(jsPath);
      console.log(`  ✅ 削除: ${jsPath}`);
    } catch (error) {
      console.log(`  ❌ 削除失敗: ${apiPath}`);
    }
  }
  
  // 空のディレクトリを削除
  const dir = path.dirname(tsPath);
  try {
    const files = await fs.readdir(dir);
    if (files.length === 0) {
      await fs.rmdir(dir);
      console.log(`  📁 空ディレクトリ削除: ${dir}`);
    }
  } catch {
    // ディレクトリ削除エラーは無視
  }
}

async function main() {
  const isExecute = process.argv.includes('--execute');
  
  console.log('🔍 未使用APIを検出中...\n');
  
  try {
    const unusedAPIs = await getUnusedAPIs();
    
    if (unusedAPIs.length === 0) {
      console.log('✨ 未使用のAPIはありません！');
      return;
    }
    
    console.log(`📊 ${unusedAPIs.length}個の未使用APIが見つかりました:\n`);
    
    // テスト用APIとそれ以外を分類
    const testAPIs = unusedAPIs.filter(api => api.includes('/test-') || api.includes('/debug-'));
    const regularAPIs = unusedAPIs.filter(api => !api.includes('/test-') && !api.includes('/debug-'));
    
    if (testAPIs.length > 0) {
      console.log('🧪 テスト/デバッグAPI:');
      for (const api of testAPIs) {
        console.log(`  - ${api}`);
      }
      console.log('');
    }
    
    if (regularAPIs.length > 0) {
      console.log('📌 通常のAPI:');
      for (const api of regularAPIs) {
        console.log(`  - ${api}`);
      }
      console.log('');
    }
    
    if (!isExecute) {
      console.log('⚠️  これはドライランです。実際に削除するには --execute オプションを付けて実行してください。');
      console.log('');
      console.log('例: node scripts/dev-tools/cleanup-unused-apis.js --execute');
      return;
    }
    
    console.log('🗑️  未使用APIを削除します...\n');
    
    // まずテストAPIから削除
    if (testAPIs.length > 0) {
      console.log('テスト/デバッグAPIを削除中:');
      for (const api of testAPIs) {
        await deleteAPIFile(api);
      }
      console.log('');
    }
    
    // 通常のAPIの削除は確認を求める
    if (regularAPIs.length > 0) {
      console.log('⚠️  通常のAPIも削除しますか？ (y/N)');
      
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise(resolve => {
        rl.question('', answer => {
          rl.close();
          resolve(answer);
        });
      });
      
      if (answer.toLowerCase() === 'y') {
        console.log('\n通常のAPIを削除中:');
        for (const api of regularAPIs) {
          await deleteAPIFile(api);
        }
      } else {
        console.log('\n通常のAPIの削除をスキップしました。');
      }
    }
    
    console.log('\n✅ クリーンアップ完了！');
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

main();