/**
 * Perplexity Error Test - AbortSignal.timeout issue
 */

require('dotenv').config({ path: '.env.local' })

// Test AbortSignal.timeout availability
console.log('Node.js version:', process.version)
console.log('AbortSignal available:', typeof AbortSignal !== 'undefined')
console.log('AbortSignal.timeout available:', typeof AbortSignal?.timeout === 'function')

// Import the problematic module
const { PerplexityClient } = require('./lib/perplexity')

async function testPerplexityError() {
  console.log('\n=== Perplexity API Error Test ===\n')
  
  try {
    // Create client
    console.log('Creating PerplexityClient...')
    const client = new PerplexityClient()
    console.log('✅ Client created successfully')
    
    // Test search
    console.log('\nTesting search with timeout...')
    const result = await client.searchWithContext({
      query: 'What is the latest news about AI?',
      searchRecency: 'day'
    })
    
    console.log('✅ Search completed successfully')
    console.log('Response length:', result.choices[0]?.message?.content?.length || 0)
    
  } catch (error) {
    console.error('\n❌ Error occurred:')
    console.error('Error type:', error.constructor.name)
    console.error('Error message:', error.message)
    console.error('Stack trace:', error.stack)
    
    if (error.message.includes('AbortSignal.timeout')) {
      console.error('\n⚠️  AbortSignal.timeout error detected!')
      console.error('This is likely due to Node.js version compatibility.')
      console.error('Solution: Use AbortController with setTimeout instead.')
    }
  }
}

// Alternative implementation test
async function testAlternativeImplementation() {
  console.log('\n=== Testing Alternative Timeout Implementation ===\n')
  
  try {
    // Create an AbortController with manual timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [
          { role: 'user', content: 'Test' }
        ]
      }),
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    console.log('✅ Alternative implementation works!')
    console.log('Status:', response.status)
    
  } catch (error) {
    console.error('Alternative implementation error:', error.message)
  }
}

// Run tests
testPerplexityError()
  .then(() => testAlternativeImplementation())
  .catch(console.error)