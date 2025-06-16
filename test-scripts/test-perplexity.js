require('dotenv').config({ path: '.env.local' });

async function testPerplexity() {
  try {
    const { PerplexityClient } = require('./dist/lib/perplexity.js');
    console.log('Perplexity API Key:', process.env.PERPLEXITY_API_KEY ? 'Found' : 'Not found');
    
    const client = new PerplexityClient();
    const response = await client.searchWithContext({
      query: 'AI and remote work trends',
      searchRecency: 'week'
    });
    
    console.log('Success! Response length:', response.choices[0].message.content.length);
    console.log('Sample:', response.choices[0].message.content.substring(0, 200));
  } catch (error) {
    console.log('Error:', error.message);
  }
}

testPerplexity();