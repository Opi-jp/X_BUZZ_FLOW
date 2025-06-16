require('dotenv').config({ path: '.env.local' })

console.log('環境変数チェック:')
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '設定済み' : '未設定')
console.log('PERPLEXITY_API_KEY:', process.env.PERPLEXITY_API_KEY ? '設定済み' : '未設定')
console.log('GOOGLE_API_KEY:', process.env.GOOGLE_API_KEY ? '設定済み' : '未設定')
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '設定済み' : '未設定')