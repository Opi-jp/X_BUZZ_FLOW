#!/usr/bin/env node

/**
 * フロントエンドデバッグツール
 * ブラウザコンソールのエラーを自動収集・分析
 */

const express = require('express');
const cors = require('cors');
const chalk = require('chalk');
const fs = require('fs').promises;
const path = require('path');

const PORT = 3333;
const ERRORS_FILE = path.join(__dirname, '../../ERRORS.md');

// エラーログを保存
const errorLogs = [];
const MAX_LOGS = 100;

// Expressアプリケーション
const app = express();
app.use(cors());
app.use(express.json());

// エラー受信エンドポイント
app.post('/api/debug/error', (req, res) => {
  const { error, stack, url, timestamp, userAgent, additional } = req.body;
  
  const errorLog = {
    id: Date.now(),
    error,
    stack,
    url,
    timestamp: timestamp || new Date().toISOString(),
    userAgent,
    additional,
    resolved: false
  };
  
  errorLogs.unshift(errorLog);
  if (errorLogs.length > MAX_LOGS) {
    errorLogs.pop();
  }
  
  console.log(chalk.red('🚨 新しいエラーを受信:'));
  console.log(chalk.yellow(`URL: ${url}`));
  console.log(chalk.red(`エラー: ${error}`));
  if (stack) {
    console.log(chalk.gray('スタックトレース:'));
    console.log(chalk.gray(stack));
  }
  console.log(chalk.gray('---'));
  
  res.json({ success: true, id: errorLog.id });
});

// エラー一覧取得
app.get('/api/debug/errors', (req, res) => {
  res.json({ errors: errorLogs });
});

// エラー解決済みマーク
app.post('/api/debug/error/:id/resolve', async (req, res) => {
  const { id } = req.params;
  const { solution } = req.body;
  
  const error = errorLogs.find(e => e.id === parseInt(id));
  if (error) {
    error.resolved = true;
    error.solution = solution;
    
    // ERRORS.mdに追記
    if (solution) {
      await appendToErrorsFile(error);
    }
    
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Error not found' });
  }
});

