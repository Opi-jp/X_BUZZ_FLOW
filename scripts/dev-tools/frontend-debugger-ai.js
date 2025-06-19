#!/usr/bin/env node

/**
 * AI対応フロントエンドデバッガー
 * エラーを自動的に解析し、修正案を生成
 */

const express = require('express');
const cors = require('cors');
const chalk = require('chalk');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);
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
app.post('/api/debug/error', async (req, res) => {
  const { error, stack, url, timestamp, userAgent, additional } = req.body;
  
  const errorLog = {
    id: Date.now(),
    error,
    stack,
    url,
    timestamp: timestamp || new Date().toISOString(),
    userAgent,
    additional,
    resolved: false,
    analyzing: true
  };
  
  errorLogs.unshift(errorLog);
  if (errorLogs.length > MAX_LOGS) {
    errorLogs.pop();
  }
  
  console.log(chalk.red('🚨 新しいエラーを受信:'));
  console.log(chalk.yellow(`URL: ${url}`));
  console.log(chalk.red(`エラー: ${error}`));
  console.log(chalk.cyan('🤖 AI分析を開始します...'));
  
  // AI分析を非同期で実行
  analyzeErrorWithAI(errorLog);
  
  res.json({ success: true, id: errorLog.id });
});

// AIによるエラー分析
async function analyzeErrorWithAI(errorLog) {
  try {
    // エラーの詳細情報を準備
    const errorInfo = {
      error: errorLog.error,
      stack: errorLog.stack,
      url: errorLog.url,
      timestamp: errorLog.timestamp
    };
    
    // エラー分析用のプロンプトを作成
    const analysisPrompt = `
以下のフロントエンドエラーを分析してください：

エラー: ${errorLog.error}
URL: ${errorLog.url}
スタックトレース:
${errorLog.stack || 'なし'}

このエラーについて：
1. 原因の特定
2. 具体的な修正方法
3. 修正すべきファイルとコード
4. 再発防止策

JSON形式で回答してください：
{
  "cause": "エラーの原因",
  "solution": "修正方法",
  "files": ["修正すべきファイル"],
  "code": "修正コード例",
  "prevention": "再発防止策"
}`;

    // Claudeに分析を依頼（プロンプトエディターを使用）
    const { stdout } = await execAsync(`
      node ${path.join(__dirname, 'prompt-editor.js')} test-direct claude/analyze-error.txt \
      error="${errorLog.error.replace(/"/g, '\\"')}" \
      stack="${(errorLog.stack || '').replace(/"/g, '\\"')}" \
      url="${errorLog.url}" \
      --non-interactive
    `).catch(async (error) => {
      // analyze-error.txtが存在しない場合は作成
      const promptPath = path.join(__dirname, '../../lib/prompts/claude/analyze-error.txt');
      await fs.mkdir(path.dirname(promptPath), { recursive: true });
      await fs.writeFile(promptPath, `あなたはフロントエンドエラーを分析する専門家です。

以下のエラーを分析してください：
エラー: \${error}
URL: \${url}
スタックトレース: \${stack}

以下の形式で回答してください：
{
  "cause": "エラーの原因",
  "solution": "修正方法", 
  "files": ["修正すべきファイル"],
  "code": "修正コード例",
  "prevention": "再発防止策"
}`);
      
      // 簡易的な分析を実行
      return { stdout: JSON.stringify({
        cause: errorLog.error,
        solution: "エラーの詳細を確認してください",
        files: [],
        code: "",
        prevention: "エラーハンドリングを追加"
      })};
    });
    
    // 結果をパース
    let analysis;
    try {
      const jsonMatch = stdout.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch (e) {
      analysis = {
        cause: "分析エラー",
        solution: stdout,
        files: [],
        code: "",
        prevention: ""
      };
    }
    
    // 分析結果を保存
    errorLog.analyzing = false;
    errorLog.analysis = analysis;
    
    // 自動修正の試行
    if (analysis.files && analysis.files.length > 0 && analysis.code) {
      console.log(chalk.green('🔧 自動修正を試行中...'));
      await attemptAutoFix(errorLog, analysis);
    }
    
    console.log(chalk.green('✅ AI分析完了'));
    console.log(chalk.cyan('原因:'), analysis.cause);
    console.log(chalk.cyan('解決策:'), analysis.solution);
    
  } catch (error) {
    console.error(chalk.red('AI分析エラー:'), error);
    errorLog.analyzing = false;
    errorLog.analysis = {
      cause: "分析に失敗しました",
      solution: error.message,
      files: [],
      code: "",
      prevention: ""
    };
  }
}

// 自動修正の試行
async function attemptAutoFix(errorLog, analysis) {
  try {
    // 修正対象ファイルが存在するか確認
    for (const file of analysis.files) {
      const filePath = path.join(process.cwd(), file);
      
      try {
        await fs.access(filePath);
        console.log(chalk.yellow(`📝 ${file} を修正中...`));
        
        // 修正内容を記録
        errorLog.autoFix = {
          attempted: true,
          files: analysis.files,
          code: analysis.code,
          status: 'pending'
        };
        
        // TODO: 実際の修正処理
        // ここではログのみ
        console.log(chalk.blue('修正案:'));
        console.log(analysis.code);
        
      } catch (e) {
        console.log(chalk.red(`❌ ファイルが見つかりません: ${file}`));
      }
    }
  } catch (error) {
    console.error(chalk.red('自動修正エラー:'), error);
  }
}

// エラー一覧取得（AI分析結果付き）
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
    error.solution = solution || error.analysis?.solution;
    
    // ERRORS.mdに追記
    if (error.solution) {
      await appendToErrorsFile(error);
    }
    
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Error not found' });
  }
});

