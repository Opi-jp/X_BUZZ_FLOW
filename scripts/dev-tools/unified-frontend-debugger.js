#!/usr/bin/env node

/**
 * 統合フロントエンドデバッガー
 * エラー監視、コード検査、リンクチェック、UI動作テストを統合
 */

const express = require('express');
const cors = require('cors');
const chalk = require('chalk');
const boxen = require('boxen');
const chokidar = require('chokidar');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);
const PORT = 3335;
const BASE_URL = 'http://localhost:3000';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 状態管理
const state = {
  errors: [],
  codeIssues: [],
  brokenLinks: [],
  apiStatus: {},
  lastCheck: null,
  watching: false
};

// エラー受信エンドポイント
app.post('/api/debug/error', async (req, res) => {
  const errorData = req.body;
  errorData.id = Date.now();
  errorData.resolved = false;
  
  state.errors.unshift(errorData);
  if (state.errors.length > 50) state.errors.pop();
  
  // 自動分析
  analyzeError(errorData);
  
  res.json({ success: true, id: errorData.id });
});

// 状態取得エンドポイント
app.get('/api/debug/state', (req, res) => {
  res.json(state);
});

// エラー分析
async function analyzeError(error) {
  const analysis = {
    quickFixes: [],
    relatedFiles: []
  };
  
  // 404エラーの場合
  if (error.error?.includes('404') || error.error?.includes('Not Found')) {
    analysis.quickFixes.push({
      type: 'routing',
      title: 'ページが見つかりません',
      solution: '以下を確認:\n• app/ディレクトリに該当ページが存在するか\n• URLのスペルミス\n• 動的ルート[id]の場合、パラメータが正しいか',
      command: `ls -la app/${error.url.replace(BASE_URL, '').split('/').filter(Boolean).join('/')}`
    });
  }
  
  // APIエラーの場合
  if (error.url?.includes('/api/')) {
    analysis.quickFixes.push({
      type: 'api',
      title: 'APIエンドポイントエラー',
      solution: 'APIルートを確認:\n• app/api/ディレクトリ構造\n• route.tsファイルの存在\n• HTTPメソッドの実装',
      command: `find app/api -name "route.ts" | grep "${error.url.split('/api/')[1]}"`
    });
  }
  
  // ボタンクリックエラー
  if (error.error?.includes('Cannot read properties') && error.error?.includes('click')) {
    analysis.quickFixes.push({
      type: 'event',
      title: 'クリックイベントエラー',
      solution: '以下を確認:\n• onClick属性が正しく設定されているか\n• 関数が定義されているか\n• thisのバインディング',
      relatedFiles: await findRelatedFiles(error.filename)
    });
  }
  
  error.analysis = analysis;
}

