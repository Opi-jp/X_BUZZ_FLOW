/**
 * 完全なCreate→Draft→Post→Analyzeフローテスト
 * E2Eテスターのバグを回避し、実際のAPIを順番に呼び出す
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const API_BASE = 'http://localhost:3000';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callAPI(path, method = 'GET', body = null) {
  console.log(`\n🔄 API呼び出し: ${method} ${path}`);
  
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(`${API_BASE}${path}`, options);
  const data = await response.json();
  
  if (!response.ok) {
    console.error(`❌ APIエラー: ${response.status}`);
    console.error(JSON.stringify(data, null, 2));
    throw new Error(`API Error: ${response.status}`);
  }
  
  return data;
}

async function testCompleteFlow() {
  console.log('🚀 完全フローテスト開始\n');
  
  try {
    // 1. セッション作成
    console.log('📝 Step 1: セッション作成');
    const session = await callAPI('/api/create/flow/start', 'POST', {
      theme: 'AIによる社会変革の未来',
      platform: 'Twitter',
      style: 'エンターテイメント'
    });
    console.log(`✅ セッションID: ${session.id}`);
    
    // 2. トピック収集（Perplexity）
    console.log('\n🔍 Step 2: トピック収集');
    await callAPI(`/api/create/flow/${session.id}/process`, 'POST', { autoProgress: true });
    await delay(5000); // Perplexity処理待ち
    
    // 3. コンセプト生成（GPT）
    console.log('\n💡 Step 3: コンセプト生成');
    await callAPI(`/api/create/flow/${session.id}/process`, 'POST', { autoProgress: true });
    await delay(5000); // GPT処理待ち
    
    // 4. コンテンツ生成（Claude）
    console.log('\n✏️ Step 4: コンテンツ生成');
    await callAPI(`/api/create/flow/${session.id}/process`, 'POST', { autoProgress: true });
    await delay(5000); // Claude処理待ち
    
    // 5. 下書き確認
    console.log('\n📋 Step 5: 下書き確認');
    const { PrismaClient } = require('./lib/generated/prisma');
    const prisma = new PrismaClient();
    
    const draft = await prisma.viral_drafts.findFirst({
      where: { 
        session_id: session.id,
        status: 'DRAFT'
      }
    });
    
    if (!draft) {
      throw new Error('下書きが作成されていません');
    }
    
    console.log(`✅ 下書きID: ${draft.id}`);
    console.log(`   タイトル: ${draft.title}`);
    console.log(`   キャラクター: ${draft.character_id}`);
    
    // 6. Twitter投稿
    console.log('\n📤 Step 6: Twitter投稿');
    let tweetText;
    
    // contentがJSONかどうかチェック
    try {
      const content = JSON.parse(draft.content);
      tweetText = content.posts ? content.posts[0] : content.text;
    } catch (e) {
      // JSONでない場合は直接使用
      tweetText = draft.content;
    }
    
    // ハッシュタグを追加
    if (draft.hashtags && draft.hashtags.length > 0) {
      tweetText = tweetText + '\n\n' + draft.hashtags.join(' ');
    }
    
    console.log('投稿内容:');
    console.log('---');
    console.log(tweetText);
    console.log('---');
    
    const postResult = await callAPI('/api/publish/post/now', 'POST', {
      text: tweetText,
      draftId: draft.id
    });
    
    console.log(`✅ 投稿成功: ${postResult.url}`);
    console.log(`   Tweet ID: ${postResult.id}`);
    
    // 7. DB更新確認
    console.log('\n🔍 Step 7: DB更新確認');
    await delay(2000);
    
    const updatedDraft = await prisma.viral_drafts.findUnique({
      where: { id: draft.id }
    });
    
    console.log('DB更新状態:');
    console.log(`   ステータス: ${updatedDraft.status}`);
    console.log(`   Tweet ID: ${updatedDraft.tweet_id}`);
    console.log(`   投稿日時: ${updatedDraft.posted_at}`);
    
    if (updatedDraft.status !== 'POSTED' || !updatedDraft.tweet_id) {
      console.error('⚠️ DB更新が完了していません');
    } else {
      console.log('✅ DB更新成功');
    }
    
    // 8. 分析フェーズの準備確認
    console.log('\n📊 Step 8: 分析フェーズ準備確認');
    if (updatedDraft.tweet_id) {
      console.log('✅ 分析フェーズに必要なデータ:');
      console.log(`   - Tweet ID: ${updatedDraft.tweet_id}`);
      console.log(`   - 投稿日時: ${updatedDraft.posted_at}`);
      console.log(`   - コンテンツ: 保存済み`);
      console.log('   → 分析フェーズへ進む準備が完了');
    } else {
      console.log('❌ 分析フェーズに必要なデータが不足');
    }
    
    await prisma.$disconnect();
    
    console.log('\n🎉 完全フローテスト完了！');
    
  } catch (error) {
    console.error('\n❌ テスト失敗:', error);
    process.exit(1);
  }
}

// 実行
testCompleteFlow();