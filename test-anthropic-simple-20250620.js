// Anthropic APIキーの確認と簡単なテスト
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

console.log('🔍 Anthropic API設定確認');
console.log('ANTHROPIC_API_KEY exists:', !!process.env.ANTHROPIC_API_KEY);
console.log('ANTHROPIC_API_KEY length:', process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.length : 0);
console.log('ANTHROPIC_API_KEY prefix:', process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.substring(0, 10) + '...' : 'Not set');

// Anthropic SDKのテスト
const Anthropic = require('@anthropic-ai/sdk');

async function testAnthropic() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('❌ ANTHROPIC_API_KEY is not set');
    return;
  }
  
  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    
    console.log('\n📝 Anthropic SDK test...');
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 100,
      temperature: 0.7,
      messages: [{
        role: 'user',
        content: 'Say "Hello" in Japanese.'
      }]
    });
    
    console.log('✅ Anthropic API response:', response.content[0].text);
  } catch (error) {
    console.error('❌ Anthropic API error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
    }
  }
}

testAnthropic();