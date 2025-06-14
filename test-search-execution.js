// Step 2: 生成されたクエリでGoogle検索を実行
const fs = require('fs').promises;

// Google Custom Search API設定
const API_KEY = 'AIzaSyCfV7mgksl6eeoDQnD9Gwa_GwBe32_X7Zo';
const SEARCH_ENGINE_ID = 'c54451bcd91c447bf';

async function executeSearches() {
  console.log('=== Google検索実行テスト ===\n');
  
  try {
    // 生成されたクエリを読み込み
    const queriesData = await fs.readFile('generated-queries.json', 'utf-8');
    const { queries } = JSON.parse(queriesData);
    
    console.log(`読み込んだクエリ数: ${queries.length}`);
    
    const allSearchResults = [];
    
    // 各クエリで検索実行
    for (const queryObj of queries) {
      console.log(`\n\n=== カテゴリ ${queryObj.category}: ${queryObj.topic} ===`);
      console.log(`検索クエリ: ${queryObj.query}`);
      
      const url = `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(queryObj.query)}&num=10&dateRestrict=d7`;
      
      try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
          console.log(`\n検索結果: ${data.items.length}件`);
          
          // 最初の3件を表示
          data.items.slice(0, 3).forEach((item, i) => {
            console.log(`\n${i + 1}. ${item.title}`);
            console.log(`   ${item.snippet?.substring(0, 100)}...`);
            console.log(`   URL: ${item.link}`);
          });
          
          // DB保存用のデータを準備
          data.items.forEach((item, index) => {
            allSearchResults.push({
              query: queryObj.query,
              queryJa: queryObj.queryJa,
              category: queryObj.category,
              title: item.title,
              url: item.link,
              snippet: item.snippet || '',
              source: item.displayLink,
              position: index + 1,
              searchedAt: new Date().toISOString()
            });
          });
        } else {
          console.log('検索結果が見つかりませんでした');
        }
      } catch (error) {
        console.error(`検索エラー: ${error.message}`);
      }
    }
    
    // 検索結果をファイルに保存
    await fs.writeFile(
      'search-results.json',
      JSON.stringify({
        totalResults: allSearchResults.length,
        searchedAt: new Date().toISOString(),
        results: allSearchResults
      }, null, 2)
    );
    
    console.log(`\n\n=== 検索完了 ===`);
    console.log(`総検索結果数: ${allSearchResults.length}件`);
    console.log('✅ 検索結果を search-results.json に保存しました');
    
    // カテゴリ別の集計
    const categoryCounts = {};
    allSearchResults.forEach(r => {
      categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1;
    });
    
    console.log('\nカテゴリ別件数:');
    Object.entries(categoryCounts).forEach(([cat, count]) => {
      console.log(`  カテゴリ ${cat}: ${count}件`);
    });
    
  } catch (error) {
    console.error('エラー:', error);
  }
}

executeSearches();