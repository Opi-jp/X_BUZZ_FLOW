import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 選択した投稿計画をスケジュールに追加
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { plans } = body // PostPlan[]の配列
    
    if (!plans || !Array.isArray(plans) || plans.length === 0) {
      return NextResponse.json(
        { error: '投稿計画が指定されていません' },
        { status: 400 }
      )
    }
    
    // スケジュール投稿を作成
    const scheduledPosts = await Promise.all(
      plans.map(async (plan: any) => {
        const postData = {
          content: plan.suggestedContent,
          scheduledTime: new Date(plan.scheduledTime),
          postType: convertPlanTypeToPostType(plan.type),
          aiGenerated: true,
          aiPrompt: `Type: ${plan.type}, Theme: ${plan.theme || 'N/A'}, Reasoning: ${plan.reasoning}`,
          metadata: {
            planType: plan.type,
            priority: plan.priority,
            expectedEngagement: plan.expectedEngagement,
            targetPost: plan.targetPost,
            newsArticle: plan.newsArticle
          }
        }
        
        // refPostIdが必要な場合（quote_rt, comment_rt）
        if (plan.targetPost?.id) {
          // バズ投稿IDから参照を設定
          Object.assign(postData, { refPostId: plan.targetPost.id })
        }
        
        return await prisma.scheduledPost.create({
          data: postData
        })
      })
    )
    
    return NextResponse.json({
      success: true,
      created: scheduledPosts.length,
      scheduledPosts: scheduledPosts.map(post => ({
        id: post.id,
        scheduledTime: post.scheduledTime,
        postType: post.postType,
        content: post.content.substring(0, 50) + '...'
      }))
    })
    
  } catch (error) {
    console.error('Schedule creation error:', error)
    return NextResponse.json(
      { error: 'スケジュール作成でエラーが発生しました' },
      { status: 500 }
    )
  }
}

// 計画タイプを投稿タイプに変換
function convertPlanTypeToPostType(planType: string): string {
  const typeMap: Record<string, string> = {
    'quote_rt': 'QUOTE',
    'comment_rt': 'QUOTE', // コメント付きも引用RTとして扱う
    'original': 'NEW',
    'news_thread': 'NEW' // ニューススレッドも新規投稿として扱う
  }
  
  return typeMap[planType] || 'NEW'
}