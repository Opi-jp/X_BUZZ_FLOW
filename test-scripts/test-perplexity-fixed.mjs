import { searchWithContext } from './lib/perplexity.js';

async function testPerplexity() {
  console.log('Testing Perplexity API with fixed timeout implementation...\n');
  
  try {
    const query = 'AIと働き方の最新トレンド 2025年';
    const context = 'バズるコンテンツ戦略家として、最新のニュースを調査しています。';
    
    console.log('Query:', query);
    console.log('Context:', context);
    console.log('\nSearching...\n');
    
    const result = await searchWithContext(query, context);
    
    console.log('✅ Success! Response received:');
    console.log('Length:', result.length);
    console.log('\nFirst 500 characters:');
    console.log(result.substring(0, 500) + '...\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testPerplexity();