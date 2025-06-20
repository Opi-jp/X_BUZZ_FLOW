#!/usr/bin/env node

/**
 * Claude専用ログビューアー
 * 
 * tmuxのnextウィンドウのログをリアルタイムで監視し、
 * Claudeが理解しやすい形式で整理して表示
 */

const { exec, spawn } = require('child_process')
const colors = {
  INFO: '\x1b[36m',     // cyan
  WARN: '\x1b[33m',     // yellow  
  ERROR: '\x1b[31m',    // red
  SUCCESS: '\x1b[32m',  // green
  FLOW: '\x1b[35m',     // magenta
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m'
}

let sessionStats = {
  total: 0,
  byLevel: { INFO: 0, WARN: 0, ERROR: 0, SUCCESS: 0, FLOW: 0 },
  byModule: {},
  activeSessions: new Set()
}

function displayHeader() {
  console.clear()
  console.log(`${colors.bold}${colors.INFO}`)
  console.log('╔══════════════════════════════════════════════════════════════╗')
  console.log('║                  CLAUDE LOG VIEWER                          ║')
  console.log('║                                                              ║')
  console.log('║  Create→Draft→Post フロー専用ログモニター                   ║')
  console.log('╚══════════════════════════════════════════════════════════════╝')
  console.log(`${colors.reset}`)
  console.log()
}

function displayStats() {
  console.log(`${colors.dim}📊 Statistics:${colors.reset}`)
  console.log(`   Total logs: ${sessionStats.total}`)
  console.log(`   Levels: ${Object.entries(sessionStats.byLevel).map(([k,v]) => `${k}:${v}`).join(' | ')}`)
  console.log(`   Active sessions: ${sessionStats.activeSessions.size}`)
  console.log(`   Modules: ${Object.keys(sessionStats.byModule).join(', ')}`)
  console.log(`${colors.dim}${'─'.repeat(80)}${colors.reset}`)
  console.log()
}

function parseClaudeLog(line) {
  // CLAUDE_LOG: から始まる構造化ログを解析
  const claudeLogMatch = line.match(/CLAUDE_LOG: (.+)/)
  if (claudeLogMatch) {
    try {
      return JSON.parse(claudeLogMatch[1])
    } catch (e) {
      return null
    }
  }
  
  // 従来の [LEVEL] 形式のログも解析
  const levelMatch = line.match(/\\[(INFO|WARN|ERROR|SUCCESS|FLOW)\\]/)
  if (levelMatch) {
    const level = levelMatch[1]
    const timestamp = new Date().toISOString()
    const message = line.replace(/.*\\[\\w+\\]\\s*/, '').trim()
    
    return {
      timestamp,
      level,
      context: { module: 'legacy', operation: 'console' },
      message
    }
  }
  
  return null
}

function formatLogEntry(entry) {
  if (!entry) return null
  
  const color = colors[entry.level] || colors.INFO
  const time = entry.timestamp.split('T')[1]?.split('.')[0] || 'unknown'
  
  let output = []
  
  // メインライン
  const sessionInfo = entry.context.sessionId ? `[${entry.context.sessionId.substring(0, 8)}]` : ''
  const moduleInfo = `[${entry.context.module.toUpperCase()}]`
  const durationInfo = entry.duration ? `(${entry.duration}ms)` : ''
  
  output.push(
    `${color}●${colors.reset} ${time} ${moduleInfo}${sessionInfo} ${entry.message} ${colors.dim}${durationInfo}${colors.reset}`
  )
  
  // データ行
  if (entry.data) {
    const dataStr = typeof entry.data === 'object' 
      ? JSON.stringify(entry.data, null, 2).split('\\n').slice(0, 3).join(' ').substring(0, 100)
      : String(entry.data).substring(0, 100)
    output.push(`  ${colors.dim}📊 ${dataStr}${colors.reset}`)
  }
  
  // エラー行
  if (entry.error) {
    output.push(`  ${colors.ERROR}❌ ${entry.error.type}: ${entry.error.message}${colors.reset}`)
    if (entry.error.code) {
      output.push(`  ${colors.dim}   Code: ${entry.error.code}${colors.reset}`)
    }
  }
  
  return output
}

function updateStats(entry) {
  if (!entry) return
  
  sessionStats.total++
  sessionStats.byLevel[entry.level] = (sessionStats.byLevel[entry.level] || 0) + 1
  sessionStats.byModule[entry.context.module] = (sessionStats.byModule[entry.context.module] || 0) + 1
  
  if (entry.context.sessionId) {
    sessionStats.activeSessions.add(entry.context.sessionId)
  }
}

function startTailProcess() {
  // tmuxのnextウィンドウのログを監視
  console.log(`${colors.INFO}🔍 Monitoring tmux session 'xbuzz:next'...${colors.reset}`)
  console.log()
  
  const tail = spawn('tmux', ['capture-pane', '-t', 'xbuzz:next', '-p'], { stdio: 'pipe' })
  
  tail.stdout.on('data', (data) => {
    const lines = data.toString().split('\\n')
    
    for (const line of lines) {
      if (!line.trim()) continue
      
      const entry = parseClaudeLog(line)
      if (entry) {
        updateStats(entry)
        
        const formatted = formatLogEntry(entry)
        if (formatted) {
          formatted.forEach(line => console.log(line))
        }
        
        // 重要なログの場合は統計も再表示
        if (entry.level === 'ERROR' || entry.level === 'FLOW') {
          console.log()
          displayStats()
        }
      }
    }
  })
  
  // 定期的にtmuxからログを取得
  setInterval(() => {
    exec('tmux capture-pane -t xbuzz:next -p', (error, stdout) => {
      if (error) return
      
      const lines = stdout.split('\\n').slice(-10) // 最新10行
      for (const line of lines) {
        if (!line.trim()) continue
        
        const entry = parseClaudeLog(line)
        if (entry) {
          updateStats(entry)
          const formatted = formatLogEntry(entry)
          if (formatted) {
            formatted.forEach(line => console.log(line))
          }
        }
      }
    })
  }, 2000) // 2秒ごと
}

function main() {
  displayHeader()
  
  // tmuxセッションの存在確認
  exec('tmux has-session -t xbuzz:next', (error) => {
    if (error) {
      console.log(`${colors.ERROR}❌ tmux session 'xbuzz:next' not found${colors.reset}`)
      console.log(`${colors.INFO}💡 Start the development server with: ./scripts/dev-persistent.sh${colors.reset}`)
      process.exit(1)
    }
    
    displayStats()
    startTailProcess()
  })
  
  // Ctrl+C での終了
  process.on('SIGINT', () => {
    console.log(`\\n${colors.INFO}👋 Claude Log Viewer stopped${colors.reset}`)
    process.exit(0)
  })
}

if (require.main === module) {
  main()
}

module.exports = { parseClaudeLog, formatLogEntry }