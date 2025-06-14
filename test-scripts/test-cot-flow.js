// CoT生成フロー動作確認スクリプト

const API_BASE = 'http://localhost:3000';

async function testCoTFlow() {
  console.log('=== CoT生成フローテスト開始 ===\n');
  
  try {
    // 1. セッション作成
    console.log('1. セッション作成中...');
    const createResponse = await fetch(`${API_BASE}/api/viral/cot-session/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        expertise: 'AIと働き方',
        platform: 'Twitter',
        style: 'educational'
      })
    });
    
    const createData = await createResponse.json();
    if (!createData.success) {
      throw new Error('セッション作成失敗: ' + JSON.stringify(createData));
    }
    
    const sessionId = createData.sessionId;
    console.log(`✅ セッション作成成功: ${sessionId}\n`);
    
    // 2. 各フェーズを実行
    const phases = [
      { name: 'Phase 1 THINK', expected: { phase: 1, step: 'THINK' } },
      { name: 'Phase 1 EXECUTE', expected: { phase: 1, step: 'EXECUTE' } },
      { name: 'Phase 1 INTEGRATE', expected: { phase: 1, step: 'INTEGRATE' } },
      { name: 'Phase 2 THINK', expected: { phase: 2, step: 'THINK' } },
      { name: 'Phase 2 EXECUTE', expected: { phase: 2, step: 'EXECUTE' } },
      { name: 'Phase 2 INTEGRATE', expected: { phase: 2, step: 'INTEGRATE' } },
      { name: 'Phase 3 THINK', expected: { phase: 3, step: 'THINK' } },
      { name: 'Phase 3 EXECUTE', expected: { phase: 3, step: 'EXECUTE' } },
      { name: 'Phase 3 INTEGRATE', expected: { phase: 3, step: 'INTEGRATE' } },
    ];
    
    let totalDuration = 0;
    
    for (const phaseInfo of phases) {
      console.log(`2. ${phaseInfo.name} 実行中...`);
      const startTime = Date.now();
      
      const processResponse = await fetch(`${API_BASE}/api/viral/cot-session/${sessionId}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const processData = await processResponse.json();
      const duration = Date.now() - startTime;
      totalDuration += duration;
      
      if (processData.error) {
        throw new Error(`${phaseInfo.name} エラー: ${processData.error} - ${processData.details}`);
      }
      
      console.log(`✅ ${phaseInfo.name} 完了 (${(duration / 1000).toFixed(1)}秒)`);
      
      if (processData.phase !== phaseInfo.expected.phase || processData.step !== phaseInfo.expected.step) {
        console.warn(`⚠️  期待値と異なる: 期待=${JSON.stringify(phaseInfo.expected)}, 実際=${JSON.stringify({phase: processData.phase, step: processData.step})}`);
      }
      
      if (processData.isCompleted) {
        console.log('\n🎉 Chain of Thought 完了!');
        break;
      }
    }
    
    console.log(`\n総実行時間: ${(totalDuration / 1000).toFixed(1)}秒`);
    
    // 3. 下書き確認
    console.log('\n3. 生成された下書きを確認中...');
    const draftsResponse = await fetch(`${API_BASE}/api/viral/cot-session/${sessionId}/drafts`);
    const draftsData = await draftsResponse.json();
    
    if (draftsData.error) {
      throw new Error('下書き取得エラー: ' + draftsData.error);
    }
    
    console.log(`✅ 下書き数: ${draftsData.totalDrafts}件\n`);
    
    // 下書きの内容を表示
    draftsData.drafts.forEach((draft, index) => {
      console.log(`--- 下書き ${index + 1} ---`);
      console.log(`タイトル: ${draft.title}`);
      console.log(`フック: ${draft.hook}`);
      console.log(`ハッシュタグ: ${draft.hashtags.join(', ')}`);
      console.log(`アングル: ${draft.angle}`);
      console.log('');
    });
    
    // 4. 下書き編集ページのURL
    console.log('📝 下書き編集ページ:');
    draftsData.drafts.forEach((draft, index) => {
      console.log(`下書き${index + 1}: ${API_BASE}/viral/drafts/${draft.id}`);
    });
    
    console.log('\n=== テスト完了 ===');
    
  } catch (error) {
    console.error('\n❌ エラー発生:', error.message);
    console.error(error);
  }
}

// 実行
testCoTFlow();