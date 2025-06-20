#!/usr/bin/env node

/**
 * 最終パラメータ整合性チェック
 */

console.log('📋 API パラメータ最終チェックリスト\n');

const issues = [
  {
    api: '/api/post',
    issue: 'content → text',
    severity: '🔴 致命的',
    status: '❌ 未修正',
    fix: 'test-flow-to-post-20250619.js で content を text に変更'
  },
  {
    api: '/api/flow/[id]',
    issue: 'レスポンスのstatus→session.status',
    severity: '🟡 中程度',
    status: '✅ 修正済み',
    fix: 'test-complete-flow-e2e-20250619.js で対応済み'
  },
  {
    api: '/api/drafts',
    issue: '配列 vs オブジェクトレスポンス',
    severity: '🟡 中程度', 
    status: '✅ 修正済み',
    fix: 'test-complete-flow-e2e-20250619.js で対応済み'
  },
  {
    api: '/api/generation/content/sessions/[id]/collect',
    issue: '余剰パラメータ（theme, platform, style）',
    severity: '🟢 軽微',
    status: '✅ 無害',
    fix: '修正不要'
  }
];

console.log('発見された問題:');
issues.forEach(issue => {
  console.log(`\n${issue.severity} ${issue.api}`);
  console.log(`  問題: ${issue.issue}`);
  console.log(`  状態: ${issue.status}`);
  console.log(`  対応: ${issue.fix}`);
});

const criticalIssues = issues.filter(i => i.status === '❌ 未修正');

if (criticalIssues.length > 0) {
  console.log('\n\n⚠️  致命的な問題が残っています！');
  console.log('投稿テストは失敗します。');
  console.log('\n必要な修正:');
  console.log('1. test-flow-to-post-20250619.js の108行目:');
  console.log('   content: draftToPost.content → text: draftToPost.content');
} else {
  console.log('\n\n✅ すべての致命的な問題は解決済みです');
}