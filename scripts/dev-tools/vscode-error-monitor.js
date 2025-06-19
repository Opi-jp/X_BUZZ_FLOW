#!/usr/bin/env node

/**
 * VSCode内でエラーを直接表示するモニター
 * ターミナルでリアルタイムにエラーと解決策を表示
 */

const express = require('express');
const cors = require('cors');
const chalk = require('chalk');
const boxen = require('boxen').default || require('boxen');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);
const PORT = 3334;

const app = express();
app.use(cors());
app.use(express.json());

// 最新のエラーを保存
let latestError = null;
let errorCount = 0;

// エラー受信エンドポイント
app.post('/api/debug/error', async (req, res) => {
  const { error, stack, url, filename, lineno, colno } = req.body;
  
  errorCount++;
  latestError = {
    error,
    stack,
    url,
    filename,
    lineno,
    colno,
    timestamp: new Date().toISOString()
  };
  
  // ターミナルをクリア
  console.clear();
  
  // エラーをフォーマットして表示
  displayError(latestError);
  
  // AI分析を実行
  analyzeError(latestError);
  
  res.json({ success: true });
});

// エラーを見やすく表示
function displayError(errorInfo) {
  const errorBox = boxen(
    chalk.red.bold('🚨 フロントエンドエラーを検出！\n\n') +
    chalk.yellow('エラー: ') + chalk.white(errorInfo.error) + '\n' +
    chalk.yellow('ファイル: ') + chalk.cyan(errorInfo.filename || 'unknown') + '\n' +
    chalk.yellow('行番号: ') + chalk.white(`${errorInfo.lineno || '?'}:${errorInfo.colno || '?'}`) + '\n' +
    chalk.yellow('URL: ') + chalk.gray(errorInfo.url) + '\n' +
    chalk.yellow('時刻: ') + chalk.gray(new Date(errorInfo.timestamp).toLocaleTimeString('ja-JP')),
    {
      padding: 1,
      margin: 1,
      borderStyle: 'double',
      borderColor: 'red',
      backgroundColor: '#330000'
    }
  );
  
  console.log(errorBox);
  
  // スタックトレースがあれば表示
  if (errorInfo.stack) {
    console.log(chalk.dim('\nスタックトレース:'));
    console.log(chalk.gray(errorInfo.stack.split('\n').slice(0, 5).join('\n')));
  }
}

// AI分析を実行
async function analyzeError(errorInfo) {
  console.log(chalk.cyan('\n🤖 AI分析中...\n'));
  
  try {
    // エラーメッセージから問題を特定
    const quickFixes = getQuickFixes(errorInfo.error);
    
    if (quickFixes.length > 0) {
      // 即座に修正可能なエラー
      displayQuickFix(quickFixes[0]);
    } else {
      // より詳細な分析が必要
      await detailedAnalysis(errorInfo);
    }
  } catch (error) {
    console.log(chalk.red('AI分析エラー:'), error.message);
  }
}

// よくあるエラーのクイックフィックス
function getQuickFixes(errorMessage) {
  const fixes = [];
  
  // カッコの閉じ忘れ
  if (errorMessage.includes('Unexpected token') || errorMessage.includes('expected')) {
    fixes.push({
      type: 'syntax',
      title: '構文エラー',
      cause: 'カッコ、引用符、またはセミコロンの閉じ忘れの可能性',
      solution: '該当行の前後を確認し、以下をチェック:\n' +
                '  • すべての { に対応する } があるか\n' +
                '  • すべての ( に対応する ) があるか\n' +
                '  • 文字列の引用符が正しく閉じられているか\n' +
                '  • JSXタグが正しく閉じられているか',
      command: null
    });
  }
  
  // undefined/null参照
  if (errorMessage.includes('Cannot read properties of undefined') || 
      errorMessage.includes('Cannot read properties of null')) {
    const property = errorMessage.match(/property '(\w+)'/)?.[1];
    fixes.push({
      type: 'runtime',
      title: 'Null/Undefined参照エラー',
      cause: `オブジェクトが存在しない状態で "${property || 'プロパティ'}" にアクセスしようとしています`,
      solution: '以下の対策を試してください:\n' +
                '  • オプショナルチェイニング: obj?.property\n' +
                '  • Null合体演算子: value ?? defaultValue\n' +
                '  • 条件付きレンダリング: {data && <Component />}',
      command: null
    });
  }
  
  // import/export エラー
  if (errorMessage.includes('Module not found') || errorMessage.includes('Cannot find module')) {
    const module = errorMessage.match(/module '(.+?)'/)?.[1];
    fixes.push({
      type: 'import',
      title: 'モジュールが見つかりません',
      cause: `"${module || 'モジュール'}" が見つかりません`,
      solution: '以下を確認してください:\n' +
                '  • ファイルパスが正しいか\n' +
                '  • 拡張子を含めているか (.tsx, .ts)\n' +
                '  • 相対パスが正しいか (../ や ./)\n' +
                '  • パッケージがインストールされているか',
      command: module && !module.startsWith('.') ? `npm install ${module}` : null
    });
  }
  
  // React Hook エラー
  if (errorMessage.includes('Hooks can only be called')) {
    fixes.push({
      type: 'react',
      title: 'React Hookのルール違反',
      cause: 'Hookが条件分岐やループの中で呼ばれている可能性',
      solution: 'React Hookは以下のルールに従う必要があります:\n' +
                '  • 関数コンポーネントのトップレベルでのみ呼ぶ\n' +
                '  • 条件分岐やループの中で呼ばない\n' +
                '  • カスタムHookは "use" で始める',
      command: null
    });
  }
  
  return fixes;
}

