import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withErrorHandling, NotFoundError } from '@/lib/api/error-handler'

// ジョブステータス取得API
export const GET = withErrorHandling(async (request: Request, params: any) => {
  const jobId = params.id
  
  if (!jobId || jobId === 'undefined') {
    throw new NotFoundError('Job')
  }
  
  try {
    const job = await prisma.jobQueue.findUnique({
      where: { id: jobId }
    })
    
    if (!job) {
      throw new NotFoundError('Job', jobId)
    }
    
    // レスポンス形式を整形
    const response = {
      id: job.id,
      type: job.type,
      status: job.status,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      error: job.error
    }
    
    // 完了している場合は結果を含める
    if (job.status === 'completed' && job.payload) {
      response.result = job.payload
    }
    
    // 処理中の場合は進捗情報を含める
    if (job.status === 'pending' || job.status === 'processing') {
      response.progress = {
        attempts: job.attempts,
        maxAttempts: job.maxAttempts
      }
    }
    
    return response
    
  } catch (error) {
    console.error('Job status error:', error)
    throw error
  }
}, {
  requiredEnvVars: ['DATABASE_URL']
})