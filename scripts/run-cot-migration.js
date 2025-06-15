// CoTマイグレーション実行スクリプト
const API_URL = 'https://x-buzz-flow.vercel.app/api/db/migrate-cot';

async function runMigration() {
  console.log('🚀 CoTテーブルのマイグレーションを開始します...');
  console.log('📡 API URL:', API_URL);
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ マイグレーション成功!');
      console.log('📊 作成されたテーブル:', result.tables?.map(t => t.table_name).join(', '));
      console.log('📋 詳細:', JSON.stringify(result.details, null, 2));
    } else {
      console.error('❌ マイグレーションエラー:');
      console.error('エラー:', result.error);
      console.error('詳細:', result.detail);
      console.error('ヒント:', result.hint);
    }
  } catch (error) {
    console.error('❌ 実行エラー:', error.message);
  }
}

console.log('⏳ Vercelのデプロイが完了するのを待ってから実行してください。');
console.log('💡 デプロイ状況: https://vercel.com/opi-jps-projects/x-buzz-flow');
console.log('\n準備ができたらEnterキーを押してください...');

// 標準入力を待つ
process.stdin.once('data', () => {
  runMigration();
});