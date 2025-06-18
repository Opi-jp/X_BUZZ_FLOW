#!/usr/bin/env node

/**
 * ドキュメント・ファイル整理提案ツール
 * 
 * 重複・紛らわしい・古いファイルを検出して整理を提案
 * 
 * 使い方:
 * node scripts/dev-tools/cleanup-suggestions.js
 */

const fs = require('fs').promises;
const path = require('path');
const glob = require('glob');

class CleanupSuggester {
  constructor() {
    this.suggestions = {
      duplicates: [],
      outdated: [],
      confusing: [],
      unused: []
    };
  }

  async analyzeDocs() {
    console.log('📚 ドキュメントを分析中...\n');
    
    // 紛らわしい名前のドキュメント
    const confusingGroups = [
      {
        pattern: '*architecture*.md',
        description: 'アーキテクチャ関連'
      },
      {
        pattern: '*migration*.md',
        description: '移行計画関連'
      },
      {
        pattern: '*design*.md',
        description: '設計書関連'
      },
      {
        pattern: '*oauth*.md',
        description: 'OAuth関連'
      }
    ];
    
    for (const group of confusingGroups) {
      const files = glob.sync(`docs/**/${group.pattern}`);
      if (files.length > 1) {
        this.suggestions.confusing.push({
          type: group.description,
          files: files,
          count: files.length
        });
      }
    }
    
    // 重複ファイル（current/とarchive/）
    const currentFiles = glob.sync('docs/current/*.md');
    const archiveFiles = glob.sync('docs/archive/*.md');
    
    for (const currentFile of currentFiles) {
      const basename = path.basename(currentFile);
      const archiveFile = `docs/archive/${basename}`;
      if (archiveFiles.includes(archiveFile)) {
        this.suggestions.duplicates.push({
          current: currentFile,
          archive: archiveFile
        });
      }
    }
    
    // 古いと思われるファイル（名前から判断）
    const outdatedPatterns = [
      { pattern: '*old*.md', reason: 'ファイル名に"old"を含む' },
      { pattern: '*deprecated*.md', reason: 'ファイル名に"deprecated"を含む' },
      { pattern: '*backup*.md', reason: 'ファイル名に"backup"を含む' },
      { pattern: '*v1*.md', reason: 'v1（古いバージョン）' },
      { pattern: '*2024*.md', reason: '2024年のファイル' }
    ];
    
    for (const pattern of outdatedPatterns) {
      const files = glob.sync(`docs/**/${pattern.pattern}`);
      if (files.length > 0) {
        this.suggestions.outdated.push({
          reason: pattern.reason,
          files: files
        });
      }
    }
  }
  
  async analyzeCode() {
    console.log('💻 コードファイルを分析中...\n');
    
    // テスト関連ファイル
    const testFiles = glob.sync('test-*.{js,ts}', { cwd: process.cwd() });
    const testScripts = glob.sync('test-scripts/test-*.js');
    
    if (testFiles.length > 0) {
      this.suggestions.unused.push({
        type: 'ルートディレクトリのテストファイル',
        files: testFiles,
        suggestion: 'test-scriptsディレクトリに移動'
      });
    }
    
    // 未使用のAPIエンドポイント（既にスキャナーで検出済み）
    // ここでは省略
  }
  
  generateReport() {
    console.log('\n🧹 整理提案レポート\n');
    console.log('='.repeat(60));
    
    // 紛らわしいドキュメント
    if (this.suggestions.confusing.length > 0) {
      console.log('\n😵 紛らわしい名前のドキュメント群:\n');
      for (const group of this.suggestions.confusing) {
        console.log(`📁 ${group.type}（${group.count}個）:`);
        group.files.forEach(file => {
          console.log(`   - ${file}`);
        });
        console.log('');
      }
    }
    
    // 重複ファイル
    if (this.suggestions.duplicates.length > 0) {
      console.log('\n♻️ current/とarchive/で重複:\n');
      for (const dup of this.suggestions.duplicates) {
        console.log(`📄 ${path.basename(dup.current)}`);
        console.log(`   現在: ${dup.current}`);
        console.log(`   旧版: ${dup.archive}`);
        console.log('');
      }
    }
    
    // 古いファイル
    if (this.suggestions.outdated.length > 0) {
      console.log('\n🗓️ 古いと思われるファイル:\n');
      for (const group of this.suggestions.outdated) {
        console.log(`理由: ${group.reason}`);
        group.files.forEach(file => {
          console.log(`   - ${file}`);
        });
        console.log('');
      }
    }
    
    // 未使用ファイル
    if (this.suggestions.unused.length > 0) {
      console.log('\n🗑️ 整理が必要なファイル:\n');
      for (const group of this.suggestions.unused) {
        console.log(`${group.type}:`);
        group.files.forEach(file => {
          console.log(`   - ${file}`);
        });
        console.log(`   → 提案: ${group.suggestion}\n`);
      }
    }
    
    // 整理提案サマリー
    console.log('\n📋 整理提案サマリー:\n');
    console.log('1. 紛らわしいドキュメントは1つに統合');
    console.log('2. current/archive重複は最新版のみ残す');
    console.log('3. 古いファイルは/docs/archive-2025-06/へ移動');
    console.log('4. ルートのテストファイルはtest-scripts/へ移動');
    console.log('\n💡 ヒント: 迷ったらMASTER_DOC.mdを確認！');
  }
  
  async run() {
    try {
      await this.analyzeDocs();
      await this.analyzeCode();
      this.generateReport();
    } catch (error) {
      console.error('❌ エラーが発生しました:', error);
    }
  }
}

const suggester = new CleanupSuggester();
suggester.run();