// デバッグダッシュボード
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Frontend Debugger</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 {
      color: #333;
      margin-bottom: 30px;
    }
    .error-item {
      background: white;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 15px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      position: relative;
    }
    .error-item.resolved {
      opacity: 0.6;
      background: #f0f9ff;
    }
    .error-title {
      font-size: 16px;
      font-weight: 600;
      color: #dc2626;
      margin-bottom: 10px;
    }
    .error-url {
      color: #6b7280;
      font-size: 14px;
      margin-bottom: 10px;
    }
    .error-stack {
      background: #f9fafb;
      padding: 10px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
      white-space: pre-wrap;
      word-break: break-all;
      max-height: 200px;
      overflow-y: auto;
    }
    .error-time {
      color: #9ca3af;
      font-size: 12px;
      position: absolute;
      top: 20px;
      right: 20px;
    }
    .resolve-btn {
      background: #10b981;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      margin-top: 10px;
    }
    .resolve-btn:hover {
      background: #059669;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .stat-number {
      font-size: 32px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .stat-label {
      color: #6b7280;
      font-size: 14px;
    }
    .inject-script {
      background: #f3f4f6;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .inject-script code {
      display: block;
      background: #e5e7eb;
      padding: 10px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
      overflow-x: auto;
    }
    .no-errors {
      text-align: center;
      padding: 60px;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔍 Frontend Debugger</h1>
    
    <div class="inject-script">
      <h3>ブラウザコンソールに貼り付けるスクリプト:</h3>
      <code id="inject-code">(function(){const d='http://localhost:${PORT}';window.addEventListener('error',e=>{fetch(d+'/api/debug/error',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({error:e.message,stack:e.error?.stack,url:location.href,timestamp:new Date().toISOString(),userAgent:navigator.userAgent})}).catch(()=>{})});console.log('🔍 Frontend Debugger connected to '+d)})();</code>
      <button onclick="copyScript()">📋 コピー</button>
    </div>
    
    <div class="stats">
      <div class="stat-card">
        <div class="stat-number" id="total-count">0</div>
        <div class="stat-label">総エラー数</div>
      </div>
      <div class="stat-card">
        <div class="stat-number" id="unresolved-count">0</div>
        <div class="stat-label">未解決</div>
      </div>
      <div class="stat-card">
        <div class="stat-number" id="resolved-count">0</div>
        <div class="stat-label">解決済み</div>
      </div>
    </div>
    
    <div id="errors-container">
      <div class="no-errors">エラーがまだ記録されていません</div>
    </div>
  </div>
  
  <script>
    function copyScript() {
      const code = document.getElementById('inject-code').textContent;
      navigator.clipboard.writeText(code).then(() => {
        alert('コピーしました！ブラウザコンソールに貼り付けてください。');
      });
    }
    
    function resolveError(id) {
      const solution = prompt('解決策を入力してください:');
      if (solution) {
        fetch('/api/debug/error/' + id + '/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ solution })
        }).then(() => {
          loadErrors();
        });
      }
    }
    
    function loadErrors() {
      fetch('/api/debug/errors')
        .then(res => res.json())
        .then(data => {
          const container = document.getElementById('errors-container');
          const errors = data.errors;
          
          if (errors.length === 0) {
            container.innerHTML = '<div class="no-errors">エラーがまだ記録されていません</div>';
            document.getElementById('total-count').textContent = '0';
            document.getElementById('unresolved-count').textContent = '0';
            document.getElementById('resolved-count').textContent = '0';
            return;
          }
          
          const unresolved = errors.filter(e => !e.resolved).length;
          const resolved = errors.filter(e => e.resolved).length;
          
          document.getElementById('total-count').textContent = errors.length;
          document.getElementById('unresolved-count').textContent = unresolved;
          document.getElementById('resolved-count').textContent = resolved;
          
          container.innerHTML = errors.map(error => \`
            <div class="error-item \${error.resolved ? 'resolved' : ''}">
              <div class="error-time">\${new Date(error.timestamp).toLocaleString('ja-JP')}</div>
              <div class="error-title">\${error.error}</div>
              <div class="error-url">\${error.url}</div>
              \${error.stack ? \`<div class="error-stack">\${error.stack}</div>\` : ''}
              \${error.resolved && error.solution ? 
                \`<div style="margin-top: 10px; color: #10b981;">✓ 解決済み: \${error.solution}</div>\` :
                \`<button class="resolve-btn" onclick="resolveError(\${error.id})">解決済みにする</button>\`
              }
            </div>
          \`).join('');
        });
    }
    
    // 初期読み込み
    loadErrors();
    
    // 定期的に更新
    setInterval(loadErrors, 2000);
  </script>
</body>
</html>
  `);
});

// ERRORS.mdに追記
async function appendToErrorsFile(error) {
  try {
    const content = await fs.readFile(ERRORS_FILE, 'utf-8');
    const date = new Date().toISOString().split('T')[0];
    
    const newEntry = `
## ${error.error}

**発生日**: ${date}  
**URL**: ${error.url}  
**解決策**: ${error.solution}

\`\`\`
${error.stack || 'スタックトレースなし'}
\`\`\`

---
`;
    
    // Frontend Errors セクションを探す
    const sections = content.split(/^##\s+/m);
    let frontendSectionIndex = sections.findIndex(s => s.startsWith('Frontend Errors'));
    
    if (frontendSectionIndex === -1) {
      // セクションがない場合は追加
      await fs.writeFile(ERRORS_FILE, content + '\n## Frontend Errors\n' + newEntry);
    } else {
      // 既存セクションに追記
      sections[frontendSectionIndex] = 'Frontend Errors\n' + newEntry + sections[frontendSectionIndex].substring('Frontend Errors\n'.length);
      await fs.writeFile(ERRORS_FILE, '## ' + sections.join('## '));
    }
    
    console.log(chalk.green('✅ ERRORS.mdに記録しました'));
  } catch (error) {
    console.error(chalk.red('ERRORS.md更新エラー:'), error);
  }
}

// サーバー起動
app.listen(PORT, () => {
  console.log(chalk.green(`
🔍 Frontend Debugger が起動しました！

1. ブラウザで http://localhost:${PORT} を開く
2. 表示されたスクリプトをコピー
3. デバッグしたいページのコンソールに貼り付け
4. エラーが自動的に収集されます

${chalk.yellow('Ctrl+C で終了')}
  `));
});