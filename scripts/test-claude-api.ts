// Load environment variables manually
import { readFileSync } from 'fs'
import { join } from 'path'

// Read .env.local file
try {
  const envFile = readFileSync(join(process.cwd(), '.env.local'), 'utf8')
  envFile.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim()
    }
  })
} catch (error) {
  console.error('Failed to load .env.local:', error)
}

async function testClaudeAPI() {
  console.log('Testing Claude API...')
  console.log('API Key:', process.env.CLAUDE_API_KEY ? 'Set (length: ' + process.env.CLAUDE_API_KEY.length + ')' : 'Not set')

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: 'Say "Hello, API test successful!" in JSON format with a "message" field.',
          },
        ],
      }),
    })

    console.log('Response status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))

    const responseText = await response.text()
    console.log('Response body:', responseText)

    if (response.ok) {
      const data = JSON.parse(responseText)
      console.log('Success! Claude says:', data.content[0].text)
    } else {
      console.error('API Error:', responseText)
    }
  } catch (error) {
    console.error('Request failed:', error)
  }
}

testClaudeAPI()