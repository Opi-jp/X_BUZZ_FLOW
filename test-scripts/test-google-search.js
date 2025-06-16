// Google検索APIの単体テスト
import { GoogleSearchClient } from './lib/google-search.js'

async function testGoogleSearch() {
  console.log('=== Google検索API テスト ===');
  
  // 環境変数の確認
  console.log('\n環境変数チェック:');
  console.log('GOOGLE_API_KEY:', process.env.GOOGLE_API_KEY ? '設定済み' : '未設定');
  console.log('GOOGLE_SEARCH_ENGINE_ID:', process.env.GOOGLE_SEARCH_ENGINE_ID ? '設定済み' : '未設定');
  
  const client = new GoogleSearchClient();
  
  // テストクエリ
  const queries = [
    'AI workplace 2025',
    'AIと働き方 最新ニュース',
    'artificial intelligence job automation'
  ];
  
  for (const query of queries) {
    console.log(`\n\n=== 検索: "${query}" ===`);
    
    try {
      const results = await client.searchNews(query, 7);
      
      console.log(`結果数: ${results.length}`);
      
      if (results.length > 0) {
        console.log('\n最初の3件:');
        results.slice(0, 3).forEach((result, i) => {
          console.log(`\n${i + 1}. ${result.title}`);
          console.log(`   URL: ${result.link}`);
          console.log(`   スニペット: ${result.snippet}`);
          console.log(`   ソース: ${result.displayLink}`);
        });
      } else {
        console.log('検索結果が0件です');
      }
    } catch (error) {
      console.error('検索エラー:', error);
    }
  }
  
  // 詳細なAPIテスト
  console.log('\n\n=== 詳細なAPIテスト ===');
  try {
    const apiKey = process.env.GOOGLE_API_KEY || '';
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID || '';
    
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=test&num=1`;
    console.log('API URL (キーは部分表示):', url.replace(apiKey, 'YOUR_API_KEY'));
    
    const response = await fetch(url);
    console.log('HTTPステータス:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('エラーレスポンス:', errorText);
    } else {
      const data = await response.json();
      console.log('成功レスポンス:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('詳細テストエラー:', error);
  }
}

// 実行
testGoogleSearch().catch(console.error);