#!/usr/bin/env node

/**
 * Design Document Viewer - 重要な設計ドキュメントを素早く参照
 * 
 * 使用方法:
 * node scripts/dev-tools/design-doc-viewer.js              # インタラクティブメニュー
 * node scripts/dev-tools/design-doc-viewer.js list         # ドキュメント一覧
 * node scripts/dev-tools/design-doc-viewer.js show [name]  # 特定のドキュメントを表示
 * node scripts/dev-tools/design-doc-viewer.js mermaid      # 全Mermaidダイアグラムを抽出
 */

const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');

// 重要ドキュメントの定義
const IMPORTANT_DOCS = {
  'implementation-plan': {
    path: 'docs/current/integrated-system-implementation-plan-20250619.md',
    name: '統合システム実装計画',
    description: 'Intel→Create→Publish→Analyzeの4モジュール構成設計'
  },
  'system-architecture': {
    path: 'docs/visualizations/system-architecture.md',
    name: 'システムアーキテクチャ図',
    description: 'Mermaidによるシステム全体のフロー図'
  },
  'data-flow': {
    path: 'data_flow_analysis.md',
    name: 'データフロー分析',
    description: 'V2システムとCoTシステムの詳細データフロー'
  },
  'news-viral': {
    path: 'docs/current/news-viral-integration-design.md',
    name: 'NEWS×バイラル統合設計',
    description: 'ニュース記事からバイラルコンテンツ生成の設計'
  },
  'cot-spec': {
    path: 'docs/core/chain-of-thought-specification.md',
    name: 'Chain of Thought仕様書',
    description: 'プロンプト設計の原則と注意事項'
  },
  'prompt-master': {
    path: 'docs/prompt-master-specification.md',
    name: 'プロンプトマスター仕様書',
    description: '統合されたプロンプト設計ガイド'
  }
};

class DesignDocViewer {
  constructor() {
    this.command = process.argv[2] || 'menu';
    this.docName = process.argv[3];
  }

  async run() {
    try {
      switch (this.command) {
        case 'list':
          await this.listDocuments();
          break;
        case 'show':
          await this.showDocument(this.docName);
          break;
        case 'mermaid':
          await this.extractMermaidDiagrams();
          break;
        case 'menu':
        default:
          await this.showInteractiveMenu();
      }
    } catch (error) {
      console.error(chalk.red('エラー:'), error.message);
      process.exit(1);
    }
  }

  // ドキュメント一覧表示
  async listDocuments() {
    console.log(chalk.bold.cyan('\n📚 重要設計ドキュメント一覧\n'));

    for (const [key, doc] of Object.entries(IMPORTANT_DOCS)) {
      console.log(chalk.green(`[${key}]`), chalk.bold(doc.name));
      console.log(chalk.gray(`  ${doc.description}`));
      console.log(chalk.gray(`  パス: ${doc.path}`));
      
      // ファイルの存在確認とサイズ
      try {
        const stats = await fs.stat(path.join(process.cwd(), doc.path));
        const size = (stats.size / 1024).toFixed(1);
        console.log(chalk.gray(`  サイズ: ${size} KB`));
      } catch (error) {
        console.log(chalk.red(`  ⚠️ ファイルが見つかりません`));
      }
      console.log();
    }

    console.log(chalk.yellow('\n使用方法:'));
    console.log('  node scripts/dev-tools/design-doc-viewer.js show [key]');
    console.log(chalk.gray('  例: node scripts/dev-tools/design-doc-viewer.js show implementation-plan'));
  }

  // 特定のドキュメントを表示
  async showDocument(docKey) {
    if (!docKey) {
      console.error(chalk.red('ドキュメントキーを指定してください'));
      await this.listDocuments();
      return;
    }

    const doc = IMPORTANT_DOCS[docKey];
    if (!doc) {
      console.error(chalk.red(`ドキュメント '${docKey}' が見つかりません`));
      await this.listDocuments();
      return;
    }

    try {
      const content = await fs.readFile(path.join(process.cwd(), doc.path), 'utf8');
      
      console.log(chalk.bold.cyan(`\n📄 ${doc.name}\n`));
      console.log(chalk.gray(`パス: ${doc.path}`));
      console.log(chalk.gray(`説明: ${doc.description}`));
      console.log(chalk.gray('─'.repeat(80)));
      console.log();
      
      // 内容の表示（最初の100行のみ）
      const lines = content.split('\n');
      const preview = lines.slice(0, 100).join('\n');
      console.log(preview);
      
      if (lines.length > 100) {
        console.log(chalk.yellow(`\n... (残り ${lines.length - 100} 行)`));
        console.log(chalk.gray('\n完全なファイルを表示するには:'));
        console.log(chalk.cyan(`  cat ${doc.path}`));
      }
    } catch (error) {
      console.error(chalk.red('ファイルの読み込みに失敗しました:'), error.message);
    }
  }

  // Mermaidダイアグラムの抽出
  async extractMermaidDiagrams() {
    console.log(chalk.bold.cyan('\n🎨 Mermaidダイアグラムの抽出\n'));

    for (const [key, doc] of Object.entries(IMPORTANT_DOCS)) {
      try {
        const content = await fs.readFile(path.join(process.cwd(), doc.path), 'utf8');
        const mermaidBlocks = this.extractMermaidBlocks(content);
        
        if (mermaidBlocks.length > 0) {
          console.log(chalk.green(`\n[${doc.name}]`));
          console.log(chalk.gray(`ファイル: ${doc.path}`));
          console.log(chalk.gray(`Mermaidブロック数: ${mermaidBlocks.length}`));
          
          mermaidBlocks.forEach((block, index) => {
            console.log(chalk.yellow(`\n--- ダイアグラム ${index + 1} ---`));
            console.log(block);
          });
        }
      } catch (error) {
        // ファイルが存在しない場合はスキップ
      }
    }
  }

  // Mermaidブロックの抽出
  extractMermaidBlocks(content) {
    const mermaidPattern = /```mermaid\n([\s\S]*?)```/g;
    const blocks = [];
    let match;
    
    while ((match = mermaidPattern.exec(content)) !== null) {
      blocks.push(match[1].trim());
    }
    
    return blocks;
  }

  // インタラクティブメニュー
  async showInteractiveMenu() {
    console.log(chalk.bold.cyan('\n📚 設計ドキュメントビューワー\n'));
    
    console.log(chalk.yellow('コマンド:'));
    console.log('  1. ドキュメント一覧を表示');
    console.log('  2. 統合システム実装計画を表示');
    console.log('  3. システムアーキテクチャ図を表示');
    console.log('  4. データフロー分析を表示');
    console.log('  5. Mermaidダイアグラムを全て抽出');
    console.log();
    
    console.log(chalk.gray('使用例:'));
    console.log('  node scripts/dev-tools/design-doc-viewer.js list');
    console.log('  node scripts/dev-tools/design-doc-viewer.js show implementation-plan');
    console.log('  node scripts/dev-tools/design-doc-viewer.js mermaid');
    
    // 最も重要なドキュメントの概要を表示
    console.log(chalk.bold.cyan('\n🔥 最重要ドキュメント\n'));
    
    const importantKeys = ['implementation-plan', 'system-architecture', 'data-flow'];
    for (const key of importantKeys) {
      const doc = IMPORTANT_DOCS[key];
      console.log(chalk.green(`• ${doc.name}`));
      console.log(chalk.gray(`  ${doc.description}`));
    }
  }
}

// 実行
const viewer = new DesignDocViewer();
viewer.run().catch(console.error);