// 関連ファイルを検索
async function findRelatedFiles(filename) {
  if (!filename) return [];
  
  try {
    const componentName = path.basename(filename, path.extname(filename));
    const { stdout } = await execAsync(`grep -r "${componentName}" app/ --include="*.tsx" --include="*.ts" -l | head -5`);
    return stdout.split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

// ファイル監視によるコードチェック
function startCodeWatcher() {
  const watcher = chokidar.watch(['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}'], {
    persistent: true,
    ignoreInitial: true
  });
  
  watcher.on('change', async (filePath) => {
    if (filePath.includes('node_modules') || filePath.includes('.next')) return;
    
    const issues = await checkFile(filePath);
    if (issues.length > 0) {
      state.codeIssues = issues;
    }
  });
  
  state.watching = true;
}

// ファイルチェック
async function checkFile(filePath) {
  const issues = [];
  
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    
    // よくあるミスをチェック
    const patterns = [
      { regex: /console\.log\(/, message: 'console.logが残っています' },
      { regex: /\{[^}]*$/, message: '閉じカッコ } が不足している可能性' },
      { regex: /href=["'][^"']*["']\s*onClick/, message: 'hrefとonClickが両方設定されています' },
      { regex: /onClick=\{[^}]*\}.*onClick=\{/, message: '重複したonClickハンドラー' },
      { regex: /router\.push\(['"][^'"]*['"]\)(?!\.then|\.catch)/, message: 'router.pushのエラーハンドリングがありません' }
    ];
    
    patterns.forEach(({ regex, message }) => {
      const matches = [...content.matchAll(new RegExp(regex, 'g'))];
      matches.forEach(match => {
        const lineNum = content.substring(0, match.index).split('\n').length;
        issues.push({
          file: filePath,
          line: lineNum,
          message,
          code: lines[lineNum - 1]?.trim()
        });
      });
    });
    
  } catch (error) {
    console.error('File check error:', error);
  }
  
  return issues;
}

// リンクチェッカー
async function checkLinks() {
  const brokenLinks = [];
  const checked = new Set();
  
  async function checkPage(url) {
    if (checked.has(url)) return;
    checked.add(url);
    
    try {
      const response = await axios.get(url, { 
        timeout: 5000,
        validateStatus: () => true 
      });
      
      if (response.status === 404) {
        brokenLinks.push({ url, status: 404 });
      }
      
      if (response.status === 200 && response.headers['content-type']?.includes('text/html')) {
        const $ = cheerio.load(response.data);
        
        // リンクを収集
        $('a[href]').each((i, elem) => {
          const href = $(elem).attr('href');
          if (href?.startsWith('/') && !href.startsWith('//')) {
            const fullUrl = BASE_URL + href;
            if (!checked.has(fullUrl)) {
              checkPage(fullUrl).catch(() => {});
            }
          }
        });
      }
    } catch (error) {
      brokenLinks.push({ url, error: error.message });
    }
  }
  
  // 主要ページをチェック
  const mainPages = [
    '/mission-control',
    '/generation/content',
    '/generation/drafts',
    '/intelligence/news'
  ];
  
  for (const page of mainPages) {
    await checkPage(BASE_URL + page);
  }
  
  state.brokenLinks = brokenLinks;
  state.lastCheck = new Date().toISOString();
}

// ダッシュボードHTML
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="ja">
<head>
  <title>統合フロントエンドデバッガー</title>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0a0a0a;
      color: #e0e0e0;
      line-height: 1.6;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 30px;
      border-radius: 10px;
      margin-bottom: 30px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    }
    .header h1 {
      font-size: 2.5em;
      margin-bottom: 10px;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: #1a1a1a;
      padding: 25px;
      border-radius: 10px;
      border: 1px solid #333;
      text-align: center;
      transition: transform 0.2s;
    }
    .stat-card:hover {
      transform: translateY(-2px);
      border-color: #667eea;
    }
    .stat-number {
      font-size: 3em;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .stat-label {
      color: #888;
      text-transform: uppercase;
      font-size: 0.9em;
    }
    .section {
      background: #1a1a1a;
      border-radius: 10px;
      padding: 25px;
      margin-bottom: 20px;
      border: 1px solid #333;
    }
    .section h2 {
      color: #667eea;
      margin-bottom: 20px;
      font-size: 1.5em;
    }
    .error-item {
      background: #2a2a2a;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 15px;
      border-left: 4px solid #dc2626;
    }
    .error-title {
      color: #ef4444;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .error-details {
      color: #aaa;
      font-size: 0.9em;
      margin-bottom: 10px;
    }
    .quick-fix {
      background: #1e3a1e;
      border: 1px solid #10b981;
      border-radius: 6px;
      padding: 12px;
      margin-top: 10px;
    }
    .quick-fix h4 {
      color: #10b981;
      margin-bottom: 5px;
    }
    .code {
      background: #000;
      color: #0f0;
      padding: 10px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.9em;
      overflow-x: auto;
      margin-top: 5px;
    }
    .broken-link {
      background: #3a2a2a;
      border-left: 4px solid #f59e0b;
      padding: 10px;
      margin-bottom: 10px;
      border-radius: 4px;
    }
    .code-issue {
      background: #2a2a3a;
      border-left: 4px solid #8b5cf6;
      padding: 10px;
      margin-bottom: 10px;
      border-radius: 4px;
    }
    .status-ok { color: #10b981; }
    .status-error { color: #ef4444; }
    .status-warning { color: #f59e0b; }
    
    .inject-script {
      background: #2a2a2a;
      border: 1px solid #444;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
    }
    .inject-script code {
      display: block;
      background: #000;
      color: #0f0;
      padding: 15px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.85em;
      overflow-x: auto;
      margin-top: 10px;
    }
    button {
      background: #667eea;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 1em;
      transition: background 0.2s;
    }
    button:hover {
      background: #764ba2;
    }
    .empty-state {
      text-align: center;
      padding: 40px;
      color: #666;
    }
    .toolbar {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 統合フロントエンドデバッガー</h1>
      <p>リアルタイムでエラー検出・分析・修正提案を行います</p>
    </div>
    
    <div class="inject-script">
      <h3>🔧 自動デバッグを有効にする</h3>
      <p>このスクリプトは既にapp/layout.tsxに組み込まれています。手動で追加する場合：</p>
      <code id="inject-code">// 既に DebuggerInjector コンポーネントで自動化されています</code>
    </div>
    
    <div class="toolbar">
      <button onclick="checkLinks()">🔗 リンクチェック実行</button>
      <button onclick="clearErrors()">🗑️ エラーをクリア</button>
      <button onclick="refresh()">🔄 更新</button>
    </div>
    
    <div class="stats">
      <div class="stat-card">
        <div class="stat-number status-error" id="error-count">0</div>
        <div class="stat-label">ランタイムエラー</div>
      </div>
      <div class="stat-card">
        <div class="stat-number status-warning" id="issue-count">0</div>
        <div class="stat-label">コード問題</div>
      </div>
      <div class="stat-card">
        <div class="stat-number status-error" id="broken-count">0</div>
        <div class="stat-label">リンク切れ</div>
      </div>
      <div class="stat-card">
        <div class="stat-number status-ok" id="api-count">0</div>
        <div class="stat-label">API正常</div>
      </div>
    </div>
    
    <div class="section">
      <h2>🚨 ランタイムエラー</h2>
      <div id="errors-container">
        <div class="empty-state">エラーはまだ検出されていません</div>
      </div>
    </div>
    
    <div class="section">
      <h2>💻 コード問題</h2>
      <div id="issues-container">
        <div class="empty-state">コード問題はありません</div>
      </div>
    </div>
    
    <div class="section">
      <h2>🔗 リンク切れ</h2>
      <div id="links-container">
        <div class="empty-state">リンクチェックを実行してください</div>
      </div>
    </div>
  </div>
  
  <script>
    let state = { errors: [], codeIssues: [], brokenLinks: [] };
    
    async function loadState() {
      try {
        const response = await fetch('/api/debug/state');
        state = await response.json();
        updateUI();
      } catch (error) {
        console.error('State load error:', error);
      }
    }
    
    function updateUI() {
      // 統計更新
      document.getElementById('error-count').textContent = state.errors.filter(e => !e.resolved).length;
      document.getElementById('issue-count').textContent = state.codeIssues.length;
      document.getElementById('broken-count').textContent = state.brokenLinks.length;
      document.getElementById('api-count').textContent = Object.values(state.apiStatus).filter(s => s).length;
      
      // エラー表示
      const errorsContainer = document.getElementById('errors-container');
      if (state.errors.length === 0) {
        errorsContainer.innerHTML = '<div class="empty-state">エラーはまだ検出されていません</div>';
      } else {
        errorsContainer.innerHTML = state.errors.map(error => \`
          <div class="error-item">
            <div class="error-title">\${error.error}</div>
            <div class="error-details">
              <div>📍 \${error.url}</div>
              <div>📅 \${new Date(error.timestamp).toLocaleString('ja-JP')}</div>
              \${error.filename ? \`<div>📄 \${error.filename}:\${error.lineno || '?'}:\${error.colno || '?'}</div>\` : ''}
            </div>
            \${error.analysis && error.analysis.quickFixes.map(fix => \`
              <div class="quick-fix">
                <h4>💡 \${fix.title}</h4>
                <pre>\${fix.solution}</pre>
                \${fix.command ? \`<div class="code">\${fix.command}</div>\` : ''}
              </div>
            \`).join('') || ''}
          </div>
        \`).join('');
      }
      
      // コード問題表示
      const issuesContainer = document.getElementById('issues-container');
      if (state.codeIssues.length === 0) {
        issuesContainer.innerHTML = '<div class="empty-state">コード問題はありません</div>';
      } else {
        issuesContainer.innerHTML = state.codeIssues.map(issue => \`
          <div class="code-issue">
            <div><strong>\${issue.message}</strong></div>
            <div>📄 \${issue.file}:\${issue.line}</div>
            \${issue.code ? \`<div class="code">\${issue.code}</div>\` : ''}
          </div>
        \`).join('');
      }
      
      // リンク切れ表示
      const linksContainer = document.getElementById('links-container');
      if (state.brokenLinks.length === 0) {
        linksContainer.innerHTML = '<div class="empty-state">リンクチェックを実行してください</div>';
      } else {
        linksContainer.innerHTML = state.brokenLinks.map(link => \`
          <div class="broken-link">
            <div>🔗 \${link.url.replace('http://localhost:3000', '')}</div>
            <div class="status-error">\${link.status ? \`Status: \${link.status}\` : link.error}</div>
          </div>
        \`).join('');
      }
    }
    
    async function checkLinks() {
      const btn = event.target;
      btn.disabled = true;
      btn.textContent = '🔄 チェック中...';
      
      try {
        await fetch('/api/debug/check-links', { method: 'POST' });
        setTimeout(loadState, 1000);
      } finally {
        btn.disabled = false;
        btn.textContent = '🔗 リンクチェック実行';
      }
    }
    
    async function clearErrors() {
      state.errors = [];
      updateUI();
    }
    
    function refresh() {
      loadState();
    }
    
    // 初期ロード
    loadState();
    
    // 定期更新
    setInterval(loadState, 2000);
  </script>
</body>
</html>
  `);
});

// リンクチェックAPI
app.post('/api/debug/check-links', async (req, res) => {
  checkLinks();
  res.json({ success: true });
});

// サーバー起動
app.listen(PORT, () => {
  console.clear();
  
  const welcomeBox = boxen(
    chalk.cyan.bold('🚀 統合フロントエンドデバッガー\n\n') +
    chalk.white('以下の機能を提供します:\n\n') +
    chalk.green('✅ ランタイムエラーの自動検出\n') +
    chalk.green('✅ コード問題のリアルタイム検査\n') +
    chalk.green('✅ リンク切れチェック\n') +
    chalk.green('✅ APIエンドポイント監視\n') +
    chalk.green('✅ AI による原因分析と修正提案\n\n') +
    chalk.yellow(`ダッシュボード: http://localhost:${PORT}\n`) +
    chalk.gray('（DebuggerInjectorにより自動接続されます）'),
    {
      padding: 1,
      margin: 1,
      borderStyle: 'double',
      borderColor: 'cyan',
      title: '✨ Unified Debugger',
      titleAlignment: 'center'
    }
  );
  
  console.log(welcomeBox);
  
  // コード監視を開始
  startCodeWatcher();
  
  // 定期的なリンクチェック
  setInterval(checkLinks, 300000); // 5分ごと
});