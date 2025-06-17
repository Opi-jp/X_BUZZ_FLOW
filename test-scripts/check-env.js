require('dotenv').config({ path: '.env.local' })

console.log('ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? 
  process.env.ANTHROPIC_API_KEY.substring(0, 20) + '...' : 
  'Not found')

console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 
  process.env.OPENAI_API_KEY.substring(0, 20) + '...' : 
  'Not found')

console.log('DATABASE_URL:', process.env.DATABASE_URL ? 
  'Found' : 'Not found')