import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET: ジョブの状態を取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const job = await prisma.jobQueue.findUnique({
      where: { id }
    })

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // 実行時間を計算（新スキーマでは簡略化）
    let duration = null
    if (job.completedAt) {
      duration = Math.floor((job.completedAt.getTime() - job.createdAt.getTime()) / 1000)
    }

    return NextResponse.json({
      id: job.id,
      type: job.type,
      status: job.status,
      priority: job.priority,
      payload: job.payload,
      error: job.error,
      duration,
      createdAt: job.createdAt,
      completedAt: job.completedAt
    })
  } catch (error) {
    console.error('Error fetching job:', error)
    return NextResponse.json(
      { error: 'Failed to fetch job status' },
      { status: 500 }
    )
  }
}