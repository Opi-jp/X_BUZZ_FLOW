const fs = require('fs');

async function checkSearchResults() {
  try {
    const response = await fetch('http://localhost:3000/api/viral/cot-session/c7cba53e-9f94-4136-bc70-adf9f457ed88');
    const data = await response.json();
    
    const searchResults = data.phases[0].executeResult.searchResults;
    
    console.log('\n=== Search Results Analysis ===');
    console.log('Total results:', searchResults.length);
    
    searchResults.forEach((result, index) => {
      console.log(`\n--- Result ${index + 1} ---`);
      console.log('Question:', result.question?.substring(0, 100) + '...');
      console.log('Has analysis:', !!result.analysis);
      console.log('Analysis length:', result.analysis?.length || 0);
      console.log('Has rawResponse:', !!result.rawResponse);
      console.log('rawResponse length:', result.rawResponse?.length || 0);
      console.log('Sources count:', result.sources?.length || 0);
      
      // Perplexityの応答がJSON形式で含まれているか確認
      if (result.analysis || result.rawResponse) {
        const content = result.analysis || result.rawResponse;
        const hasJsonBlock = content.includes('```json');
        const hasArticlesKey = content.includes('"articles"');
        const hasDetailKey = content.includes('"detail"');
        const hasSummaryKey = content.includes('"summary"');
        
        console.log('Contains JSON block:', hasJsonBlock);
        console.log('Has "articles" key:', hasArticlesKey);
        console.log('Has "detail" key:', hasDetailKey);
        console.log('Has "summary" key:', hasSummaryKey);
      }
    });
    
    // 最初の結果の詳細を出力
    if (searchResults[0]) {
      console.log('\n=== First Result Detail ===');
      fs.writeFileSync('first-result.txt', searchResults[0].analysis || searchResults[0].rawResponse || '');
      console.log('First result saved to first-result.txt');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkSearchResults();