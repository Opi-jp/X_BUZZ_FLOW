require('dotenv').config({ path: '.env.local' })
const Anthropic = require('@anthropic-ai/sdk')

console.log('Using API Key:', process.env.ANTHROPIC_API_KEY?.substring(0, 30) + '...')

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

async function testSimple() {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: 'Say hello in Japanese'
        }
      ]
    })
    
    console.log('Success! Response:', response.content[0].text)
  } catch (error) {
    console.error('Error:', error.message)
    if (error.response) {
      console.error('Response:', error.response.data)
    }
  }
}

testSimple()