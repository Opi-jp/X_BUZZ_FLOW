const { Client } = require('pg');

async function testContentDraft() {
  const client = new Client({
    connectionString: 'postgresql://postgres.atyvtqorzthnszyulquu:Yusuke0508@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres',
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('データベースに接続しました\n');

    // テスト用のレコードを作成
    const testData = {
      analysisId: '7f4a8808-c732-4ee5-b59e-4ab4677ead28',
      conceptType: 'single',
      category: 'テスト',
      title: 'テストタイトル',
      content: 'テストコンテンツ',
      explanation: 'テスト説明',
      buzzFactors: JSON.stringify(['要因1', '要因2', '要因3']), // JSON文字列として保存
      targetAudience: '一般',
      estimatedEngagement: JSON.stringify({ likes: 100, retweets: 50 }),
      hashtags: JSON.stringify(['#test', '#AI'])
    };

    const query = `
      INSERT INTO content_drafts (
        analysis_id, concept_type, category, title, content, 
        explanation, buzz_factors, target_audience, estimated_engagement, hashtags
      ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9::jsonb, $10::jsonb)
      RETURNING id
    `;

    const values = [
      testData.analysisId,
      testData.conceptType,
      testData.category,
      testData.title,
      testData.content,
      testData.explanation,
      testData.buzzFactors,
      testData.targetAudience,
      testData.estimatedEngagement,
      testData.hashtags
    ];

    const result = await client.query(query, values);
    console.log('テストレコード作成成功:', result.rows[0].id);

    // 作成したレコードを確認
    const checkResult = await client.query(
      'SELECT * FROM content_drafts WHERE id = $1',
      [result.rows[0].id]
    );

    console.log('\n作成されたレコード:');
    console.log('buzz_factors:', checkResult.rows[0].buzz_factors);
    console.log('hashtags:', checkResult.rows[0].hashtags);

  } catch (error) {
    console.error('エラーが発生しました:', error.message);
  } finally {
    await client.end();
  }
}

testContentDraft();