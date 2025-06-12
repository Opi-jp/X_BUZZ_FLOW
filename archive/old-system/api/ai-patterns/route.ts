import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET: AIパターン一覧取得
export async function GET() {
  try {
    const patterns = await prisma.aiPattern.findMany({
      orderBy: { successRate: 'desc' },
    })

    return NextResponse.json(patterns)
  } catch (error) {
    console.error('Error fetching AI patterns:', error)
    return NextResponse.json(
      { error: 'Failed to fetch AI patterns' },
      { status: 500 }
    )
  }
}

// POST: AIパターン作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, promptTemplate, exampleOutput } = body

    const pattern = await prisma.aiPattern.create({
      data: {
        name,
        description,
        promptTemplate,
        exampleOutput,
      },
    })

    return NextResponse.json(pattern, { status: 201 })
  } catch (error) {
    console.error('Error creating AI pattern:', error)
    return NextResponse.json(
      { error: 'Failed to create AI pattern' },
      { status: 500 }
    )
  }
}