const { Client } = require('pg');

async function checkSession() {
  const client = new Client({
    connectionString: 'postgresql://postgres.atyvtqorzthnszyulquu:Yusuke0508@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres',
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('データベースに接続しました\n');

    const sessionId = '7f4a8808-c732-4ee5-b59e-4ab4677ead28';
    
    // セッション情報を確認
    const sessionResult = await client.query(
      'SELECT id, analysis_type, created_at FROM gpt_analyses WHERE id = $1',
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      console.log(`セッション ${sessionId} が見つかりません`);
      
      // すべてのセッションを表示
      const allSessions = await client.query(
        'SELECT id, analysis_type, created_at FROM gpt_analyses ORDER BY created_at DESC LIMIT 5'
      );
      
      console.log('\n最近のセッション:');
      allSessions.rows.forEach(row => {
        console.log(`- ${row.id} (${row.analysis_type}) - ${row.created_at}`);
      });
    } else {
      console.log('セッションが見つかりました:');
      console.log(sessionResult.rows[0]);
      
      // responseフィールドの構造を確認
      const responseResult = await client.query(
        'SELECT response FROM gpt_analyses WHERE id = $1',
        [sessionId]
      );
      
      const response = responseResult.rows[0].response;
      console.log('\nレスポンスの構造:');
      console.log('- step1:', response.step1 ? '存在する' : '存在しない');
      console.log('- step2:', response.step2 ? '存在する' : '存在しない');
      console.log('- step3:', response.step3 ? '存在する' : '存在しない');
      
      if (response.step2) {
        console.log('\nStep 2のデータ構造:');
        console.log('- opportunities:', Array.isArray(response.step2.opportunities) ? `${response.step2.opportunities.length}件` : '存在しない');
        console.log('- overall_assessment:', response.step2.overall_assessment ? '存在する' : '存在しない');
      }
    }

  } catch (error) {
    console.error('エラーが発生しました:', error);
  } finally {
    await client.end();
  }
}

checkSession();