// デバッグダッシュボード（AI分析結果表示）
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>AI Frontend Debugger</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
    }
    h1 {
      color: #333;
      margin-bottom: 30px;
    }
    .ai-badge {
      display: inline-block;
      background: #6366f1;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      margin-left: 10px;
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
      max-height: 150px;
      overflow-y: auto;
      margin-bottom: 15px;
    }
    .ai-analysis {
      background: #f0f3ff;
      border: 1px solid #c7d2fe;
      padding: 15px;
      border-radius: 6px;
      margin-top: 15px;
    }
    .ai-analysis h4 {
      color: #4f46e5;
      margin: 0 0 10px 0;
      font-size: 14px;
    }
    .ai-section {
      margin-bottom: 12px;
    }
    .ai-section-title {
      font-weight: 600;
      color: #6366f1;
      font-size: 13px;
      margin-bottom: 4px;
    }
    .ai-section-content {
      color: #4b5563;
      font-size: 13px;
      line-height: 1.5;
    }
    .code-block {
      background: #1f2937;
      color: #e5e7eb;
      padding: 10px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
      overflow-x: auto;
      margin-top: 5px;
    }
    .analyzing {
      display: inline-block;
      color: #6366f1;
      font-size: 13px;
      margin-left: 10px;
    }
    .analyzing::after {
      content: '...';
      animation: dots 1.5s infinite;
    }
    @keyframes dots {
      0%, 20% { content: '.'; }
      40% { content: '..'; }
      60%, 100% { content: '...'; }
    }
    .error-time {
      color: #9ca3af;
      font-size: 12px;
      position: absolute;
      top: 20px;
      right: 20px;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
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
    .stat-card.ai {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
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
    .stat-card.ai .stat-label {
      color: rgba(255,255,255,0.9);
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
    .apply-fix-btn {
      background: #6366f1;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      margin-left: 10px;
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
  </style>
</head>
<body>
  <div class="container">
    <h1>🤖 AI Frontend Debugger <span class="ai-badge">Claude対応</span></h1>
    
    <div class="inject-script">
      <h3>ブラウザコンソールに貼り付けるスクリプト:</h3>
      <code id="inject-code">(function(){const d='http://localhost:${PORT}';window.addEventListener('error',e=>{fetch(d+'/api/debug/error',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({error:e.message,stack:e.error?.stack,url:location.href,timestamp:new Date().toISOString(),userAgent:navigator.userAgent})}).catch(()=>{})});console.log('🤖 AI Frontend Debugger connected to '+d)})();</code>
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
      <div class="stat-card ai">
        <div class="stat-number" id="ai-analyzed">0</div>
        <div class="stat-label">AI分析済み</div>
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
      fetch('/api/debug/error/' + id + '/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solution: null })
      }).then(() => {
        loadErrors();
      });
    }
    
    function applyFix(id) {
      alert('修正コードが生成されました。実装は今後のアップデートで対応予定です。');
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
            document.getElementById('ai-analyzed').textContent = '0';
            return;
          }
          
          const unresolved = errors.filter(e => !e.resolved).length;
          const resolved = errors.filter(e => e.resolved).length;
          const analyzed = errors.filter(e => e.analysis && !e.analyzing).length;
          
          document.getElementById('total-count').textContent = errors.length;
          document.getElementById('unresolved-count').textContent = unresolved;
          document.getElementById('resolved-count').textContent = resolved;
          document.getElementById('ai-analyzed').textContent = analyzed;
          
          container.innerHTML = errors.map(error => {
            let analysisHtml = '';
            
            if (error.analyzing) {
              analysisHtml = '<span class="analyzing">AI分析中</span>';
            } else if (error.analysis) {
              analysisHtml = \`
                <div class="ai-analysis">
                  <h4>🤖 AI分析結果</h4>
                  <div class="ai-section">
                    <div class="ai-section-title">原因:</div>
                    <div class="ai-section-content">\${error.analysis.cause}</div>
                  </div>
                  <div class="ai-section">
                    <div class="ai-section-title">解決策:</div>
                    <div class="ai-section-content">\${error.analysis.solution}</div>
                  </div>
                  \${error.analysis.files && error.analysis.files.length > 0 ? \`
                    <div class="ai-section">
                      <div class="ai-section-title">修正対象ファイル:</div>
                      <div class="ai-section-content">\${error.analysis.files.join(', ')}</div>
                    </div>
                  \` : ''}
                  \${error.analysis.code ? \`
                    <div class="ai-section">
                      <div class="ai-section-title">修正コード:</div>
                      <div class="code-block">\${error.analysis.code}</div>
                    </div>
                  \` : ''}
                  \${error.analysis.prevention ? \`
                    <div class="ai-section">
                      <div class="ai-section-title">再発防止策:</div>
                      <div class="ai-section-content">\${error.analysis.prevention}</div>
                    </div>
                  \` : ''}
                </div>
              \`;
            }
            
            return \`
              <div class="error-item \${error.resolved ? 'resolved' : ''}">
                <div class="error-time">\${new Date(error.timestamp).toLocaleString('ja-JP')}</div>
                <div class="error-title">\${error.error}</div>
                <div class="error-url">\${error.url}</div>
                \${error.stack ? \`<div class="error-stack">\${error.stack}</div>\` : ''}
                \${analysisHtml}
                \${error.resolved ? 
                  \`<div style="margin-top: 10px; color: #10b981;">✓ 解決済み</div>\` :
                  \`<button class="resolve-btn" onclick="resolveError(\${error.id})">解決済みにする</button>
                   \${error.analysis && error.analysis.code ? 
                     \`<button class="apply-fix-btn" onclick="applyFix(\${error.id})">修正を適用</button>\` : ''
                   }\`
                }
              </div>
            \`;
          }).join('');
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
    
    const solution = error.solution || error.analysis?.solution || '解決策なし';
    const aiAnalysis = error.analysis ? `
**AI分析**:
- 原因: ${error.analysis.cause}
- 再発防止: ${error.analysis.prevention || 'なし'}
` : '';
    
    const newEntry = `
## ${error.error}

**発生日**: ${date}  
**URL**: ${error.url}  
**解決策**: ${solution}
${aiAnalysis}
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
🤖 AI Frontend Debugger が起動しました！

1. ブラウザで http://localhost:${PORT} を開く
2. 表示されたスクリプトをコピー
3. デバッグしたいページのコンソールに貼り付け
4. エラーが自動的にAIで分析されます

${chalk.cyan('✨ 新機能:')}
- Claudeによる自動エラー分析
- 修正コードの自動生成
- 修正対象ファイルの特定
- 再発防止策の提案

${chalk.yellow('Ctrl+C で終了')}
  `));
});