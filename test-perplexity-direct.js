/**
 * Direct Perplexity API Test
 */

require('dotenv').config({ path: '.env.local' })

async function testPerplexityDirect() {
  console.log('=== Direct Perplexity API Test ===\n')
  console.log('API Key:', process.env.PERPLEXITY_API_KEY ? 'Set' : 'Not set')
  
  if (!process.env.PERPLEXITY_API_KEY) {
    console.error('PERPLEXITY_API_KEY is not set in .env.local')
    return
  }
  
  // Test with old method (AbortSignal.timeout)
  console.log('\n1. Testing with AbortSignal.timeout:')
  try {
    const response1 = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [
          { role: 'user', content: 'What is 2+2?' }
        ],
        temperature: 0.2,
        max_tokens: 100
      }),
      signal: AbortSignal.timeout(30000)
    })
    
    console.log('Status:', response1.status)
    const data1 = await response1.json()
    console.log('Response:', data1.choices?.[0]?.message?.content || 'No response')
  } catch (error) {
    console.error('Error with AbortSignal.timeout:', error.message)
  }
  
  // Test with new method (AbortController)
  console.log('\n2. Testing with AbortController:')
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)
    
    const response2 = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [
          { role: 'user', content: 'What is 3+3?' }
        ],
        temperature: 0.2,
        max_tokens: 100
      }),
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    console.log('Status:', response2.status)
    const data2 = await response2.json()
    console.log('Response:', data2.choices?.[0]?.message?.content || 'No response')
  } catch (error) {
    console.error('Error with AbortController:', error.message)
  }
  
  // Test Phase 1 Execute endpoint
  console.log('\n3. Testing Phase 1 Execute via API:')
  try {
    // First create a session
    const createRes = await fetch('http://localhost:3000/api/viral/cot-session/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        expertise: 'AI',
        style: 'Educational',
        platform: 'Twitter'
      })
    })
    
    if (!createRes.ok) {
      throw new Error('Failed to create session')
    }
    
    const { sessionId } = await createRes.json()
    console.log('Session created:', sessionId)
    
    // Run Phase 1 Think
    console.log('Running Phase 1 Think...')
    const thinkRes = await fetch(`http://localhost:3000/api/viral/cot-session/${sessionId}/process`, {
      method: 'POST'
    })
    
    if (!thinkRes.ok) {
      throw new Error('Phase 1 Think failed')
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Run Phase 1 Execute
    console.log('Running Phase 1 Execute...')
    const executeRes = await fetch(`http://localhost:3000/api/viral/cot-session/${sessionId}/process`, {
      method: 'POST'
    })
    
    console.log('Execute response status:', executeRes.status)
    const executeData = await executeRes.json()
    console.log('Execute success:', executeData.success)
    console.log('Current step:', executeData.step)
    console.log('Search results:', executeData.result?.searchResults?.length || 0)
    
  } catch (error) {
    console.error('API test error:', error.message)
  }
}

testPerplexityDirect().catch(console.error)