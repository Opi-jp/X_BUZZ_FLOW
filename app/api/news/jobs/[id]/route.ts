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

    // 実行時間を計算
    let duration = null
    if (job.startedAt) {
      const endTime = job.endedAt || new Date()
      duration = Math.floor((endTime.getTime() - job.startedAt.getTime()) / 1000)
    }

    return NextResponse.json({
      id: job.id,
      type: job.type,
      status: job.status,
      progress: job.progress,
      total: job.total,
      result: job.result,
      error: job.error,
      duration,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      endedAt: job.endedAt
    })
  } catch (error) {
    console.error('Error fetching job:', error)
    return NextResponse.json(
      { error: 'Failed to fetch job status' },
      { status: 500 }
    )
  }
}