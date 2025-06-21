#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const MONITOR_FILE = path.join(__dirname, '..', '.subtask-monitor.md');
const UPDATE_INTERVAL = 5000; // 5秒ごとに更新

function updateMonitor() {
  const now = new Date().toLocaleString('ja-JP');
  
  // ビルドエラーの取得
  let buildErrors = 'エラーなし';
  try {
    const buildErrorFile = path.join(__dirname, '..', '.claude-build-errors.md');
    if (fs.existsSync(buildErrorFile)) {
      const content = fs.readFileSync(buildErrorFile, 'utf8');
      const lines = content.split('\n');
      buildErrors = lines.slice(-20).join('\n') || 'エラーなし';
    }
  } catch (e) {}

  // バックエンドエラーの取得
  let backendErrors = 'エラーなし';
  try {
    const result = execSync('tail -10 logs/backend-errors.log 2>/dev/null || echo "ログファイルなし"', { encoding: 'utf8' });
    backendErrors = result || 'エラーなし';
  } catch (e) {}

  // DB整合性チェック（簡易版）
  let dbStatus = '確認中...';
  try {
    const result = execSync('grep -E "(viral_sessions|session_activity_logs)" prisma/schema.prisma | head -10', { encoding: 'utf8' });
    dbStatus = `スキーマ定義:\n${result}`;
  } catch (e) {}

  // 実行中のプロセス確認
  let processes = '';
  try {
    const result = execSync('ps aux | grep -E "(error-capture|error-monitor|build-monitor)" | grep -v grep | wc -l', { encoding: 'utf8' });
    const count = parseInt(result.trim());
    processes = `監視プロセス: ${count}個稼働中`;
  } catch (e) {}

  // モニターファイルの更新
  const content = `# サブタスク監視ダッシュボード

## 🔴 ビルドエラー状態
*最終更新: ${now}*

\`\`\`
${buildErrors.slice(-500)}
\`\`\`

## 🟡 バックエンドエラー
*最終更新: ${now}*

\`\`\`
${backendErrors.slice(-500)}
\`\`\`

## 🟢 DB整合性チェック
*最終更新: ${now}*

\`\`\`
${dbStatus}
\`\`\`

## 📊 サブタスク実行状況
- [x] ビルドエラー監視
- [x] バックエンドエラー監視
- [x] DB整合性チェック
- [ ] 型定義チェック

## 🔧 システム状態
${processes}
`;

  fs.writeFileSync(MONITOR_FILE, content);
  console.log(`✅ Monitor updated at ${now}`);
}

// 初回実行
updateMonitor();

// 定期実行
setInterval(updateMonitor, UPDATE_INTERVAL);

console.log('🚀 サブタスク監視を開始しました');
console.log(`📄 VS Codeで ${MONITOR_FILE} を開いて監視状況を確認できます`);
console.log('停止するには Ctrl+C を押してください');