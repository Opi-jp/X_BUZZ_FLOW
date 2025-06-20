#!/usr/bin/env node

/**
 * 統合デバッガー管理ツール
 * 
 * 永続サーバーの各デバッガーを制御・監視
 */

const { exec, spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  purple: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
}

class IntegratedDebugManager {
  constructor() {
    this.sessionName = 'xbuzz-enhanced'
    this.windows = {
      'next': 'Next.js Development Server',
      'claude-logs': 'Claude専用ログビューアー',
      'frontend-debug': 'フロントエンドデバッガー',
      'api-monitor': 'API依存関係監視',
      'db-monitor': 'データベース監視',
      'prisma': 'Prisma Studio',
      'flow-viz': 'フロー可視化',
      'e2e-test': 'E2Eテスト',
      'error-watch': 'エラー監視',
      'console': 'インタラクティブコンソール'
    }
  }

  async checkSession() {
    return new Promise((resolve) => {
      exec(`tmux has-session -t ${this.sessionName}`, (error) => {
        resolve(!error)
      })
    })
  }

  async getWindowList() {
    return new Promise((resolve, reject) => {
      exec(`tmux list-windows -t ${this.sessionName} -F "#{window_index}:#{window_name}:#{window_active}"`, (error, stdout) => {
        if (error) {
          reject(error)
          return
        }
        
        const windows = stdout.trim().split('\n').map(line => {
          const [index, name, active] = line.split(':')
          return {
            index: parseInt(index),
            name,
            active: active === '1',
            description: this.windows[name] || 'Unknown'
          }
        })
        
        resolve(windows)
      })
    })
  }

  async getWindowStatus(windowName) {
    return new Promise((resolve) => {
      exec(`tmux capture-pane -t ${this.sessionName}:${windowName} -p | tail -5`, (error, stdout) => {
        if (error) {
          resolve('Error')
          return
        }
        
        // 簡単な状態判定
        const output = stdout.toLowerCase()
        if (output.includes('error') || output.includes('failed')) {
          resolve('Error')
        } else if (output.includes('ready') || output.includes('listening') || output.includes('running')) {
          resolve('Running')
        } else if (output.includes('waiting') || output.includes('loading')) {
          resolve('Loading')
        } else {
          resolve('Unknown')
        }
      })
    })
  }

  async displayStatus() {
    console.clear()
    console.log(`${colors.bold}${colors.cyan}`)
    console.log('╔══════════════════════════════════════════════════════════════╗')
    console.log('║            統合デバッガー管理ダッシュボード                  ║')
    console.log('╚══════════════════════════════════════════════════════════════╝')
    console.log(`${colors.reset}`)
    
    const isActive = await this.checkSession()
    
    if (!isActive) {
      console.log(`${colors.red}❌ 統合デバッグセッションが見つかりません${colors.reset}`)
      console.log(`${colors.yellow}💡 起動: ./scripts/dev-persistent-enhanced.sh${colors.reset}`)
      return
    }

    console.log(`${colors.green}✅ 統合デバッグセッション: ${this.sessionName}${colors.reset}`)
    console.log()

    try {
      const windows = await this.getWindowList()
      
      console.log(`${colors.bold}🪟 ウィンドウ状態:${colors.reset}`)
      console.log(`${colors.cyan}${'─'.repeat(70)}${colors.reset}`)
      
      for (const window of windows) {
        const status = await this.getWindowStatus(window.name)
        const activeMarker = window.active ? `${colors.yellow}●${colors.reset}` : ' '
        const statusColor = status === 'Running' ? colors.green : 
                           status === 'Error' ? colors.red :
                           status === 'Loading' ? colors.yellow : colors.cyan
        
        console.log(`${activeMarker} ${window.index}: ${colors.bold}${window.name}${colors.reset}`)
        console.log(`    ${window.description}`)
        console.log(`    Status: ${statusColor}${status}${colors.reset}`)
        console.log()
      }
      
    } catch (error) {
      console.log(`${colors.red}❌ ウィンドウ情報の取得に失敗: ${error.message}${colors.reset}`)
    }
  }

  async sendCommand(windowName, command) {
    return new Promise((resolve, reject) => {
      exec(`tmux send-keys -t ${this.sessionName}:${windowName} "${command}" Enter`, (error) => {
        if (error) {
          reject(error)
        } else {
          resolve()
        }
      })
    })
  }

