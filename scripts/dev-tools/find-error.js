#!/usr/bin/env node

/**
 * エラー検索ツール
 * 
 * ERRORS.mdから過去の解決策を検索
 * 
 * 使い方:
 * node scripts/dev-tools/find-error.js "database"
 * node scripts/dev-tools/find-error.js "prisma" --detail
 */

const fs = require('fs').promises;
const path = require('path');

const ERRORS_FILE = path.join(process.cwd(), 'ERRORS.md');

class ErrorFinder {
  async searchErrors(keyword, showDetail = false) {
    try {
      const content = await fs.readFile(ERRORS_FILE, 'utf-8');
      
      // エラーセクションを分割
      const sections = content.split(/## 🔴 /);
      const matches = [];
      
      for (const section of sections) {
        if (section && section.toLowerCase().includes(keyword.toLowerCase())) {
          matches.push(section);
        }
      }
      
      if (matches.length === 0) {
        console.log(`❌ "${keyword}"に関するエラー記録が見つかりません`);
        console.log('\n💡 ヒント: 別のキーワードで検索してみてください');
        return;
      }
      
      console.log(`🔍 "${keyword}"に関するエラー記録: ${matches.length}件\n`);
      
      matches.forEach((match, index) => {
        const lines = match.split('\n');
        const title = lines[0];
        
        console.log(`${index + 1}. 🔴 ${title}`);
        
        if (showDetail) {
          // 症状と解決策を表示
          const symptomIndex = lines.findIndex(line => line.includes('### 症状'));
          const solutionIndex = lines.findIndex(line => line.includes('### 解決策'));
          
          if (symptomIndex !== -1) {
            console.log('   症状:', lines[symptomIndex + 1].trim());
          }
          
          if (solutionIndex !== -1) {
            console.log('   解決策:', lines[solutionIndex + 1].trim());
          }
        }
        
        console.log('');
      });
      
      if (!showDetail) {
        console.log('💡 詳細を見るには --detail オプションを使用してください');
      }
      
    } catch (error) {
      console.error('❌ エラー記録の読み込みに失敗しました:', error);
    }
  }
  
  async showCategories() {
    try {
      const content = await fs.readFile(ERRORS_FILE, 'utf-8');
      const titles = content.match(/## 🔴 .+/g);
      
      if (titles) {
        console.log('📚 エラーカテゴリ一覧:\n');
        
        const categories = {};
        titles.forEach(title => {
          const clean = title.replace('## 🔴 ', '');
          const category = clean.split(/エラー|問題|Error/i)[0].trim();
          
          if (!categories[category]) {
            categories[category] = 0;
          }
          categories[category]++;
        });
        
        Object.entries(categories).forEach(([cat, count]) => {
          console.log(`  • ${cat} (${count}件)`);
        });
      }
    } catch (error) {
      console.error('❌ カテゴリの取得に失敗しました:', error);
    }
  }
}

async function main() {
  const finder = new ErrorFinder();
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    console.log('📖 使い方:');
    console.log('  node scripts/dev-tools/find-error.js <キーワード>');
    console.log('  node scripts/dev-tools/find-error.js <キーワード> --detail');
    console.log('  node scripts/dev-tools/find-error.js --categories');
    console.log('\n例:');
    console.log('  node scripts/dev-tools/find-error.js database');
    console.log('  node scripts/dev-tools/find-error.js "prisma client" --detail');
    return;
  }
  
  if (args.includes('--categories')) {
    await finder.showCategories();
  } else {
    const keyword = args[0];
    const showDetail = args.includes('--detail');
    await finder.searchErrors(keyword, showDetail);
  }
}

main().catch(console.error);