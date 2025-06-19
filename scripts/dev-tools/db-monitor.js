#!/usr/bin/env node

/**
 * データベース接続モニター
 * Prisma Studioの代替として、DB接続状態を監視
 */

const { PrismaClient } = require('../../lib/generated/prisma');
const readline = require('readline');

// カラー出力用のANSIコード
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

class DBMonitor {
  constructor() {
    this.prisma = new PrismaClient({
      log: ['error', 'warn']
    });
    this.stats = {
      connectionAttempts: 0,
      successfulQueries: 0,
      failedQueries: 0,
      startTime: Date.now()
    };
    this.isRunning = true;
  }

  async start() {
    console.clear();
    console.log(`${colors.cyan}${colors.bright}=== Database Connection Monitor ===${colors.reset}`);
    console.log(`Started at: ${new Date().toLocaleString()}\n`);

    // キーボード入力のセットアップ
    this.setupKeyboardInput();

    // 初回ヘルスチェック
    await this.checkHealth();

    // 定期的なモニタリング
    this.monitorInterval = setInterval(async () => {
      await this.updateDisplay();
    }, 5000); // 5秒ごと

    // セッション情報の定期更新
    this.sessionInterval = setInterval(async () => {
      await this.checkSessions();
    }, 30000); // 30秒ごと
  }

  async checkHealth() {
    this.stats.connectionAttempts++;
    
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1 as check`;
      const duration = Date.now() - start;
      
      this.stats.successfulQueries++;
      this.lastHealthCheck = {
        status: 'healthy',
        duration,
        timestamp: new Date()
      };
      
      return true;
    } catch (error) {
      this.stats.failedQueries++;
      this.lastHealthCheck = {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date()
      };
      
      return false;
    }
  }

  async checkSessions() {
    try {
      // アクティブなセッション数を取得
      const activeSessions = await this.prisma.cotSession.count({
        where: {
          status: {
            in: ['THINKING', 'EXECUTING', 'INTEGRATING']
          }
        }
      });

      // 最近のセッション
      const recentSessions = await this.prisma.cotSession.findMany({
        take: 5,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          expertise: true,
          status: true,
          currentPhase: true,
          currentStep: true,
          updatedAt: true
        }
      });

      this.sessionInfo = {
        active: activeSessions,
        recent: recentSessions
      };
    } catch (error) {
      console.error('Failed to fetch session info:', error.message);
    }
  }

  async checkTasks() {
    try {
      // 保留中のタスク
      const pendingTasks = await this.prisma.$queryRaw`
        SELECT COUNT(*) as count 
        FROM api_tasks 
        WHERE status = 'PENDING'
      `;

      // 処理中のタスク
      const processingTasks = await this.prisma.$queryRaw`
        SELECT COUNT(*) as count 
        FROM api_tasks 
        WHERE status = 'PROCESSING'
      `;

      this.taskInfo = {
        pending: Number(pendingTasks[0]?.count || 0),
        processing: Number(processingTasks[0]?.count || 0)
      };
    } catch (error) {
      console.error('Failed to fetch task info:', error.message);
    }
  }

  async updateDisplay() {
    console.clear();
    
    // ヘッダー
    console.log(`${colors.cyan}${colors.bright}=== Database Connection Monitor ===${colors.reset}`);
    console.log(`Running for: ${this.getUptime()}\n`);

    // 接続状態
    await this.checkHealth();
    const health = this.lastHealthCheck;
    
    console.log(`${colors.bright}Connection Status:${colors.reset}`);
    if (health.status === 'healthy') {
      console.log(`  Status: ${colors.green}● HEALTHY${colors.reset}`);
      console.log(`  Response Time: ${health.duration}ms`);
    } else {
      console.log(`  Status: ${colors.red}● UNHEALTHY${colors.reset}`);
      console.log(`  Error: ${health.error}`);
    }
    console.log(`  Last Check: ${health.timestamp.toLocaleTimeString()}`);

    // 統計情報
    console.log(`\n${colors.bright}Statistics:${colors.reset}`);
    console.log(`  Connection Attempts: ${this.stats.connectionAttempts}`);
    console.log(`  Successful Queries: ${colors.green}${this.stats.successfulQueries}${colors.reset}`);
    console.log(`  Failed Queries: ${colors.red}${this.stats.failedQueries}${colors.reset}`);
    const successRate = this.stats.connectionAttempts > 0 
      ? ((this.stats.successfulQueries / this.stats.connectionAttempts) * 100).toFixed(2)
      : 0;
    console.log(`  Success Rate: ${successRate}%`);

    // タスク情報
    await this.checkTasks();
    if (this.taskInfo) {
      console.log(`\n${colors.bright}Task Queue:${colors.reset}`);
      console.log(`  Pending: ${colors.yellow}${this.taskInfo.pending}${colors.reset}`);
      console.log(`  Processing: ${colors.blue}${this.taskInfo.processing}${colors.reset}`);
    }

    // セッション情報
    if (this.sessionInfo) {
      console.log(`\n${colors.bright}Active Sessions:${colors.reset} ${this.sessionInfo.active}`);
      
      if (this.sessionInfo.recent.length > 0) {
        console.log(`\n${colors.bright}Recent Sessions:${colors.reset}`);
        this.sessionInfo.recent.forEach((session, index) => {
          const statusColor = this.getStatusColor(session.status);
          console.log(`  ${index + 1}. ${session.expertise || 'N/A'} - ${statusColor}${session.status}${colors.reset} (Phase ${session.currentPhase}, ${session.currentStep})`);
        });
      }
    }

    // コマンドヘルプ
    console.log(`\n${colors.bright}Commands:${colors.reset}`);
    console.log('  [h] Health check  [s] Sessions  [t] Tasks  [r] Reset stats  [q] Quit');
  }

  getStatusColor(status) {
    const statusColors = {
      'THINKING': colors.blue,
      'EXECUTING': colors.yellow,
      'INTEGRATING': colors.cyan,
      'COMPLETED': colors.green,
      'FAILED': colors.red,
      'PENDING': colors.reset
    };
    return statusColors[status] || colors.reset;
  }

  getUptime() {
    const uptime = Date.now() - this.stats.startTime;
    const hours = Math.floor(uptime / 3600000);
    const minutes = Math.floor((uptime % 3600000) / 60000);
    const seconds = Math.floor((uptime % 60000) / 1000);
    
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  setupKeyboardInput() {
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    
    process.stdin.on('keypress', async (str, key) => {
      if (key.ctrl && key.name === 'c') {
        await this.shutdown();
      }
      
      switch(key.name) {
        case 'q':
          await this.shutdown();
          break;
        case 'h':
          await this.checkHealth();
          await this.updateDisplay();
          break;
        case 's':
          await this.checkSessions();
          await this.updateDisplay();
          break;
        case 't':
          await this.checkTasks();
          await this.updateDisplay();
          break;
        case 'r':
          this.stats = {
            connectionAttempts: 0,
            successfulQueries: 0,
            failedQueries: 0,
            startTime: Date.now()
          };
          await this.updateDisplay();
          break;
      }
    });
  }

  async shutdown() {
    console.log('\n\nShutting down...');
    this.isRunning = false;
    
    clearInterval(this.monitorInterval);
    clearInterval(this.sessionInterval);
    
    await this.prisma.$disconnect();
    process.exit(0);
  }
}

// メイン実行
const monitor = new DBMonitor();
monitor.start().catch(error => {
  console.error('Monitor failed to start:', error);
  process.exit(1);
});