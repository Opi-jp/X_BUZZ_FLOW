import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PostType } from '@/lib/prisma'

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
          id: `sched_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          content: plan.suggestedContent,
          scheduled_time: new Date(plan.scheduledTime),
          post_type: convertPlanTypeToPostType(plan.type),
          ai_generated: true,
          ai_prompt: `Type: ${plan.type}, Theme: ${plan.theme || 'N/A'}, Reasoning: ${plan.reasoning}`,
          metadata: {
            planType: plan.type,
            priority: plan.priority,
            expectedEngagement: plan.expectedEngagement,
            targetPost: plan.targetPost,
            newsArticle: plan.newsArticle
          },
          updated_at: new Date()
        }
        
        // ref_post_idが必要な場合（quote_rt, comment_rt）
        if (plan.targetPost?.id) {
          // バズ投稿IDから参照を設定
          Object.assign(postData, { ref_post_id: plan.targetPost.id })
        }
        
        return await prisma.scheduled_posts.create({
          data: postData
        })
      })
    )
    
    return NextResponse.json({
      success: true,
      created: scheduledPosts.length,
      scheduledPosts: scheduledPosts.map(post => ({
        id: post.id,
        scheduled_time: post.scheduled_time,
        postType: post.post_type,
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
function convertPlanTypeToPostType(planType: string): PostType {
  const typeMap: Record<string, PostType> = {
    'quote_rt': PostType.QUOTE,
    'comment_rt': PostType.QUOTE, // コメント付きも引用RTとして扱う
    'original': PostType.NEW,
    'news_thread': PostType.NEW // ニューススレッドも新規投稿として扱う
  }
  
  return typeMap[planType] || PostType.NEW
}