#!/usr/bin/env node

/**
 * ドキュメント検索ツール
 * 
 * 79個もあるドキュメントから必要な情報を探す
 * 
 * 使い方:
 * node scripts/dev-tools/doc-finder.js "api"
 * node scripts/dev-tools/doc-finder.js --list
 * node scripts/dev-tools/doc-finder.js --duplicates
 */

const fs = require('fs').promises;
const path = require('path');
const glob = require('glob');

class DocFinder {
  async searchDocs(keyword) {
    console.log(`🔍 "${keyword}"に関するドキュメントを検索中...\n`);
    
    const files = glob.sync('docs/**/*.md', {
      ignore: ['**/node_modules/**']
    });
    
    const matches = [];
    
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const lowerContent = content.toLowerCase();
        const lowerKeyword = keyword.toLowerCase();
        
        if (lowerContent.includes(lowerKeyword)) {
          // 最初の3行を取得して概要とする
          const lines = content.split('\n').filter(line => line.trim());
          const title = lines[0]?.replace(/^#+ /, '') || 'No title';
          const summary = lines.slice(1, 3).join(' ').substring(0, 100) + '...';
          
          // キーワードの出現回数をカウント
          const count = (lowerContent.match(new RegExp(lowerKeyword, 'g')) || []).length;
          
          matches.push({
            file,
            title,
            summary,
            count
          });
        }
      } catch (error) {
        console.error(`Error reading ${file}:`, error.message);
      }
    }
    
    // 出現回数でソート
    matches.sort((a, b) => b.count - a.count);
    
    if (matches.length === 0) {
      console.log('❌ 該当するドキュメントが見つかりませんでした');
      return;
    }
    
    console.log(`📚 ${matches.length}個のドキュメントが見つかりました:\n`);
    
    matches.forEach((match, index) => {
      console.log(`${index + 1}. ${match.file} (${match.count}回)`);
      console.log(`   📝 ${match.title}`);
      console.log(`   ${match.summary}\n`);
    });
  }
  
  async listAllDocs() {
    const files = glob.sync('docs/**/*.md');
    
    console.log('📚 ドキュメント一覧:\n');
    
    // ディレクトリ別に整理
    const byDir = {};
    
    for (const file of files) {
      const dir = path.dirname(file);
      if (!byDir[dir]) {
        byDir[dir] = [];
      }
      
      try {
        const content = await fs.readFile(file, 'utf-8');
        const firstLine = content.split('\n')[0]?.replace(/^#+ /, '') || 'No title';
        byDir[dir].push({
          file: path.basename(file),
          title: firstLine
        });
      } catch (error) {
        byDir[dir].push({
          file: path.basename(file),
          title: 'Error reading file'
        });
      }
    }
    
    for (const [dir, files] of Object.entries(byDir)) {
      console.log(`📁 ${dir}/`);
      files.forEach(f => {
        console.log(`   ${f.file} - ${f.title}`);
      });
      console.log('');
    }
    
    console.log(`合計: ${files.length}個のドキュメント`);
  }
  
  async findDuplicates() {
    console.log('🔍 内容が重複している可能性があるドキュメントを検索中...\n');
    
    const files = glob.sync('docs/**/*.md');
    const docs = [];
    
    // 各ドキュメントの主要キーワードを抽出
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const words = content
          .toLowerCase()
          .match(/\b[a-z]{4,}\b/g) || [];
        
        // 頻出単語TOP10を取得
        const wordCount = {};
        words.forEach(word => {
          if (!['this', 'that', 'with', 'from', 'have', 'been', 'will', 'your', 'what', 'when'].includes(word)) {
            wordCount[word] = (wordCount[word] || 0) + 1;
          }
        });
        
        const topWords = Object.entries(wordCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([word]) => word);
        
        docs.push({ file, topWords });
      } catch (error) {
        // エラーは無視
      }
    }
    
    // 類似度を計算
    const similarities = [];
    
    for (let i = 0; i < docs.length; i++) {
      for (let j = i + 1; j < docs.length; j++) {
        const common = docs[i].topWords.filter(w => docs[j].topWords.includes(w));
        if (common.length >= 5) {
          similarities.push({
            file1: docs[i].file,
            file2: docs[j].file,
            common: common.length,
            words: common.slice(0, 5).join(', ')
          });
        }
      }
    }
    
    if (similarities.length === 0) {
      console.log('✨ 大きな重複は見つかりませんでした');
      return;
    }
    
    similarities.sort((a, b) => b.common - a.common);
    
    console.log('📊 内容が類似しているドキュメント:\n');
    similarities.slice(0, 10).forEach(sim => {
      console.log(`${sim.file1}`);
      console.log(`${sim.file2}`);
      console.log(`  共通キーワード(${sim.common}個): ${sim.words}`);
      console.log('');
    });
  }
}

async function main() {
  const finder = new DocFinder();
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    console.log('📖 使い方:');
    console.log('  node scripts/dev-tools/doc-finder.js <キーワード>');
    console.log('  node scripts/dev-tools/doc-finder.js --list');
    console.log('  node scripts/dev-tools/doc-finder.js --duplicates');
    return;
  }
  
  if (args.includes('--list')) {
    await finder.listAllDocs();
  } else if (args.includes('--duplicates')) {
    await finder.findDuplicates();
  } else {
    await finder.searchDocs(args[0]);
  }
}

main().catch(console.error);