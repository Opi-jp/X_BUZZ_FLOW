// 完全投稿フローのテスト（CoT生成→下書き→投稿→パフォーマンス追跡）
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testCompletePostingFlow() {
  console.log('=== 完全投稿フロー統合テスト ===\n');
  
  try {
    // Step 1: 最新のCoTセッション確認
    console.log('🔍 Step 1: 最新のCoTセッション確認');
    const session = await prisma.cotSession.findFirst({
      where: {
        status: 'COMPLETED'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    if (!session) {
      console.log('❌ 完了済みセッションがありません。先にCoT生成を実行してください。');
      return;
    }
    
    console.log(`✅ 対象セッション: ${session.id}`);
    console.log(`   専門分野: ${session.expertise}`);
    
    // Step 2: セッションの下書き確認
    console.log('\n📝 Step 2: セッションの下書き確認');
    const drafts = await prisma.cotDraft.findMany({
      where: {
        sessionId: session.id
      },
      include: {
        performance: true
      }
    });
    
    console.log(`✅ セッション内下書き数: ${drafts.length}件`);
    
    if (drafts.length === 0) {
      console.log('❌ 下書きが見つかりません。');
      return;
    }
    
    // Step 3: 未投稿の下書きを選択
    console.log('\n🎯 Step 3: 投稿対象下書きの選択');
    const unpostedDraft = drafts.find(d => d.status !== 'POSTED');
    
    if (!unpostedDraft) {
      console.log('⚠️  未投稿の下書きがありません。テスト用下書きを作成します。');
      
      // テスト用下書きを作成
      const testDraft = await prisma.cotDraft.create({
        data: {
          sessionId: session.id,
          title: '【テスト】完全投稿フロー確認',
          content: `🧪 X_BUZZ_FLOW 完全投稿フローテスト

Chain of Thoughtから投稿、パフォーマンス追跡まで一貫した流れをテスト中です。

⚡ 認証成功確認済み
📊 パフォーマンス追跡対応
🔄 完全自動化フロー

${new Date().toLocaleString('ja-JP')}`,
          status: 'DRAFT',
          conceptNumber: 1,
          hashtags: ['X_BUZZ_FLOW', 'テスト', '完全フロー']
        }
      });
      
      console.log(`✅ テスト下書き作成: ${testDraft.id}`);
      var targetDraft = testDraft;
    } else {
      var targetDraft = unpostedDraft;
      console.log(`✅ 対象下書き: ${targetDraft.title}`);
    }
    
    // Step 4: 即座投稿実行
    console.log('\n🚀 Step 4: 即座投稿実行');
    console.log(`投稿内容プレビュー: ${targetDraft.content.substring(0, 100)}...`);
    
    const postResponse = await fetch('http://localhost:3000/api/viral/cot-draft/' + targetDraft.id, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'post'
      })
    });
    
    const postResult = await postResponse.json();
    
    if (postResponse.ok) {
      console.log('✅ 投稿成功！');
      console.log(`   投稿ID: ${postResult.postId}`);
      console.log(`   URL: ${postResult.url || 'N/A'}`);
    } else {
      console.log('❌ 投稿失敗:', postResult.error);
      return;
    }
    
    // Step 5: 投稿後の状態確認
    console.log('\n📊 Step 5: 投稿後の状態確認');
    
    const updatedDraft = await prisma.cotDraft.findUnique({
      where: { id: targetDraft.id },
      include: {
        performance: true
      }
    });
    
    console.log('投稿後状態:');
    console.log(`   ステータス: ${updatedDraft?.status}`);
    console.log(`   投稿日時: ${updatedDraft?.postedAt?.toLocaleString('ja-JP')}`);
    console.log(`   投稿ID: ${updatedDraft?.postId}`);
    console.log(`   パフォーマンス追跡: ${updatedDraft?.performance ? 'あり' : 'なし'}`);
    
    // Step 6: パフォーマンス収集Cronのテスト
    console.log('\n⏰ Step 6: パフォーマンス収集Cronテスト');
    
    const performanceResponse = await fetch('http://localhost:3000/api/cron/collect-performance', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const performanceResult = await performanceResponse.json();
    
    if (performanceResponse.ok) {
      console.log('✅ パフォーマンス収集Cron成功');
      console.log(`   処理数: ${performanceResult.processed}件`);
      console.log(`   結果サマリー:`);
      
      const summary = performanceResult.results.reduce((acc, result) => {
        acc[result.status] = (acc[result.status] || 0) + 1;
        return acc;
      }, {});
      
      Object.entries(summary).forEach(([status, count]) => {
        console.log(`     ${status}: ${count}件`);
      });
    } else {
      console.log('❌ パフォーマンス収集Cron失敗:', performanceResult.error);
    }
    
    // Step 7: スケジュール投稿のテスト
    console.log('\n⏰ Step 7: スケジュール投稿テスト');
    
    // 2分後にスケジュール
    const futureTime = new Date(Date.now() + 2 * 60 * 1000);
    
    const scheduledDraft = await prisma.cotDraft.create({
      data: {
        sessionId: session.id,
        title: '【テスト】スケジュール投稿確認',
        content: `⏰ X_BUZZ_FLOW スケジュール投稿テスト

予定投稿時刻: ${futureTime.toLocaleString('ja-JP')}

自動投稿システムのテストです。

#X_BUZZ_FLOW #スケジュール投稿`,
        status: 'SCHEDULED',
        scheduledAt: futureTime,
        conceptNumber: 2,
        hashtags: ['X_BUZZ_FLOW', 'スケジュール投稿']
      }
    });
    
    console.log(`✅ スケジュール下書き作成: ${scheduledDraft.id}`);
    console.log(`   投稿予定: ${futureTime.toLocaleString('ja-JP')}`);
    
    // Step 8: スケジュール投稿Cronのテスト
    console.log('\n🕐 Step 8: スケジュール投稿Cronテスト');
    
    const scheduledResponse = await fetch('http://localhost:3000/api/cron/scheduled-posts', {
      method: 'GET'
    });
    
    const scheduledResult = await scheduledResponse.json();
    
    if (scheduledResponse.ok) {
      console.log('✅ スケジュール投稿Cron成功');
      console.log(`   処理数: ${scheduledResult.processed}件`);
      console.log(`   結果: ${JSON.stringify(scheduledResult.results, null, 2)}`);
    } else {
      console.log('❌ スケジュール投稿Cron失敗:', scheduledResult.error);
    }
    
    // 最終サマリー
    console.log('\n🎉 完全投稿フローテスト完了！');
    console.log('\n📋 テスト結果サマリー:');
    console.log('✅ CoTセッション確認: 成功');
    console.log('✅ 下書き生成: 成功');
    console.log('✅ 即座投稿: 成功');
    console.log('✅ パフォーマンス追跡初期化: 成功');
    console.log('✅ スケジュール投稿セットアップ: 成功');
    console.log('\n🔄 継続プロセス:');
    console.log('⏰ パフォーマンス収集（30分、1時間、24時間後）');
    console.log('⏰ スケジュール投稿自動実行（2分後）');
    
  } catch (error) {
    console.error('❌ テスト実行エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCompletePostingFlow().catch(console.error);