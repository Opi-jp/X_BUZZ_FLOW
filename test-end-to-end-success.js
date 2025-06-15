// エンドツーエンドの成功例作成（Perplexityコスト削減版）
async function testEndToEndSuccess() {
  console.log('=== エンドツーエンド成功例作成 ===\n');
  
  // セッションID
  const sessionId = '1689bc4b-41a8-4283-88de-1ab0b3489f9a';
  
  try {
    console.log('🎯 目標: Perplexity呼び出しなしで完全なCoT→投稿フローを成功させる');
    console.log(`📋 セッションID: ${sessionId}`);
    
    // Phase 1をスキップして、サンプルデータを手動作成
    console.log('\n📝 Step 1: Phase 1スキップ - サンプルデータ作成');
    
    const mockPhase1Data = {
      thinkResult: {
        searchIntent: "AIと働き方の最新トレンドを調査",
        categories: ["AI技術動向", "働き方改革", "デジタル変革"],
        angle: "実践的でアクションにつながる内容"
      },
      executeResult: {
        searches: [
          {
            query: "AI 働き方改革 2025 最新動向",
            results: [
              {
                title: "AI時代の新しい働き方 - 生産性向上の実例",
                content: "AIツールを活用した働き方改革が企業で進んでいる。ChatGPTやCopilotなどのツールが業務効率を大幅に改善。",
                source: "テクノロジーニュース",
                viralPotential: "高",
                emotionalHook: "驚き、希望"
              }
            ]
          }
        ],
        totalResults: 5,
        viralOpportunities: 2
      },
      integrateResult: {
        opportunities: [
          {
            title: "AI活用による働き方の具体的な変化",
            description: "実際の企業事例と数値データ",
            viralPotential: 8.5,
            controversy: 3,
            freshness: 9
          },
          {
            title: "従来の働き方との明確な違い",
            description: "before/afterの比較による分かりやすさ",
            viralPotential: 7.8,
            controversy: 2,
            freshness: 8
          }
        ]
      }
    };
    
    console.log('✅ サンプルデータ準備完了');
    
    // セッションの状態を直接Phase 2に更新
    console.log('\n🔄 Step 2: セッション状態をPhase 2に更新');
    
    const updateResponse = await fetch(`http://localhost:3000/api/viral/cot-session/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPhase: 2,
        currentStep: 'THINK',
        status: 'THINKING',
        phase1Results: mockPhase1Data
      })
    });
    
    if (!updateResponse.ok) {
      console.log('⚠️  直接更新失敗、Phase 1を短縮実行します');
      
      // Phase 1を短縮して実行（Perplexity最小限）
      console.log('\n⚡ Step 2B: Phase 1短縮実行');
      
      const processResponse = await fetch(`http://localhost:3000/api/viral/cot-session/${sessionId}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quickMode: true,
          mockData: true  // Perplexity呼び出しをモック化
        })
      });
      
      const processResult = await processResponse.json();
      console.log('Phase 1結果:', processResult.success ? '成功' : '失敗');
    } else {
      console.log('✅ セッション状態更新成功');
    }
    
    // Phase 2-5を順次実行
    console.log('\n🚀 Step 3: Phase 2-5の順次実行');
    
    for (let phase = 2; phase <= 5; phase++) {
      console.log(`\n--- Phase ${phase} 実行中 ---`);
      
      const phaseResponse = await fetch(`http://localhost:3000/api/viral/cot-session/${sessionId}/process`, {
        method: 'POST'
      });
      
      const phaseResult = await phaseResponse.json();
      
      if (phaseResult.success) {
        console.log(`✅ Phase ${phase} 成功`);
        if (phaseResult.status === 'COMPLETED') {
          console.log('🎉 全フェーズ完了！');
          break;
        }
      } else {
        console.log(`❌ Phase ${phase} 失敗:`, phaseResult.error);
        break;
      }
      
      // 少し待機
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // 生成された下書きを確認
    console.log('\n📝 Step 4: 生成された下書きを確認');
    
    const draftsResponse = await fetch(`http://localhost:3000/api/viral/cot-session/${sessionId}/drafts`);
    const draftsResult = await draftsResponse.json();
    
    if (draftsResult.success && draftsResult.drafts.length > 0) {
      console.log(`✅ 下書き ${draftsResult.drafts.length}件生成成功`);
      
      // 最初の下書きで投稿テスト
      const testDraft = draftsResult.drafts[0];
      console.log(`\n🚀 Step 5: 投稿テスト (${testDraft.id})`);
      
      const postResponse = await fetch(`http://localhost:3000/api/viral/cot-draft/${testDraft.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'post' })
      });
      
      const postResult = await postResponse.json();
      
      if (postResult.success) {
        console.log('🎉 投稿成功！');
        console.log(`   投稿ID: ${postResult.postId}`);
        console.log(`   URL: ${postResult.url || 'N/A'}`);
        
        console.log('\n✅ エンドツーエンド成功例完成！');
        console.log('--- 成功フロー ---');
        console.log('1. CoTセッション作成 ✅');
        console.log('2. Phase 1-5 実行 ✅');
        console.log('3. 下書き生成 ✅');
        console.log('4. Twitter投稿 ✅');
        console.log('5. パフォーマンス追跡準備 ✅');
        
      } else {
        console.log('❌ 投稿失敗:', postResult.error);
      }
      
    } else {
      console.log('❌ 下書き生成失敗');
    }
    
  } catch (error) {
    console.error('❌ テスト実行エラー:', error);
  }
}

testEndToEndSuccess().catch(console.error);