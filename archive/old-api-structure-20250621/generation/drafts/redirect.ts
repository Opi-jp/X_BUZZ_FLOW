
import { NextRequest } from 'next/server'

// This endpoint has been moved to: /api/create/draft/list
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  url.pathname = '/api/create/draft/list'
  return Response.redirect(url.toString(), 301)
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url)
  url.pathname = '/api/create/draft/list'
  return Response.redirect(url.toString(), 301)
}

export async function PUT(request: NextRequest) {
  const url = new URL(request.url)
  url.pathname = '/api/create/draft/list'
  return Response.redirect(url.toString(), 301)
}

export async function DELETE(request: NextRequest) {
  const url = new URL(request.url)
  url.pathname = '/api/create/draft/list'
  return Response.redirect(url.toString(), 301)
}
