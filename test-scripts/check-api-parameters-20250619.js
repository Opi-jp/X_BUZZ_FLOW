#!/usr/bin/env node

/**
 * APIパラメータ整合性チェック
 * 各APIが期待するパラメータと、実際に送られるパラメータを確認
 */

const fs = require('fs').promises;
const path = require('path');

async function checkAPIParameters() {
  console.log('🔍 APIパラメータ整合性チェック\n');

  const apiChecks = [
    {
      name: 'セッション作成',
      endpoint: '/api/flow',
      file: '/app/api/flow/route.ts',
      expects: ['theme', 'platform', 'style'],
      sends: ['theme', 'platform', 'style']
    },
    {
      name: 'フロー進行',
      endpoint: '/api/flow/[id]/next',
      file: '/app/api/flow/[id]/next/route.ts',
      expects: ['autoProgress', 'selectedConcepts', 'characterId'],
      sends: ['autoProgress']
    },
    {
      name: 'Perplexity収集',
      endpoint: '/api/generation/content/sessions/[id]/collect',
      file: '/app/api/generation/content/sessions/[id]/collect/route.ts',
      expects: [],
      sends: ['theme', 'platform', 'style']
    },
    {
      name: 'GPTコンセプト生成',
      endpoint: '/api/generation/content/sessions/[id]/generate-concepts',
      file: '/app/api/generation/content/sessions/[id]/generate-concepts/route.ts',
      expects: [],
      sends: []
    },
    {
      name: 'Claude生成',
      endpoint: '/api/generation/content/sessions/[id]/generate',
      file: '/app/api/generation/content/sessions/[id]/generate/route.ts',
      expects: ['characterId'],
      sends: ['characterId']
    },
    {
      name: 'Twitter投稿',
      endpoint: '/api/post',
      file: '/app/api/post/route.ts',
      expects: ['text', 'draftId'],
      sends: ['content', 'hashtags', 'draftId']  // 不一致！
    }
  ];

  const issues = [];

  for (const check of apiChecks) {
    console.log(`📋 ${check.name} (${check.endpoint})`);
    console.log(`  期待: ${check.expects.join(', ') || '(なし)'}`);
    console.log(`  送信: ${check.sends.join(', ') || '(なし)'}`);
    
    // パラメータの不一致をチェック
    const missingParams = check.expects.filter(p => !check.sends.includes(p));
    const extraParams = check.sends.filter(p => !check.expects.includes(p));
    
    if (missingParams.length > 0 || extraParams.length > 0) {
      console.log(`  ❌ 不一致あり`);
      if (missingParams.length > 0) {
        console.log(`     不足: ${missingParams.join(', ')}`);
      }
      if (extraParams.length > 0) {
        console.log(`     余剰: ${extraParams.join(', ')}`);
      }
      issues.push({
        api: check.name,
        endpoint: check.endpoint,
        missingParams,
        extraParams
      });
    } else {
      console.log(`  ✅ 一致`);
    }
    console.log('');
  }

  if (issues.length > 0) {
    console.log('\n⚠️  発見された問題:\n');
    for (const issue of issues) {
      console.log(`${issue.api}:`);
      if (issue.missingParams.length > 0) {
        console.log(`  - APIは「${issue.missingParams.join('、')}」を期待していますが、送信されていません`);
      }
      if (issue.extraParams.length > 0) {
        console.log(`  - 「${issue.extraParams.join('、')}」が送信されていますが、APIは期待していません`);
      }
    }

    console.log('\n💡 修正提案:');
    console.log('1. Twitter投稿API: content → text に変更');
    console.log('2. Twitter投稿API: hashtags パラメータは不要（contentに含まれている）');
  } else {
    console.log('\n✅ すべてのAPIパラメータが整合しています');
  }
}

checkAPIParameters();