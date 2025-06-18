import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // モックデータを返す
    const mockScheduledPosts = [
      {
        id: '1',
        content: 'AIの進化が止まらない！最新のGPT-5は人間の創造性すら超えるかもしれない。でも、それって本当に良いことなの？🤔 #AI #未来',
        scheduledAt: new Date(Date.now() + 3600000).toISOString(), // 1時間後
        platform: 'Twitter',
        status: 'pending',
        draftId: 'draft-1'
      },
      {
        id: '2',
        content: 'リモートワークのメリット・デメリットを3年間経験した私が本音で語ります。結論：向き不向きがある！詳しくはスレッドで👇 #リモートワーク',
        scheduledAt: new Date(Date.now() + 7200000).toISOString(), // 2時間後
        platform: 'Twitter',
        status: 'pending',
        draftId: 'draft-2'
      },
      {
        id: '3',
        content: '【成功事例】生成AIを使って業務効率を3倍にした話。ポイントは「AIに丸投げしない」こと。人間とAIの最適な役割分担とは？ #生成AI #DX',
        scheduledAt: new Date(Date.now() - 3600000).toISOString(), // 1時間前
        platform: 'Twitter',
        status: 'published',
        draftId: 'draft-3'
      }
    ]

    return NextResponse.json({ 
      posts: mockScheduledPosts 
    })
  } catch (error) {
    console.error('Error fetching scheduled posts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch scheduled posts' },
      { status: 500 }
    )
  }
}