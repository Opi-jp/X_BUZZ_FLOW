#!/usr/bin/env node

/**
 * Error Crusher - 細かいエラーを効率的に潰すツール
 * 
 * 特徴:
 * 1. TypeScriptのエラーを分類して優先度順に表示
 * 2. 同じ種類のエラーをグループ化
 * 3. 自動修正可能なものは修正提案
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// エラーの優先度（高い方が重要）
const ERROR_PRIORITY = {
  'Cannot find module': 5,     // import エラー
  'has no exported member': 4,  // export エラー
  'Property .* does not exist': 3, // プロパティエラー
  'Type .* is not assignable': 2,  // 型エラー
  'Invalid': 1                     // その他
};

// 自動修正可能なパターン
const AUTO_FIX_PATTERNS = [
  {
    pattern: /'"@\/lib\/generated\/prisma"' has no exported member named 'prisma'/,
    fix: "import { prisma } from '@/lib/prisma'",
    description: "prisma import path fix"
  },
  {
    pattern: /Property 'expertise' does not exist/,
    fix: "Replace 'expertise' with 'theme'",
    description: "expertise → theme migration"
  }
];

function getTypeScriptErrors() {
  try {
    execSync('npx tsc --noEmit', { stdio: 'pipe' });
    return [];
  } catch (error) {
    const output = error.stdout ? error.stdout.toString() : '';
    const lines = output.split('\n');
    const errors = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/^(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$/);
      
      if (match) {
        errors.push({
          file: match[1],
          line: parseInt(match[2]),
          column: parseInt(match[3]),
          code: match[4],
          message: match[5],
          priority: getPriority(match[5])
        });
      }
    }
    
    return errors;
  }
}

function getPriority(message) {
  for (const [pattern, priority] of Object.entries(ERROR_PRIORITY)) {
    if (new RegExp(pattern).test(message)) {
      return priority;
    }
  }
  return 0;
}

function groupErrors(errors) {
  const groups = {};
  
  errors.forEach(error => {
    const key = error.code + ':' + error.message.replace(/'.+?'/g, "'*'");
    if (!groups[key]) {
      groups[key] = {
        pattern: key,
        errors: [],
        autoFix: findAutoFix(error.message)
      };
    }
    groups[key].errors.push(error);
  });
  
  return groups;
}

function findAutoFix(message) {
  for (const fix of AUTO_FIX_PATTERNS) {
    if (fix.pattern.test(message)) {
      return fix;
    }
  }
  return null;
}

function displayErrors(groups) {
  console.log('🔍 Error Crusher - TypeScript Error Analysis');
  console.log('==========================================\n');
  
  // 優先度順にソート
  const sortedGroups = Object.values(groups).sort((a, b) => {
    const aPriority = Math.max(...a.errors.map(e => e.priority));
    const bPriority = Math.max(...b.errors.map(e => e.priority));
    return bPriority - aPriority;
  });
  
  let totalErrors = 0;
  let fixableErrors = 0;
  
  sortedGroups.forEach((group, index) => {
    const priority = Math.max(...group.errors.map(e => e.priority));
    const priorityEmoji = ['⚪', '🔵', '🟡', '🟠', '🔴', '🔥'][priority] || '⚪';
    
    console.log(`${priorityEmoji} Error Pattern #${index + 1} (${group.errors.length} occurrences)`);
    console.log(`   ${group.pattern}`);
    
    if (group.autoFix) {
      console.log(`   ✨ Auto-fix available: ${group.autoFix.description}`);
      console.log(`      Fix: ${group.autoFix.fix}`);
      fixableErrors += group.errors.length;
    }
    
    // 最初の3つのファイルを表示
    console.log('   Files:');
    group.errors.slice(0, 3).forEach(error => {
      console.log(`      - ${error.file}:${error.line}`);
    });
    
    if (group.errors.length > 3) {
      console.log(`      ... and ${group.errors.length - 3} more`);
    }
    
    console.log('');
    totalErrors += group.errors.length;
  });
  
  console.log('📊 Summary:');
  console.log(`   Total errors: ${totalErrors}`);
  console.log(`   Error patterns: ${sortedGroups.length}`);
  console.log(`   Auto-fixable: ${fixableErrors}`);
  console.log('');
  
  if (fixableErrors > 0) {
    console.log('💡 Run with --fix to apply automatic fixes');
  }
}

function applyFixes(groups) {
  console.log('🔧 Applying automatic fixes...\n');
  
  const fixes = [];
  
  Object.values(groups).forEach(group => {
    if (group.autoFix) {
      group.errors.forEach(error => {
        fixes.push({
          file: error.file,
          line: error.line,
          fix: group.autoFix,
          error: error
        });
      });
    }
  });
  
  // ファイルごとにグループ化
  const fileGroups = {};
  fixes.forEach(fix => {
    if (!fileGroups[fix.file]) {
      fileGroups[fix.file] = [];
    }
    fileGroups[fix.file].push(fix);
  });
  
  // 各ファイルに修正を適用
  Object.entries(fileGroups).forEach(([file, fixes]) => {
    console.log(`📝 Fixing ${file}`);
    
    try {
      let content = fs.readFileSync(file, 'utf8');
      let modified = false;
      
      fixes.forEach(fix => {
        if (fix.fix.pattern.test(fix.error.message)) {
          // シンプルな置換の例
          if (fix.fix.fix.includes('→')) {
            const [from, to] = fix.fix.fix.split('→').map(s => s.trim());
            content = content.replace(new RegExp(from, 'g'), to);
            modified = true;
          }
        }
      });
      
      if (modified) {
        fs.writeFileSync(file, content);
        console.log(`   ✅ Fixed ${fixes.length} issues`);
      }
    } catch (e) {
      console.log(`   ❌ Error: ${e.message}`);
    }
  });
}

// メイン実行
function main() {
  const shouldFix = process.argv.includes('--fix');
  
  console.log('⏳ Analyzing TypeScript errors...\n');
  
  const errors = getTypeScriptErrors();
  
  if (errors.length === 0) {
    console.log('✅ No TypeScript errors found!');
    return;
  }
  
  const groups = groupErrors(errors);
  displayErrors(groups);
  
  if (shouldFix) {
    applyFixes(groups);
  }
}

main();