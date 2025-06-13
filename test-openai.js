require('dotenv').config({ path: '.env.local' });
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testOpenAI() {
  try {
    console.log('Testing OpenAI API...');
    
    // Test 1: Simple chat completion
    const chatResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Say hello' }],
      max_tokens: 10
    });
    console.log('Chat API works:', chatResponse.choices[0].message.content);
    
    // Test 2: Responses API
    console.log('\nTesting Responses API with web_search...');
    const responseAPI = await openai.responses.create({
      model: 'gpt-4o',
      input: 'Search for latest AI news',
      tools: [{ type: 'web_search' }],
      instructions: 'Use web_search to find one recent AI news article and return the URL.'
    });
    console.log('Responses API result:', JSON.stringify(responseAPI, null, 2).substring(0, 500));
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testOpenAI();