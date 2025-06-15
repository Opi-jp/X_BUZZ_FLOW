# 本番デプロイメントガイド

## Vercelデプロイの考慮事項

### 1. 環境変数の設定
```bash
# Vercel環境に必要な環境変数
DATABASE_URL          # Supabase Pooler URL (アプリ用)
DIRECT_URL           # Supabase Direct URL (マイグレーション用)
OPENAI_API_KEY       # OpenAI API
PERPLEXITY_API_KEY   # Perplexity API
GOOGLE_API_KEY       # Google Custom Search
GOOGLE_SEARCH_ENGINE_ID # 検索エンジンID
TWITTER_CLIENT_ID    # Twitter OAuth2
TWITTER_CLIENT_SECRET # Twitter OAuth2
NEXTAUTH_URL         # https://your-domain.vercel.app
NEXTAUTH_SECRET      # ランダムな秘密鍵
CRON_SECRET          # Cronジョブ認証用
```

### 2. タイムアウト対策
```typescript
// vercel.json
{
  "functions": {
    // CoT処理は長時間かかるため
    "app/api/viral/cot-session/[sessionId]/process/route.ts": {
      "maxDuration": 300  // 5分（PROプラン）
    },
    // Cronジョブ
    "app/api/cron/process-cot-sessions/route.ts": {
      "maxDuration": 60
    },
    "app/api/cron/scheduled-posts/route.ts": {
      "maxDuration": 60
    }
  }
}
```

### 3. エッジランタイムの考慮
```typescript
// 長時間処理はNode.jsランタイムを使用
export const runtime = 'nodejs'  // デフォルト
// export const runtime = 'edge' // 使用しない
```

## Twitter自動投稿の実装

### 1. 投稿スケジューラー
```typescript
// app/api/cron/scheduled-posts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { TwitterApi } from 'twitter-api-v2'

export async function GET(request: NextRequest) {
  // Cron認証
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    // 投稿予定の下書きを取得
    const now = new Date()
    const drafts = await prisma.cotDraft.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: {
          lte: now
        }
      },
      include: {
        session: true
      }
    })
    
    console.log(`[CRON] Found ${drafts.length} drafts to post`)
    
    for (const draft of drafts) {
      try {
        // Twitter APIクライアントの作成
        const client = new TwitterApi({
          appKey: process.env.TWITTER_CLIENT_ID!,
          appSecret: process.env.TWITTER_CLIENT_SECRET!,
          // ユーザートークンはDBから取得する必要がある
          accessToken: await getUserAccessToken(draft.session.id),
          accessSecret: await getUserAccessSecret(draft.session.id),
        })
        
        // 投稿内容の準備
        const content = draft.editedContent || draft.content || ''
        
        // 投稿実行
        const tweet = await client.v2.tweet({
          text: content
        })
        
        // 成功したらDBを更新
        await prisma.cotDraft.update({
          where: { id: draft.id },
          data: {
            status: 'POSTED',
            postedAt: new Date(),
            postId: tweet.data.id
          }
        })
        
        console.log(`[CRON] Posted draft ${draft.id} as tweet ${tweet.data.id}`)
        
        // パフォーマンス追跡のスケジューリング
        await schedulePerformanceTracking(draft.id, tweet.data.id)
        
      } catch (error) {
        console.error(`[CRON] Failed to post draft ${draft.id}:`, error)
        
        // エラーをDBに記録
        await prisma.cotDraft.update({
          where: { id: draft.id },
          data: {
            status: 'FAILED'
          }
        })
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      processed: drafts.length 
    })
    
  } catch (error) {
    console.error('[CRON] Scheduled posts error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// パフォーマンス追跡のスケジューリング
async function schedulePerformanceTracking(draftId: string, postId: string) {
  // 30分後、1時間後、24時間後にメトリクス収集
  const trackingTimes = [
    { minutes: 30, field: '30m' },
    { minutes: 60, field: '1h' },
    { minutes: 1440, field: '24h' }
  ]
  
  for (const tracking of trackingTimes) {
    await prisma.jobQueue.create({
      data: {
        type: 'TRACK_PERFORMANCE',
        payload: {
          draftId,
          postId,
          field: tracking.field
        },
        runAt: new Date(Date.now() + tracking.minutes * 60 * 1000),
        priority: 1
      }
    })
  }
}
```

### 2. Vercel Cron設定
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/scheduled-posts",
      "schedule": "*/5 * * * *"  // 5分ごと
    },
    {
      "path": "/api/cron/process-cot-sessions",
      "schedule": "*/2 * * * *"  // 2分ごと（本番環境のみ）
    },
    {
      "path": "/api/cron/track-performance",
      "schedule": "*/10 * * * *"  // 10分ごと
    }
  ]
}
```

### 3. パフォーマンストラッキング（仮実装）
```typescript
// app/api/cron/track-performance/route.ts
export async function GET(request: NextRequest) {
  // 仮実装：ランダムなメトリクスを生成
  const jobs = await prisma.jobQueue.findMany({
    where: {
      type: 'TRACK_PERFORMANCE',
      status: 'pending',
      runAt: { lte: new Date() }
    }
  })
  
  for (const job of jobs) {
    const { draftId, field } = job.payload as any
    
    // 仮のメトリクス生成
    const metrics = {
      likes: Math.floor(Math.random() * 100),
      retweets: Math.floor(Math.random() * 50),
      replies: Math.floor(Math.random() * 20),
      impressions: Math.floor(Math.random() * 1000)
    }
    
    // パフォーマンスレコードを更新
    const updateData: any = {}
    updateData[`likes${field}`] = metrics.likes
    updateData[`retweets${field}`] = metrics.retweets
    updateData[`replies${field}`] = metrics.replies
    updateData[`impressions${field}`] = metrics.impressions
    
    await prisma.cotDraftPerformance.upsert({
      where: { draftId },
      update: updateData,
      create: {
        draftId,
        ...updateData
      }
    })
    
    // ジョブを完了にする
    await prisma.jobQueue.update({
      where: { id: job.id },
      data: {
        status: 'completed',
        completedAt: new Date()
      }
    })
  }
  
  return NextResponse.json({ success: true })
}
```

## デプロイチェックリスト

### 1. 事前準備
- [ ] 環境変数をVercelに設定
- [ ] `vercel.json`でタイムアウト設定
- [ ] Cronジョブの設定
- [ ] Twitter OAuth2の設定とコールバックURL登録

### 2. データベース
- [ ] Prismaマイグレーションの実行
- [ ] 初期データの投入（必要に応じて）
- [ ] バックアップの設定

### 3. セキュリティ
- [ ] CRON_SECRETの設定
- [ ] APIエンドポイントの認証確認
- [ ] Rate Limitingの実装（必要に応じて）

### 4. モニタリング
- [ ] Vercel Analyticsの有効化
- [ ] エラーログの設定（Sentry等）
- [ ] アラートの設定

### 5. テスト
- [ ] ローカルでのビルドテスト（`npm run build`）
- [ ] プレビューデプロイでの動作確認
- [ ] 本番デプロイ後の動作確認

## トラブルシューティング

### よくある問題
1. **タイムアウトエラー**
   - Vercel PROプランへのアップグレード
   - 処理の分割・非同期化

2. **環境変数エラー**
   - Vercelダッシュボードで確認
   - `vercel env pull`で同期

3. **Cronジョブが動かない**
   - CRON_SECRETの確認
   - Vercelログの確認

4. **Twitter API制限**
   - レート制限の確認
   - Kaito APIへの切り替え検討