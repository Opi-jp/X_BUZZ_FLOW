import { NextResponse } from 'next/server'

// 旧APIから新APIへのリダイレクト
export async function GET(request: Request) {
  const url = new URL(request.url)
  const newUrl = new URL(url)
  newUrl.pathname = '/api/intelligence/news/latest'
  
  // 永続的なリダイレクト（301）を返す
  return NextResponse.redirect(newUrl, { status: 301 })
}