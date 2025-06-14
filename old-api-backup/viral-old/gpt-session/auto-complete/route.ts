import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

interface StepResult {
  success: boolean
  data?: any
  error?: string
  duration?: number
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const body = await request.json()
    const { sessionId, skipSteps = [] } = body

    if (!sessionId) {
      return NextResponse.json(
        { error: 'セッションIDが必要です' },
        { status: 400 }
      )
    }

    const session = await prisma.gptAnalysis.findUnique({
      where: { id: sessionId }
    })

    if (!session) {
      return NextResponse.json(
        { error: 'セッションが見つかりません' },
        { status: 404 }
      )
    }

    console.log('=== Auto-Complete Chain of Thought ===')
    console.log('Session ID:', sessionId)
    console.log('Skip steps:', skipSteps)

    const results: Record<string, StepResult> = {}
    const startTime = Date.now()

    // Step 1: データ収集・初期分析（Web検索付き）
    if (!skipSteps.includes(1)) {
      console.log('\n🔍 Step 1: データ収集開始...')
      
      try {
        const step1Response = await fetch(
          `${process.env.NEXTAUTH_URL}/api/viral/gpt-session/${sessionId}/step1-responses-v2`,
          {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.INTERNAL_API_KEY || 'internal'}`
            }
          }
        )
        
        if (!step1Response.ok) {
          const errorText = await step1Response.text()
          throw new Error(`Step 1 failed: ${errorText}`)
        }
        
        results.step1 = {
          success: true,
          data: await step1Response.json(),
          duration: Date.now() - startTime
        }
        
        console.log(`✅ Step 1 完了: ${results.step1.data.response.opportunityCount}件の機会を発見`)
        console.log(`   記事数: ${results.step1.data.metrics.articlesFound}件`)
        console.log(`   URL付き: ${results.step1.data.metrics.articlesWithUrls}件`)
        
        // API rate limit対策
        await new Promise(resolve => setTimeout(resolve, 1500))
      } catch (error) {
        console.error('❌ Step 1 エラー:', error)
        results.step1 = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
        // Step 1が失敗したら続行不可
        throw new Error('Step 1の実行に失敗しました。Web検索機能を確認してください。')
      }
    }

    // Step 2: トレンド評価・角度分析
    if (!skipSteps.includes(2) && results.step1?.success) {
      console.log('\n📊 Step 2: トレンド評価開始...')
      
      try {
        const step2Response = await fetch(
          `${process.env.NEXTAUTH_URL}/api/viral/gpt-session/${sessionId}/step2`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          }
        )
        
        if (!step2Response.ok) {
          throw new Error(`Step 2 failed: ${await step2Response.text()}`)
        }
        
        results.step2 = {
          success: true,
          data: await step2Response.json()
        }
        
        console.log('✅ Step 2 完了: トップ機会を評価')
        
        await new Promise(resolve => setTimeout(resolve, 1500))
      } catch (error) {
        console.error('❌ Step 2 エラー:', error)
        results.step2 = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }

    // Step 3: コンテンツコンセプト作成
    if (!skipSteps.includes(3) && results.step2?.success) {
      console.log('\n💡 Step 3: コンテンツコンセプト作成...')
      
      try {
        const step3Response = await fetch(
          `${process.env.NEXTAUTH_URL}/api/viral/gpt-session/${sessionId}/step3`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          }
        )
        
        if (!step3Response.ok) {
          throw new Error(`Step 3 failed: ${await step3Response.text()}`)
        }
        
        results.step3 = {
          success: true,
          data: await step3Response.json()
        }
        
        console.log('✅ Step 3 完了: コンセプト作成完了')
        
        await new Promise(resolve => setTimeout(resolve, 1500))
      } catch (error) {
        console.error('❌ Step 3 エラー:', error)
        results.step3 = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }

    // Step 4: 完全なコンテンツ生成
    if (!skipSteps.includes(4) && results.step3?.success) {
      console.log('\n📝 Step 4: 完全なコンテンツ生成...')
      
      try {
        const step4Response = await fetch(
          `${process.env.NEXTAUTH_URL}/api/viral/gpt-session/${sessionId}/step4`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          }
        )
        
        if (!step4Response.ok) {
          throw new Error(`Step 4 failed: ${await step4Response.text()}`)
        }
        
        results.step4 = {
          success: true,
          data: await step4Response.json()
        }
        
        console.log('✅ Step 4 完了: 投稿可能なコンテンツ生成')
        
        await new Promise(resolve => setTimeout(resolve, 1500))
      } catch (error) {
        console.error('❌ Step 4 エラー:', error)
        results.step4 = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }

    // Step 5: 実行戦略
    if (!skipSteps.includes(5) && results.step4?.success) {
      console.log('\n🚀 Step 5: 実行戦略作成...')
      
      try {
        const step5Response = await fetch(
          `${process.env.NEXTAUTH_URL}/api/viral/gpt-session/${sessionId}/step5`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          }
        )
        
        if (!step5Response.ok) {
          throw new Error(`Step 5 failed: ${await step5Response.text()}`)
        }
        
        results.step5 = {
          success: true,
          data: await step5Response.json()
        }
        
        console.log('✅ Step 5 完了: 実行戦略作成完了')
      } catch (error) {
        console.error('❌ Step 5 エラー:', error)
        results.step5 = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }

    // 自動生成された下書きを作成
    let draftsCreated = 0
    if (results.step4?.success && results.step4.data.response?.concepts) {
      console.log('\n📄 下書き作成中...')
      
      try {
        for (const concept of results.step4.data.response.concepts) {
          await prisma.contentDraft.create({
            data: {
              analysisId: sessionId,
              conceptType: 'insight', // デフォルトタイプ
              category: concept.category || 'AI依存',
              title: concept.topic || `コンセプト ${draftsCreated + 1}`,
              content: concept.fullContent || concept.content || '',
              explanation: concept.explanation || 'バズる理由の説明',
              buzzFactors: concept.buzzFactors || ['トレンド性', '共感性'],
              targetAudience: concept.targetAudience || '一般層',
              estimatedEngagement: {
                likes: concept.estimatedLikes || 100,
                retweets: concept.estimatedRetweets || 50,
                comments: concept.estimatedComments || 20
              },
              hashtags: concept.hashtags || [],
              metadata: {
                viralScore: concept.viralScore,
                timing: concept.timing,
                visualDescription: concept.visualDescription,
                executionStrategy: results.step5?.data?.response
              }
            }
          })
          draftsCreated++
        }
        console.log(`✅ ${draftsCreated}件の下書きを作成しました`)
      } catch (error) {
        console.error('下書き作成エラー:', error)
      }
    }

    const totalDuration = Date.now() - startTime
    const successfulSteps = Object.values(results).filter(r => r.success).length

    // セッションのメタデータを更新
    await prisma.gptAnalysis.update({
      where: { id: sessionId },
      data: {
        metadata: {
          ...(session.metadata as any || {}),
          autoCompleted: true,
          autoCompletedAt: new Date().toISOString(),
          successfulSteps,
          totalDuration
        }
      }
    })

    console.log('\n=== Auto-Complete 完了 ===')
    console.log(`成功: ${successfulSteps}/5 ステップ`)
    console.log(`所要時間: ${(totalDuration / 1000).toFixed(1)}秒`)

    return NextResponse.json({
      success: successfulSteps === 5 - skipSteps.length,
      sessionId,
      message: `${successfulSteps}/${5 - skipSteps.length}ステップが完了しました`,
      summary: {
        totalDuration: `${(totalDuration / 1000).toFixed(1)}秒`,
        successfulSteps,
        step1: results.step1?.success ? {
          opportunityCount: results.step1.data.response.opportunityCount,
          articlesFound: results.step1.data.metrics.articlesFound
        } : { error: results.step1?.error },
        step2: results.step2?.success ? '評価完了' : { error: results.step2?.error },
        step3: results.step3?.success ? 'コンセプト作成完了' : { error: results.step3?.error },
        step4: results.step4?.success ? 'コンテンツ生成完了' : { error: results.step4?.error },
        step5: results.step5?.success ? '戦略作成完了' : { error: results.step5?.error }
      },
      draftsCreated,
      nextAction: draftsCreated > 0 ? {
        url: '/viral/drafts',
        message: '生成されたコンテンツの確認と編集'
      } : null
    })

  } catch (error) {
    console.error('Auto-complete error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : '自動実行中にエラーが発生しました',
        details: error
      },
      { status: 500 }
    )
  }
}