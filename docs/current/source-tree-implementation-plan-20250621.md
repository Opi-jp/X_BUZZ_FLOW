# 出典ツリー機能実装計画

## 概要
バイラル投稿に対して、必ず出典情報をツリー形式で追加する機能を実装する。

### 要件
- **シングル投稿**: メイン投稿 + 出典投稿（計2投稿）
- **スレッド投稿**: 5つのメイン投稿 + 1つの出典投稿（計6投稿）
- 出典にはPerplexityで収集した情報源のURLを含める

## 現在のシステム構造

### 投稿フォーマット（viral_drafts_v2.content）
```json
{
  "format": "thread" | "single",
  "posts": ["投稿1", "投稿2", "投稿3", "投稿4", "投稿5"]
}
```

### セッションデータ（viral_sessions.topics）
```json
{
  "topics": [
    {
      "title": "タイトル",
      "url": "https://example.com/article",
      "summary": "要約"
    }
  ]
}
```

## 実装方針

### Option A: 投稿時に動的生成（推奨）
**メリット**:
- 既存のコンテンツ生成フローを変更不要
- 出典フォーマットを柔軟に変更可能
- DBスキーマ変更不要

**実装場所**: `/api/publish/post/now`

### Option B: コンテンツ生成時に含める
**メリット**:
- 事前に全投稿内容を確認可能
- Claudeが出典を考慮した投稿を生成可能

**デメリット**:
- プロンプト変更が必要
- 既存コンテンツの再生成が必要

## 詳細実装計画（Option A）

### Phase 1: 出典情報の取得と整形

#### 1.1 出典データ取得関数
```typescript
// /lib/twitter/source-formatter.ts
interface SourceInfo {
  title: string
  url: string
  domain: string
}

export async function getSourcesFromSession(
  sessionId: string
): Promise<SourceInfo[]> {
  const session = await prisma.viral_sessions.findUnique({
    where: { id: sessionId },
    select: { topics: true }
  })
  
  if (!session?.topics) return []
  
  // Perplexityのtopicsから出典を抽出
  const topics = typeof session.topics === 'string' 
    ? JSON.parse(session.topics) 
    : session.topics
    
  return extractSourcesFromTopics(topics)
}

function extractSourcesFromTopics(topics: any): SourceInfo[] {
  // URLを含む情報を抽出
  const sources: SourceInfo[] = []
  
  // topicsの構造に応じて解析
  // 例: Markdown内のリンクを抽出
  const urlRegex = /\[([^\]]+)\]\(([^)]+)\)/g
  // または構造化データから直接取得
  
  return sources.slice(0, 3) // 最大3つの出典
}
```

#### 1.2 出典投稿フォーマット
```typescript
export function formatSourceTweet(
  sources: SourceInfo[],
  originalTweetId: string
): string {
  const header = "📚 参考情報・出典:\n\n"
  
  const sourceList = sources.map((source, index) => 
    `${index + 1}. ${source.title}\n${source.url}`
  ).join('\n\n')
  
  const footer = "\n\n💡 最新情報はPerplexity AIで収集・分析しています"
  
  return header + sourceList + footer
}
```

### Phase 2: Twitter API連携

#### 2.1 スレッド投稿機能の実装
```typescript
// /lib/twitter/thread-poster.ts
export async function postThread(
  tweets: string[],
  draftId?: string
): Promise<ThreadResult> {
  const client = getTwitterClient()
  const tweetIds: string[] = []
  
  // 最初の投稿
  const firstTweet = await client.readWrite.v2.tweet(tweets[0])
  tweetIds.push(firstTweet.data.id)
  
  // 返信として続きを投稿
  for (let i = 1; i < tweets.length; i++) {
    const reply = await client.readWrite.v2.tweet({
      text: tweets[i],
      reply: {
        in_reply_to_tweet_id: tweetIds[tweetIds.length - 1]
      }
    })
    tweetIds.push(reply.data.id)
    
    // レート制限対策
    await delay(1000)
  }
  
  return {
    threadId: tweetIds[0],
    tweetIds,
    url: `https://twitter.com/user/status/${tweetIds[0]}`
  }
}
```

#### 2.2 /api/publish/post/now の改修
```typescript
// 既存の単一投稿処理を拡張
export async function POST(request: Request) {
  try {
    const { text, draftId, includeSource = true } = await request.json()
    
    // 下書き情報を取得
    const draft = await prisma.viral_drafts_v2.findUnique({
      where: { id: draftId },
      include: { viral_sessions: true }
    })
    
    if (!draft) throw new Error('Draft not found')
    
    const content = JSON.parse(draft.content)
    const tweets: string[] = []
    
    // メイン投稿の準備
    if (content.format === 'thread') {
      tweets.push(...content.posts)
    } else {
      tweets.push(text)
    }
    
    // 出典投稿の追加
    if (includeSource && draft.session_id) {
      const sources = await getSourcesFromSession(draft.session_id)
      if (sources.length > 0) {
        const sourceTweet = formatSourceTweet(sources, '')
        tweets.push(sourceTweet)
      }
    }
    
    // スレッドとして投稿
    const result = await postThread(tweets, draftId)
    
    // DB更新
    await DBManager.transaction(async (tx) => {
      await tx.viral_drafts_v2.update({
        where: { id: draftId },
        data: {
          status: 'POSTED',
          tweet_id: result.threadId,
          posted_at: new Date(),
          // 追加フィールド（必要に応じて）
          thread_data: result.tweetIds
        }
      })
    })
    
    return NextResponse.json({
      success: true,
      id: result.threadId,
      url: result.url,
      threadIds: result.tweetIds
    })
  } catch (error) {
    // エラーハンドリング
  }
}
```

### Phase 3: UI対応（オプション）

#### 3.1 投稿プレビュー
出典を含めた投稿全体をプレビュー表示

#### 3.2 出典ON/OFF切り替え
```typescript
interface PostOptions {
  includeSource: boolean
  sourceFormat: 'detailed' | 'simple'
}
```

## テスト計画

### 1. 単体テスト
- 出典抽出ロジックのテスト
- フォーマット関数のテスト
- 文字数制限の確認

### 2. 統合テスト
```javascript
// test-source-tree-20250621.js
async function testSourceTree() {
  // 1. セッション作成からコンテンツ生成まで
  // 2. 出典情報の確認
  // 3. スレッド投稿の実行
  // 4. DB更新の確認
}
```

## 実装スケジュール

### Day 1: 基礎実装
- source-formatter.ts の実装
- thread-poster.ts の実装
- Perplexityデータ構造の詳細調査

### Day 2: API統合
- /api/publish/post/now の改修
- エラーハンドリング
- レート制限対策

### Day 3: テストと調整
- 各種投稿パターンのテスト
- 文字数調整
- パフォーマンス最適化

## 考慮事項

### 1. 文字数制限
- 出典投稿が280文字を超える場合の対処
- URLの短縮（t.co変換を考慮）

### 2. レート制限
- 連続投稿時の待機時間
- エラー時のリトライ

### 3. 出典の信頼性
- 信頼できるドメインの判定
- 出典が見つからない場合の対処

### 4. 将来の拡張性
- 画像付き出典
- 引用リツイート形式
- 出典の優先順位付け

## 成功指標

1. **機能要件**: 全投稿に出典ツリーが付く
2. **パフォーマンス**: 投稿完了まで10秒以内
3. **信頼性**: 出典URLが正しくアクセス可能
4. **UX**: ユーザーが出典を確認しやすい