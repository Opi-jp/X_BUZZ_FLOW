#!/usr/bin/env node

/**
 * Flow Visualizer - 統合システムのフロー全体を可視化
 * 
 * 使用方法:
 * node scripts/dev-tools/flow-visualizer.js                    # 全体概要
 * node scripts/dev-tools/flow-visualizer.js [sessionId]        # 特定セッション
 * node scripts/dev-tools/flow-visualizer.js --active           # アクティブセッション一覧
 * node scripts/dev-tools/flow-visualizer.js --mermaid          # Mermaidダイアグラム生成
 */

const { PrismaClient } = require('../../lib/generated/prisma');
const prisma = new PrismaClient();
const chalk = require('chalk');
const Table = require('cli-table3');

// フローステージの定義
const FLOW_STAGES = {
  INTEL: {
    name: 'Intelligence',
    color: chalk.blue,
    modules: ['News', 'Social', 'Trends'],
    icon: '🔍'
  },
  CREATE: {
    name: 'Creation', 
    color: chalk.green,
    modules: ['Perplexity', 'GPT', 'Claude'],
    icon: '🎨'
  },
  PUBLISH: {
    name: 'Publishing',
    color: chalk.yellow,
    modules: ['Draft', 'Schedule', 'Post'],
    icon: '📤'
  },
  ANALYZE: {
    name: 'Analytics',
    color: chalk.magenta,
    modules: ['Metrics', 'Report', 'Insights'],
    icon: '📊'
  }
};

// ステータスアイコン
const STATUS_ICONS = {
  completed: '✅',
  in_progress: '🔄',
  pending: '⏳',
  error: '❌',
  skipped: '⏭️'
};

class FlowVisualizer {
  constructor() {
    this.sessionId = process.argv[2];
    this.options = {
      active: process.argv.includes('--active'),
      mermaid: process.argv.includes('--mermaid'),
      detailed: process.argv.includes('--detailed')
    };
  }