// クイックフィックスを表示
function displayQuickFix(fix) {
  const fixBox = boxen(
    chalk.green.bold(`✨ ${fix.title}\n\n`) +
    chalk.yellow('原因:\n') + chalk.white(fix.cause) + '\n\n' +
    chalk.yellow('解決策:\n') + chalk.white(fix.solution) +
    (fix.command ? '\n\n' + chalk.yellow('実行コマンド:\n') + chalk.cyan(fix.command) : ''),
    {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'green',
      backgroundColor: '#003300'
    }
  );
  
  console.log(fixBox);
  
  if (fix.command) {
    console.log(chalk.dim('\n💡 ヒント: 上記のコマンドをターミナルで実行してください'));
  }
}

// 詳細な分析
async function detailedAnalysis(errorInfo) {
  // ファイル名から拡張子を取得
  const ext = errorInfo.filename?.split('.').pop();
  const isReact = ['tsx', 'jsx'].includes(ext || '');
  
  const analysisBox = boxen(
    chalk.blue.bold('🔍 詳細分析\n\n') +
    chalk.yellow('エラータイプ: ') + chalk.white(getErrorType(errorInfo.error)) + '\n' +
    chalk.yellow('発生場所: ') + chalk.white(`${errorInfo.filename || 'unknown'}:${errorInfo.lineno || '?'}`) + '\n' +
    chalk.yellow('フレームワーク: ') + chalk.white(isReact ? 'React/Next.js' : 'JavaScript') + '\n\n' +
    chalk.cyan('推奨アクション:\n') +
    chalk.white('1. エラー発生行の前後を確認\n') +
    chalk.white('2. console.logでデバッグ情報を追加\n') +
    chalk.white('3. TypeScriptの型定義を確認\n') +
    chalk.white('4. 関連するコンポーネントの props を確認'),
    {
      padding: 1,
      margin: 1,
      borderStyle: 'classic',
      borderColor: 'blue'
    }
  );
  
  console.log(analysisBox);
}

// エラータイプを判定
function getErrorType(errorMessage) {
  if (errorMessage.includes('SyntaxError')) return '構文エラー';
  if (errorMessage.includes('TypeError')) return '型エラー';
  if (errorMessage.includes('ReferenceError')) return '参照エラー';
  if (errorMessage.includes('RangeError')) return '範囲エラー';
  return 'ランタイムエラー';
}

// 統計情報を表示
setInterval(() => {
  if (errorCount > 0) {
    const stats = chalk.gray(`\n📊 エラー統計: ${errorCount}件のエラーを検出`);
    console.log(stats);
  }
}, 30000);

// サーバー起動
app.listen(PORT, () => {
  console.clear();
  
  const welcomeBox = boxen(
    chalk.green.bold('🎯 VSCode エラーモニター\n\n') +
    chalk.white('フロントエンドエラーをリアルタイムで監視します\n\n') +
    chalk.cyan('機能:\n') +
    chalk.white('  • エラーの即座検出\n') +
    chalk.white('  • AI による原因分析\n') +
    chalk.white('  • 解決策の提示\n') +
    chalk.white('  • クイックフィックス\n\n') +
    chalk.yellow(`監視中... (ポート: ${PORT})`),
    {
      padding: 1,
      margin: 1,
      borderStyle: 'double',
      borderColor: 'green',
      title: '✨ AI Error Monitor',
      titleAlignment: 'center'
    }
  );
  
  console.log(welcomeBox);
  console.log(chalk.dim('\nブラウザがこのモニターに自動接続されます...'));
});