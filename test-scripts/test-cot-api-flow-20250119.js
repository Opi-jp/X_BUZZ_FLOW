#!/usr/bin/env node

/**
 * CoT API フローの動作確認スクリプト
 * 作成日: 2025-01-19
 * 
 * 目的: APIレベルでCoTシステムの動作を確認し、エラーを特定する
 */

const testTheme = "AIと未来の働き方";

async function testAPI(endpoint, method = 'GET', body = null) {
  console.log(`\n📍 Testing: ${method} ${endpoint}`);
  
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`http://localhost:3000${endpoint}`, options);
    const data = await response.json();
    
    if (!response.ok) {
      console.error(`❌ Error ${response.status}: ${data.error || 'Unknown error'}`);
      return { success: false, error: data.error, status: response.status };
    }
    
    console.log(`✅ Success:`, JSON.stringify(data, null, 2).slice(0, 200) + '...');
    return { success: true, data };
  } catch (error) {
    console.error(`❌ Network Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runCoTFlow() {
  console.log("🚀 Starting CoT API Flow Test");
  console.log("================================");
  
  // Step 1: セッション作成
  console.log("\n📋 Step 1: Creating Session");
  const createResult = await testAPI('/api/generation/content/session/create', 'POST', {
    theme: testTheme,
    platform: 'Twitter',
    style: 'エンターテイメント'
  });
  
  if (!createResult.success) {
    console.error("⛔ Failed to create session. Stopping test.");
    return;
  }
  
  const sessionId = createResult.data.id || createResult.data.sessionId;
  console.log(`📌 Session ID: ${sessionId}`);
  
  // Step 2: Perplexityでトピック収集
  console.log("\n📋 Step 2: Collecting Topics (Perplexity)");
  const collectResult = await testAPI(`/api/generation/content/sessions/${sessionId}/collect`, 'POST');
  
  if (!collectResult.success) {
    console.error("⛔ Failed to collect topics. Checking alternative endpoints...");
    
    // 代替エンドポイントを試す
    const altCollectResult = await testAPI(`/api/generation/content/sessions/${sessionId}/collect-topics`, 'POST');
    if (!altCollectResult.success) {
      console.error("⛔ Both collect endpoints failed.");
      return;
    }
  }
  
  // セッション状態確認
  console.log("\n📋 Checking Session Status");
  const statusResult = await testAPI(`/api/generation/content/sessions/${sessionId}`, 'GET');
  
  if (statusResult.success) {
    console.log(`📊 Current Status: ${statusResult.data.status}`);
    console.log(`📊 Current Phase: ${statusResult.data.currentPhase}`);
  }
  
  // Step 3: GPTでコンセプト生成
  console.log("\n📋 Step 3: Generating Concepts (GPT)");
  const conceptResult = await testAPI(`/api/generation/content/sessions/${sessionId}/generate-concepts`, 'POST');
  
  if (!conceptResult.success) {
    console.error("⛔ Failed to generate concepts.");
    return;
  }
  
  // Step 4: Claudeでコンテンツ生成（キャラクター選択が必要な場合）
  console.log("\n📋 Step 4: Generating Character Contents (Claude)");
  
  // まず利用可能なコンセプトを確認
  const sessionData = await testAPI(`/api/generation/content/sessions/${sessionId}`, 'GET');
  if (sessionData.success && sessionData.data.concepts) {
    const concepts = sessionData.data.concepts;
    console.log(`📊 Available concepts: ${concepts.length}`);
    
    // 最初の3つのコンセプトを選択
    const selectedConcepts = concepts.slice(0, 3).map(c => c.id || concepts.indexOf(c));
    
    const contentResult = await testAPI(`/api/generation/content/sessions/${sessionId}/integrate`, 'POST', {
      selectedConcepts,
      characterId: 'cardi-dare'  // デフォルトキャラクター
    });
    
    if (!contentResult.success) {
      console.error("⛔ Failed to generate character contents.");
    }
  }
  
  // 最終状態確認
  console.log("\n📋 Final Session Status");
  const finalResult = await testAPI(`/api/generation/content/sessions/${sessionId}`, 'GET');
  
  if (finalResult.success) {
    console.log(`📊 Final Status: ${finalResult.data.status}`);
    console.log(`📊 Final Phase: ${finalResult.data.currentPhase}`);
    if (finalResult.data.viralDrafts && finalResult.data.viralDrafts.length > 0) {
      console.log(`✨ Generated ${finalResult.data.viralDrafts.length} drafts!`);
    }
  }
  
  console.log("\n================================");
  console.log("✅ Test Complete!");
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

// 実行
runCoTFlow().catch(console.error);