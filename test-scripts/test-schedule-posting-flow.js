// スケジュール投稿フローの完全テスト
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testSchedulePostingFlow() {
  console.log('=== スケジュール投稿フロー完全テスト ===\n');
  
  try {
    // Step 1: 既存のCoTセッション確認
    console.log('📋 Step 1: 既存のCoTセッション確認');
    const sessions = await prisma.cotSession.findMany({
      where: {
        status: 'COMPLETED'
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 3
    });
    
    console.log(`✅ 完了済みセッション: ${sessions.length}件`);
    
    if (sessions.length === 0) {
      console.log('⚠️  完了済みセッションがありません。先にCoT生成を実行してください。');
      return;
    }
    
    const targetSession = sessions[0];
    console.log(`🎯 対象セッション: ${targetSession.id}`);
    console.log(`   専門分野: ${targetSession.expertise}`);
    console.log(`   作成日時: ${targetSession.createdAt}`);
    
    // Step 2: 既存の下書き確認
    console.log('\n📝 Step 2: 既存の下書き確認');
    const existingDrafts = await prisma.cotDraft.findMany({
      where: {
        sessionId: targetSession.id
      }
    });
    
    console.log(`✅ 既存下書き数: ${existingDrafts.length}件`);
    existingDrafts.forEach((draft, index) => {
      console.log(`   ${index + 1}. ${draft.title} (${draft.status})`);
    });
    
    // Step 3: スケジュール投稿用の下書きを作成
    console.log('\n⏰ Step 3: スケジュール投稿用下書きの作成');
    
    // 5分後にスケジュール
    const scheduledTime = new Date(Date.now() + 5 * 60 * 1000);
    
    const testDraft = await prisma.cotDraft.create({
      data: {
        sessionId: targetSession.id,
        title: '【テスト】スケジュール投稿フロー確認',
        content: `🧪 X_BUZZ_FLOW スケジュール投稿テスト

Chain of Thoughtシステムの自動投稿機能をテスト中です。

⏰ 予定投稿時間: ${scheduledTime.toLocaleString('ja-JP')}
🤖 モック投稿モードで実行

#X_BUZZ_FLOW #テスト #スケジュール投稿`,
        status: 'SCHEDULED',
        scheduledAt: scheduledTime,
        conceptNumber: 1,
        hashtags: ['X_BUZZ_FLOW', 'テスト', 'スケジュール投稿']
      }
    });
    
    console.log(`✅ スケジュール下書き作成完了: ${testDraft.id}`);
    console.log(`   投稿予定時刻: ${scheduledTime.toLocaleString('ja-JP')}`);
    console.log(`   文字数: ${testDraft.content.length}文字`);
    
    // Step 4: 即座投稿テスト
    console.log('\n🚀 Step 4: 即座投稿APIテスト');
    
    const immediateDraft = await prisma.cotDraft.create({
      data: {
        sessionId: targetSession.id,
        title: '【テスト】即座投稿フロー確認',
        content: `🧪 X_BUZZ_FLOW 即座投稿テスト

Chain of Thoughtシステムの即座投稿機能をテスト中です。

⚡ 即座投稿モード
🤖 モック投稿で実行

${new Date().toLocaleString('ja-JP')}

#X_BUZZ_FLOW #テスト #即座投稿`,
        status: 'DRAFT',
        conceptNumber: 2,
        hashtags: ['X_BUZZ_FLOW', 'テスト', '即座投稿']
      }
    });
    
    console.log(`✅ 即座投稿用下書き作成: ${immediateDraft.id}`);
    
    // Step 5: 投稿APIの呼び出しテスト
    console.log('\n📡 Step 5: 投稿APIテスト（モック）');
    
    try {
      const response = await fetch('http://localhost:3000/api/viral/cot-draft/' + immediateDraft.id, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'post'
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log('✅ 即座投稿API成功');
        console.log(`   投稿ID: ${result.postId}`);
        console.log(`   URL: ${result.url}`);
        console.log(`   モック: ${result.mock ? 'Yes' : 'No'}`);
      } else {
        console.log('❌ 即座投稿API失敗');
        console.log('   エラー:', result.error);
      }
    } catch (apiError) {
      console.log('❌ API呼び出しエラー:', apiError.message);
    }
    
    // Step 6: スケジュール投稿Cronのテスト
    console.log('\n⏰ Step 6: スケジュール投稿Cronテスト');
    
    try {
      const cronResponse = await fetch('http://localhost:3000/api/cron/scheduled-posts', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const cronResult = await cronResponse.json();
      
      if (cronResponse.ok) {
        console.log('✅ スケジュール投稿Cron成功');
        console.log(`   処理数: ${cronResult.processed}件`);
        console.log(`   結果: ${JSON.stringify(cronResult.results, null, 2)}`);
      } else {
        console.log('❌ スケジュール投稿Cron失敗');
        console.log('   エラー:', cronResult.error);
      }
    } catch (cronError) {
      console.log('❌ Cron呼び出しエラー:', cronError.message);
    }
    
    // Step 7: 状況確認
    console.log('\n📊 Step 7: 最終状況確認');
    
    const finalDrafts = await prisma.cotDraft.findMany({
      where: {
        sessionId: targetSession.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`📝 セッション内の全下書き状況:`);
    finalDrafts.forEach((draft, index) => {
      console.log(`   ${index + 1}. ${draft.title}`);
      console.log(`      ステータス: ${draft.status}`);
      console.log(`      投稿ID: ${draft.postId || 'なし'}`);
      console.log(`      スケジュール: ${draft.scheduledAt ? draft.scheduledAt.toLocaleString('ja-JP') : 'なし'}`);
    });
    
    console.log('\n🎉 スケジュール投稿フローテスト完了！');
    console.log(`\n⏰ 次回Cron実行時（5分後）に自動投稿されます: ${scheduledTime.toLocaleString('ja-JP')}`);
    
  } catch (error) {
    console.error('❌ テスト実行エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSchedulePostingFlow().catch(console.error);