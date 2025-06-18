require('dotenv').config({ path: '.env.local' })

console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL)
console.log('DIRECT_URL exists:', !!process.env.DIRECT_URL)

// 別の.envファイルも試す
require('dotenv').config({ path: '.env', override: true })

console.log('\nAfter loading .env:')
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL)
console.log('DIRECT_URL exists:', !!process.env.DIRECT_URL)

// 接続文字列の一部を表示（パスワードは隠す）
if (process.env.DATABASE_URL) {
  const url = process.env.DATABASE_URL
  const masked = url.replace(/:([^@]+)@/, ':****@')
  console.log('DATABASE_URL format:', masked.substring(0, 50) + '...')
}