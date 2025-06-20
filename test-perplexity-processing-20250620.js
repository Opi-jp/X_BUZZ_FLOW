const { PrismaClient } = require('./lib/generated/prisma');
const { PerplexityResponseParser } = require('./lib/parsers/perplexity-response-parser');

const prisma = new PrismaClient();

async function testPerplexityProcessing() {
  try {
    console.log('🔍 Perplexity出力処理テスト');
    
    // 1. 最新のセッションを取得
    const session = await prisma.viral_sessions.findFirst({
      where: { 
        status: 'CONCEPTS_GENERATED',
        topics: { not: null }
      },
      orderBy: { created_at: 'desc' }
    });
    
    if (!session) {
      console.log('❌ 適切なセッションが見つかりません');
      return;
    }
    
    console.log('\n📋 セッション情報:');
    console.log('  ID:', session.id);
    console.log('  テーマ:', session.theme);
    console.log('  ステータス:', session.status);
    
    // 2. topicsフィールドの内容を確認
    console.log('\n📝 Topics フィールドの構造:');
    console.log('  型:', typeof session.topics);
    console.log('  Nullチェック:', session.topics !== null);
    
    if (session.topics && typeof session.topics === 'object') {
      console.log('  キー:', Object.keys(session.topics));
      
      // topicsの中身を詳しく見る
      const topicsData = session.topics;
      
      if (topicsData.topics && Array.isArray(topicsData.topics)) {
        console.log('\n✅ topics配列が正しく存在:');
        console.log('  トピック数:', topicsData.topics.length);
        
        // 各トピックの詳細
        topicsData.topics.forEach((topic, index) => {
          console.log(`\n  📌 トピック${index + 1}:`);
          console.log('    TOPIC:', topic.TOPIC);
          console.log('    title:', topic.title);
          console.log('    source:', topic.source);
          console.log('    url:', topic.url);
          console.log('    date:', topic.date);
          console.log('    summary:', topic.summary ? topic.summary.substring(0, 100) + '...' : '(なし)');
          console.log('    keyPoints数:', topic.keyPoints ? topic.keyPoints.length : 0);
          console.log('    perplexityAnalysis:', !!topic.perplexityAnalysis);
        });
      } else {
        console.log('❌ topics配列が見つかりません');
      }
      
      // その他のフィールド
      console.log('\n📊 その他のフィールド:');
      console.log('  summary:', topicsData.summary);
      console.log('  timestamp:', topicsData.timestamp);
      console.log('  perplexityAnalysis長さ:', topicsData.perplexityAnalysis ? topicsData.perplexityAnalysis.length : 0);
    }
    
    // 3. conceptsフィールドも確認
    if (session.concepts) {
      console.log('\n🎯 Concepts フィールドの確認:');
      console.log('  型:', typeof session.concepts);
      console.log('  配列？:', Array.isArray(session.concepts));
      
      if (Array.isArray(session.concepts)) {
        console.log('  コンセプト数:', session.concepts.length);
        
        // 最初のコンセプトの構造を確認
        if (session.concepts.length > 0) {
          const firstConcept = session.concepts[0];
          console.log('\n  🎨 最初のコンセプトの構造:');
          console.log('    キー:', Object.keys(firstConcept));
          console.log('    conceptId:', firstConcept.conceptId);
          console.log('    conceptTitle:', firstConcept.conceptTitle);
          console.log('    format:', firstConcept.format);
          console.log('    viralScore:', firstConcept.viralScore);
          console.log('    topicTitle:', firstConcept.topicTitle);
          console.log('    topicUrl:', firstConcept.topicUrl);
        }
      }
    }
    
    // 4. Perplexityパーサーのテスト
    console.log('\n🔧 Perplexityパーサーの動作確認:');
    
    // 生のPerplexity応答を再現
    if (session.topics && session.topics.perplexityAnalysis) {
      try {
        const rawResponse = session.topics.perplexityAnalysis;
        console.log('  生データ長さ:', rawResponse.length);
        console.log('  生データの最初の100文字:', rawResponse.substring(0, 100));
        
        // パーサーでパース
        const parsed = PerplexityResponseParser.parseTopics(rawResponse);
        console.log('\n  ✅ パーサー結果:');
        console.log('    パース成功:', !!parsed);
        console.log('    トピック数:', parsed ? parsed.length : 0);
      } catch (error) {
        console.log('  ❌ パーサーエラー:', error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPerplexityProcessing();