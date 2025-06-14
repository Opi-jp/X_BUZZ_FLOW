// Google検索API シンプルテスト
const https = require('https');

// 環境変数の確認
console.log('=== 環境変数チェック ===');
console.log('GOOGLE_API_KEY:', process.env.GOOGLE_API_KEY ? `設定済み (${process.env.GOOGLE_API_KEY.substring(0, 10)}...)` : '未設定');
console.log('GOOGLE_SEARCH_ENGINE_ID:', process.env.GOOGLE_SEARCH_ENGINE_ID || '未設定');

// APIキーとEngine IDを直接設定（.env.localから）
const API_KEY = process.env.GOOGLE_API_KEY || 'AIzaSyCfV7mgksl6eeoDQnD9Gwa_GwBe32_X7Zo';
const SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID || 'c54451bcd91c447bf';

async function testSearch() {
  const query = 'AI workplace 2025';
  const url = `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}&num=5`;
  
  console.log('\n=== Google Custom Search API テスト ===');
  console.log('クエリ:', query);
  console.log('URL:', url.replace(API_KEY, 'API_KEY_HIDDEN'));
  
  try {
    const response = await fetch(url);
    const data = await response.text();
    
    console.log('\nHTTPステータス:', response.status);
    console.log('ステータステキスト:', response.statusText);
    
    if (response.ok) {
      const json = JSON.parse(data);
      console.log('\n検索情報:');
      console.log('- 総結果数:', json.searchInformation?.totalResults);
      console.log('- 検索時間:', json.searchInformation?.searchTime);
      
      if (json.items && json.items.length > 0) {
        console.log(`\n検索結果 (${json.items.length}件):`);
        json.items.forEach((item, i) => {
          console.log(`\n${i + 1}. ${item.title}`);
          console.log(`   URL: ${item.link}`);
          console.log(`   説明: ${item.snippet?.substring(0, 100)}...`);
        });
      } else {
        console.log('\n検索結果が見つかりませんでした');
      }
    } else {
      console.error('\nエラーレスポンス:', data);
    }
  } catch (error) {
    console.error('\nリクエストエラー:', error);
  }
}

// 実行
testSearch();