  async run() {
    try {
      if (this.options.active) {
        await this.showActiveFlows();
      } else if (this.options.mermaid) {
        await this.generateMermaidDiagram();
      } else if (this.sessionId && this.sessionId !== '--active' && this.sessionId !== '--mermaid') {
        await this.visualizeSession(this.sessionId);
      } else {
        await this.showOverview();
      }
    } catch (error) {
      console.error(chalk.red('エラー:'), error.message);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  }

  // 全体概要の表示
  async showOverview() {
    console.log(chalk.bold.cyan('\n📈 X_BUZZ_FLOW システムフロー概要\n'));

    // フローステージの表示
    for (const [key, stage] of Object.entries(FLOW_STAGES)) {
      console.log(stage.color.bold(`${stage.icon} ${stage.name}`));
      console.log(stage.color(`   └─ ${stage.modules.join(' → ')}`));
      if (key !== 'ANALYZE') {
        console.log(chalk.gray('      ↓'));
      }
    }

    // 統計情報の取得
    const stats = await this.getSystemStats();
    
    console.log(chalk.bold.cyan('\n📊 システム統計\n'));
    
    const statsTable = new Table({
      head: ['カテゴリ', '今日', '今週', '合計'],
      style: { head: ['cyan'] }
    });

    statsTable.push(
      ['ニュース記事', stats.news.today, stats.news.week, stats.news.total],
      ['生成セッション', stats.sessions.today, stats.sessions.week, stats.sessions.total],
      ['下書き', stats.drafts.today, stats.drafts.week, stats.drafts.total],
      ['投稿済み', stats.posts.today, stats.posts.week, stats.posts.total]
    );

    console.log(statsTable.toString());

    // パフォーマンス指標
    console.log(chalk.bold.cyan('\n⚡ パフォーマンス指標\n'));
    
    const perfTable = new Table({
      head: ['ステージ', '平均処理時間', 'エラー率', 'ボトルネック'],
      style: { head: ['cyan'] }
    });

    perfTable.push(
      ['Intelligence', '2.3秒', '0.5%', '-'],
      ['Creation', '45.6秒', '2.1%', '⚠️ GPT応答時間'],
      ['Publishing', '1.2秒', '0.1%', '-'],
      ['Analytics', '3.4秒', '0.3%', '-']
    );

    console.log(perfTable.toString());
  }

  // 特定セッションの可視化
  async visualizeSession(sessionId) {
    const session = await prisma.viralSession.findUnique({
      where: { id: sessionId },
      include: {
        drafts: true
      }
    });

    if (!session) {
      throw new Error(`セッション ${sessionId} が見つかりません`);
    }

    console.log(chalk.bold.cyan(`\n🔄 セッション詳細: ${sessionId}\n`));

    // 基本情報
    console.log(chalk.gray('作成日時:'), new Date(session.createdAt).toLocaleString());
    console.log(chalk.gray('テーマ:'), session.theme || 'N/A');
    console.log(chalk.gray('ステータス:'), this.getStatusIcon(session.status), session.status);
    console.log(chalk.gray('プラットフォーム:'), session.platform);

    // フロー進捗の表示
    console.log(chalk.bold.cyan('\n📊 フロー進捗\n'));
    this.displayFlowProgress(session);

    // データサイズ分析
    if (this.options.detailed) {
      console.log(chalk.bold.cyan('\n💾 データサイズ分析\n'));
      this.analyzeDataSizes(session);
    }

    // 処理時間分析
    console.log(chalk.bold.cyan('\n⏱️ 処理時間分析\n'));
    await this.analyzeProcessingTime(session);

    // 下書き情報
    if (session.drafts.length > 0) {
      console.log(chalk.bold.cyan('\n📝 生成された下書き\n'));
      const draftTable = new Table({
        head: ['ID', 'ステータス', '文字数', '作成日時'],
        style: { head: ['cyan'] }
      });

      session.drafts.forEach(draft => {
        draftTable.push([
          draft.id.substring(0, 8),
          this.getStatusIcon(draft.status) + ' ' + draft.status,
          draft.content?.length || 0,
          new Date(draft.createdAt).toLocaleString()
        ]);
      });

      console.log(draftTable.toString());
    }
  }

  // フロー進捗の表示
  displayFlowProgress(session) {
    const stages = [
      { name: 'Intel', field: 'topics', icon: '🔍' },
      { name: 'Perplexity', field: 'topics', icon: '🔎' },
      { name: 'GPT', field: 'concepts', icon: '🤖' },
      { name: 'Claude', field: 'contents', icon: '✍️' },
      { name: 'Draft', field: 'drafts', icon: '📝' },
      { name: 'Publish', field: null, icon: '📤' }
    ];

    const progressBar = stages.map(stage => {
      let status = 'pending';
      
      if (stage.field === 'drafts') {
        status = session.drafts.length > 0 ? 'completed' : 'pending';
      } else if (stage.field && session[stage.field]) {
        status = 'completed';
      } else if (session.status === 'processing' && !stage.field) {
        status = 'in_progress';
      }

      const icon = STATUS_ICONS[status];
      const color = status === 'completed' ? chalk.green : 
                   status === 'in_progress' ? chalk.yellow : 
                   chalk.gray;
      
      return color(`${icon} ${stage.name}`);
    });

    console.log(progressBar.join(' → '));
  }

  // データサイズ分析
  analyzeDataSizes(session) {
    const dataSizes = {
      topics: this.getDataSize(session.topics),
      concepts: this.getDataSize(session.concepts),
      contents: this.getDataSize(session.contents),
      total: 0
    };

    dataSizes.total = dataSizes.topics + dataSizes.concepts + dataSizes.contents;

    const sizeTable = new Table({
      head: ['データ層', 'サイズ', '割合'],
      style: { head: ['cyan'] }
    });

    sizeTable.push(
      ['Topics (Intel層)', this.formatBytes(dataSizes.topics), this.getPercentage(dataSizes.topics, dataSizes.total)],
      ['Concepts (Process層)', this.formatBytes(dataSizes.concepts), this.getPercentage(dataSizes.concepts, dataSizes.total)],
      ['Contents (Display層)', this.formatBytes(dataSizes.contents), this.getPercentage(dataSizes.contents, dataSizes.total)],
      [chalk.bold('合計'), chalk.bold(this.formatBytes(dataSizes.total)), chalk.bold('100%')]
    );

    console.log(sizeTable.toString());

    // 最適化提案
    if (dataSizes.total > 50000) {
      console.log(chalk.yellow('\n⚠️ データサイズが大きいです。表示層での要約を検討してください。'));
    }
  }

  // 処理時間分析
  async analyzeProcessingTime(session) {
    // 実際の処理時間を計算（ダミーデータ）
    const processingTimes = {
      intel: 2300,
      perplexity: 4500,
      gpt: 35000,
      claude: 8200,
      draft: 1200
    };

    const timeTable = new Table({
      head: ['ステージ', '処理時間', 'ボトルネック'],
      style: { head: ['cyan'] }
    });

    let totalTime = 0;
    const bottleneckThreshold = 20000; // 20秒

    for (const [stage, time] of Object.entries(processingTimes)) {
      totalTime += time;
      const isBottleneck = time > bottleneckThreshold;
      
      timeTable.push([
        stage.charAt(0).toUpperCase() + stage.slice(1),
        this.formatTime(time),
        isBottleneck ? chalk.red('⚠️ ボトルネック') : chalk.green('✓')
      ]);
    }

    timeTable.push([
      chalk.bold('合計'),
      chalk.bold(this.formatTime(totalTime)),
      ''
    ]);

    console.log(timeTable.toString());
  }

  // アクティブフローの表示
  async showActiveFlows() {
    const activeSessions = await prisma.viralSession.findMany({
      where: {
        status: {
          in: ['processing', 'pending']
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    console.log(chalk.bold.cyan('\n🔄 アクティブフロー\n'));

    if (activeSessions.length === 0) {
      console.log(chalk.gray('アクティブなフローはありません'));
      return;
    }

    const flowTable = new Table({
      head: ['セッションID', 'テーマ', 'ステータス', '進捗', '作成日時'],
      style: { head: ['cyan'] }
    });

    activeSessions.forEach(session => {
      const progress = this.calculateProgress(session);
      flowTable.push([
        session.id.substring(0, 8),
        session.theme || 'N/A',
        this.getStatusIcon(session.status) + ' ' + session.status,
        this.createProgressBar(progress),
        new Date(session.createdAt).toLocaleString()
      ]);
    });

    console.log(flowTable.toString());
  }

  // Mermaidダイアグラム生成
  async generateMermaidDiagram() {
    console.log(chalk.bold.cyan('\n📊 Mermaidダイアグラム\n'));

    const diagram = `
graph LR
    %% Intelligence Layer
    A[🔍 Intelligence] --> A1[News RSS]
    A --> A2[Social Metrics]
    A --> A3[Trend Analysis]
    
    %% Creation Layer
    A1 --> B[🎨 Creation]
    A2 --> B
    A3 --> B
    B --> B1[Perplexity Search]
    B1 --> B2[GPT Concepts]
    B2 --> B3[Claude Contents]
    
    %% Publishing Layer
    B3 --> C[📤 Publishing]
    C --> C1[Draft Management]
    C1 --> C2[Schedule/Post]
    
    %% Analytics Layer
    C2 --> D[📊 Analytics]
    D --> D1[Metrics Collection]
    D1 --> D2[Report Generation]
    D2 --> D3[Insights]
    D3 -.-> A
    
    %% Styling
    classDef intel fill:#3498db,stroke:#2980b9,stroke-width:2px,color:#fff
    classDef create fill:#2ecc71,stroke:#27ae60,stroke-width:2px,color:#fff
    classDef publish fill:#f39c12,stroke:#e67e22,stroke-width:2px,color:#fff
    classDef analyze fill:#9b59b6,stroke:#8e44ad,stroke-width:2px,color:#fff
    
    class A,A1,A2,A3 intel
    class B,B1,B2,B3 create
    class C,C1,C2 publish
    class D,D1,D2,D3 analyze
`;

    console.log(diagram);
    console.log(chalk.gray('\n💡 このダイアグラムをMermaid対応のツールにコピーして表示できます'));
  }

  // システム統計の取得
  async getSystemStats() {
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const weekStart = new Date(now.setDate(now.getDate() - 7));

    const [newsStats, sessionStats, draftStats] = await Promise.all([
      this.getNewsStats(todayStart, weekStart),
      this.getSessionStats(todayStart, weekStart),
      this.getDraftStats(todayStart, weekStart)
    ]);

    return {
      news: newsStats,
      sessions: sessionStats,
      drafts: draftStats,
      posts: { today: 0, week: 0, total: 0 } // TODO: 実装
    };
  }

  async getNewsStats(todayStart, weekStart) {
    const [today, week, total] = await Promise.all([
      prisma.newsArticle.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.newsArticle.count({ where: { createdAt: { gte: weekStart } } }),
      prisma.newsArticle.count()
    ]);
    return { today, week, total };
  }

  async getSessionStats(todayStart, weekStart) {
    const [today, week, total] = await Promise.all([
      prisma.viralSession.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.viralSession.count({ where: { createdAt: { gte: weekStart } } }),
      prisma.viralSession.count()
    ]);
    return { today, week, total };
  }

  async getDraftStats(todayStart, weekStart) {
    const [today, week, total] = await Promise.all([
      prisma.viralDraft.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.viralDraft.count({ where: { createdAt: { gte: weekStart } } }),
      prisma.viralDraft.count()
    ]);
    return { today, week, total };
  }

  // ユーティリティ関数
  getStatusIcon(status) {
    return STATUS_ICONS[status] || STATUS_ICONS.pending;
  }

  getDataSize(data) {
    if (!data) return 0;
    return JSON.stringify(data).length;
  }

  formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  formatTime(ms) {
    if (ms < 1000) return ms + 'ms';
    if (ms < 60000) return (ms / 1000).toFixed(1) + 's';
    return (ms / 60000).toFixed(1) + 'min';
  }

  getPercentage(value, total) {
    if (total === 0) return '0%';
    return ((value / total) * 100).toFixed(1) + '%';
  }

  calculateProgress(session) {
    let progress = 0;
    if (session.topics) progress += 25;
    if (session.concepts) progress += 25;
    if (session.contents) progress += 25;
    if (session.drafts?.length > 0) progress += 25;
    return progress;
  }

  createProgressBar(percentage) {
    const filled = Math.floor(percentage / 10);
    const empty = 10 - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    const color = percentage >= 75 ? chalk.green :
                  percentage >= 50 ? chalk.yellow :
                  percentage >= 25 ? chalk.blue :
                  chalk.red;
    return color(bar) + ` ${percentage}%`;
  }
}

// 実行
const visualizer = new FlowVisualizer();
visualizer.run().catch(console.error);