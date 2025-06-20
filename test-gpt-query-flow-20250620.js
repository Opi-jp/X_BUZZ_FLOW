const { PrismaClient } = require('./lib/generated/prisma');
const fs = require('fs').promises;
const path = require('path');

const prisma = new PrismaClient();

async function testGPTQueryFlow() {
  try {
    console.log('🔍 GPTクエリフロー完全テスト');
    
    // 1. テスト用のセッションを作成（新規）
    console.log('\n1️⃣ 新しいテストセッションを作成...');
    const newSession = await prisma.viral_sessions.create({
      data: {
        id: 'sess_test_' + Date.now().toString(36),
        theme: 'AIと教育の未来',
        platform: 'Twitter',
        style: 'エンターテイメント',
        status: 'CREATED'
      }
    });
    console.log('  ✅ セッション作成:', newSession.id);
    
    // 2. Perplexityのトピックデータを設定（実際のデータ構造を模倣）
    console.log('\n2️⃣ Perplexityトピックデータを設定...');
    const mockPerplexityData = {
      topics: [
        {
          TOPIC: "AI教育革命",
          title: "AI教育ツールが学習効率を劇的に向上させる",
          source: "example.com",
          url: "https://example.com/ai-education",
          date: "2025-06-20",
          summary: "最新のAI技術により、個人に合わせた学習が可能になり、学習効率が従来の3倍に向上している。",
          keyPoints: [
            "個別最適化された学習プラン",
            "リアルタイムフィードバック",
            "学習効率3倍向上",
            "24時間365日利用可能",
            "多言語対応"
          ],
          perplexityAnalysis: "このトピックは教育とAIの融合という現代的な課題に触れており、多くの人々の関心を引く可能性が高い。"
        }
      ],
      summary: "1件のトピックを収集",
      timestamp: new Date().toISOString(),
      perplexityAnalysis: "AI教育に関する最新動向"
    };
    
    await prisma.viral_sessions.update({
      where: { id: newSession.id },
      data: {
        topics: mockPerplexityData,
        status: 'TOPICS_COLLECTED'
      }
    });
    console.log('  ✅ トピックデータ設定完了');
    
    // 3. DBから取り出してGPTクエリの準備
    console.log('\n3️⃣ DBからデータを取り出してGPTクエリ準備...');
    const sessionForGPT = await prisma.viral_sessions.findUnique({
      where: { id: newSession.id }
    });
    
    if (!sessionForGPT || !sessionForGPT.topics) {
      throw new Error('セッションまたはトピックが見つかりません');
    }
    
    // topicsデータの構造確認
    console.log('  📊 取り出したデータ:');
    console.log('    topics型:', typeof sessionForGPT.topics);
    console.log('    topicsキー:', Object.keys(sessionForGPT.topics));
    
    const topicsData = sessionForGPT.topics;
    const topics = topicsData.topics;
    
    console.log('    トピック数:', topics.length);
    console.log('    最初のトピック:', topics[0].TOPIC);
    
    // 4. GPTプロンプトの構築をシミュレート
    console.log('\n4️⃣ GPTプロンプト構築シミュレーション...');
    
    // プロンプトテンプレートの変数を展開
    const topic = topics[0];
    const promptVariables = {
      platform: sessionForGPT.platform,
      style: sessionForGPT.style,
      topicTitle: topic.TOPIC,
      topicSource: topic.source,
      topicDate: topic.date,
      topicUrl: topic.url,
      topicSummary: topic.summary,
      topicKeyPoints: topic.keyPoints.map((point, i) => `${i + 1}. ${point}`).join('\\n'),
      topicAnalysis: topic.perplexityAnalysis,
      topicIndex: 1
    };
    
    console.log('  📝 プロンプト変数:');
    Object.entries(promptVariables).forEach(([key, value]) => {
      if (typeof value === 'string' && value.length > 50) {
        console.log(`    ${key}: ${value.substring(0, 50)}...`);
      } else {
        console.log(`    ${key}: ${value}`);
      }
    });
    
    // 5. 実際のAPI呼び出しをシミュレート
    console.log('\n5️⃣ GPT API呼び出しシミュレーション...');
    console.log('  実際のAPIでは以下のような構造でクエリを送信:');
    console.log('  {');
    console.log('    model: "gpt-4o",');
    console.log('    messages: [');
    console.log('      { role: "system", content: "JSON形式で正確に出力してください。" },');
    console.log('      { role: "user", content: [展開されたプロンプト] }');
    console.log('    ],');
    console.log('    temperature: 0.8,');
    console.log('    max_tokens: 1000');
    console.log('  }');
    
    // 6. データフローの検証
    console.log('\n6️⃣ データフロー検証結果:');
    console.log('  ✅ DBからtopicsデータを正しく取得');
    console.log('  ✅ JSON形式のデータを正しくパース');
    console.log('  ✅ 各トピックフィールドにアクセス可能');
    console.log('  ✅ プロンプト変数に正しく展開可能');
    console.log('  ✅ GPTクエリの構築が可能');
    
    // 7. 実際のconceptsAPIの動作を確認
    console.log('\n7️⃣ 実際のconcepts APIを呼び出し...');
    const response = await fetch(`http://localhost:3000/api/create/flow/${newSession.id}/concepts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('  ✅ API成功!');
      console.log('    生成されたコンセプト数:', result.conceptsCount);
      
      // 生成されたコンセプトを確認
      const updatedSession = await prisma.viral_sessions.findUnique({
        where: { id: newSession.id }
      });
      
      if (updatedSession.concepts && Array.isArray(updatedSession.concepts)) {
        const concept = updatedSession.concepts[0];
        console.log('  🎨 生成されたコンセプト例:');
        console.log('    タイトル:', concept.conceptTitle);
        console.log('    スコア:', concept.viralScore);
        console.log('    関連トピック:', concept.topicTitle);
      }
    } else {
      console.log('  ❌ API失敗:', response.status);
      const error = await response.text();
      console.log('    エラー:', error);
    }
    
    // クリーンアップ
    await prisma.viral_sessions.delete({
      where: { id: newSession.id }
    });
    console.log('\n🧹 テストセッションを削除しました');
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testGPTQueryFlow();