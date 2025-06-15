import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function GET() {
  const secret = process.env.NEXTAUTH_SECRET
  
  if (!secret) {
    return NextResponse.json({
      error: 'NEXTAUTH_SECRET is not set',
      hasSecret: false,
    }, { status: 500 })
  }
  
  // セキュリティのため、実際のシークレットは表示しない
  const secretHash = crypto.createHash('sha256').update(secret).digest('hex')
  
  return NextResponse.json({
    hasSecret: true,
    secretLength: secret.length,
    secretHash: secretHash.substring(0, 10) + '...',
    expectedLength: 32, // 適切な長さ
    isValidLength: secret.length >= 32,
    environment: process.env.NODE_ENV,
  })
}