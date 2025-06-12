import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      config = {}
    } = body
    
    const {
      expertise = 'AI × 働き方、25年のクリエイティブ経験',
      platform = 'Twitter',
      style = '解説 × エンタメ',
      model = 'gpt-4o'
    } = config

    // 新しい分析セッションを作成
    const session = await prisma.gptAnalysis.create({
      data: {
        analysisType: 'comprehensive',
        prompt: JSON.stringify({
          expertise,
          platform,
          style,
          createdAt: new Date().toISOString()
        }),
        response: {},
        metadata: {
          config: {
            expertise,
            platform,
            style,
            model
          },
          currentStep: 0,
          completed: false
        }
      }
    })

    // 初期設定をViralConfigに保存（ユーザーごとの設定として）
    await prisma.viralConfig.upsert({
      where: { key: 'gpt_session_default' },
      update: {
        value: {
          expertise,
          platform,
          style,
          lastUsed: new Date().toISOString()
        }
      },
      create: {
        key: 'gpt_session_default',
        value: {
          expertise,
          platform,
          style,
          lastUsed: new Date().toISOString()
        },
        description: 'GPT分析のデフォルト設定'
      }
    })

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      config: {
        expertise,
        platform,
        style,
        model
      },
      nextStep: {
        step: 1,
        url: `/api/viral/gpt-session/${session.id}/step1`,
        description: 'データ収集・初期分析'
      }
    })

  } catch (error) {
    console.error('GPT session creation error:', error)
    
    return NextResponse.json(
      { error: 'セッション作成でエラーが発生しました' },
      { status: 500 }
    )
  }
}