  async restartWindow(windowName) {
    console.log(`${colors.yellow}🔄 ${windowName} を再起動中...${colors.reset}`)
    
    try {
      // Ctrl+C で停止
      await this.sendCommand(windowName, 'C-c')
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // ウィンドウ別の再起動コマンド
      const restartCommands = {
        'next': 'npm run dev',
        'claude-logs': 'node scripts/dev-tools/claude-log-viewer.js',
        'frontend-debug': 'node scripts/dev-tools/unified-frontend-debugger.js',
        'api-monitor': 'while true; do clear; node scripts/dev-tools/api-dependency-scanner.js; echo ""; echo "Next update in 30s..."; sleep 30; done',
        'db-monitor': 'node scripts/dev-tools/db-monitor.js',
        'prisma': 'npx prisma studio',
        'flow-viz': 'while true; do clear; node scripts/dev-tools/flow-visualizer.js; echo ""; echo "Next update in 10s..."; sleep 10; done',
        'error-watch': 'node scripts/dev-tools/smart-error-collector.js'
      }
      
      const command = restartCommands[windowName]
      if (command) {
        await this.sendCommand(windowName, command)
        console.log(`${colors.green}✅ ${windowName} が再起動されました${colors.reset}`)
      } else {
        console.log(`${colors.yellow}⚠️ ${windowName} の再起動コマンドが不明です${colors.reset}`)
      }
      
    } catch (error) {
      console.log(`${colors.red}❌ ${windowName} の再起動に失敗: ${error.message}${colors.reset}`)
    }
  }

  async runHealthCheck() {
    console.log(`${colors.blue}🔍 ヘルスチェック実行中...${colors.reset}`)
    
    const checks = [
      { name: 'Next.js Server', cmd: 'curl -s http://localhost:3000/api/health' },
      { name: 'Database', cmd: 'node scripts/dev-tools/db-schema-validator.js' },
      { name: 'Environment', cmd: 'node scripts/dev-tools/check-env.js' }
    ]
    
    for (const check of checks) {
      try {
        await new Promise((resolve, reject) => {
          exec(check.cmd, { timeout: 5000 }, (error, stdout) => {
            if (error) {
              console.log(`${colors.red}❌ ${check.name}: Failed${colors.reset}`)
              reject(error)
            } else {
              console.log(`${colors.green}✅ ${check.name}: OK${colors.reset}`)
              resolve()
            }
          })
        })
      } catch (error) {
        // Continue with other checks
      }
    }
  }

  async showMenu() {
    console.log(`${colors.cyan}📋 利用可能なコマンド:${colors.reset}`)
    console.log(`${colors.yellow}  s${colors.reset} - ステータス表示`)
    console.log(`${colors.yellow}  h${colors.reset} - ヘルスチェック`)
    console.log(`${colors.yellow}  r [window]${colors.reset} - ウィンドウ再起動`)
    console.log(`${colors.yellow}  a${colors.reset} - セッションにアタッチ`)
    console.log(`${colors.yellow}  q${colors.reset} - 終了`)
    console.log()
  }

  async start() {
    await this.displayStatus()
    await this.showMenu()
    
    const readline = require('readline')
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    
    const askCommand = () => {
      rl.question(`${colors.cyan}Command> ${colors.reset}`, async (input) => {
        const [cmd, ...args] = input.trim().split(' ')
        
        switch (cmd) {
          case 's':
            await this.displayStatus()
            break
          case 'h':
            await this.runHealthCheck()
            break
          case 'r':
            if (args[0]) {
              await this.restartWindow(args[0])
            } else {
              console.log(`${colors.yellow}使用例: r next${colors.reset}`)
            }
            break
          case 'a':
            console.log(`${colors.blue}セッションにアタッチします...${colors.reset}`)
            rl.close()
            exec(`tmux attach -t ${this.sessionName}`)
            return
          case 'q':
            console.log(`${colors.green}👋 デバッガー管理ツールを終了します${colors.reset}`)
            rl.close()
            return
          default:
            await this.showMenu()
        }
        
        askCommand()
      })
    }
    
    askCommand()
  }
}

// メイン実行
if (require.main === module) {
  const manager = new IntegratedDebugManager()
  manager.start().catch(console.error)
}

module.exports = IntegratedDebugManager