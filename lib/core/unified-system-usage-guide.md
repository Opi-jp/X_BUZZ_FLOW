# 統一システム管理 (Unified System Manager) 使用ガイド

## 概要

統一システム管理は、X_BUZZ_FLOW全体で一貫性のある開発を支援するための中央管理システムです。

## 主要機能

### 1. ID生成管理

```typescript
import { IDGenerator, EntityType } from '@/lib/core/unified-system-manager'

// セッションIDの生成
const sessionId = IDGenerator.generate(EntityType.VIRAL_SESSION)
// => "sess_abc123def456"

// IDのバリデーション
if (!IDGenerator.validate(sessionId, EntityType.VIRAL_SESSION)) {
  throw new Error('Invalid session ID')
}

// IDからエンティティタイプを推定
const type = IDGenerator.inferType(sessionId)
// => EntityType.VIRAL_SESSION
```

### 2. 型定義とバリデーション

```typescript
import { CommonSchemas, ModuleSchemas } from '@/lib/core/unified-system-manager'
import { z } from 'zod'

// APIリクエストのバリデーション
const createSessionSchema = z.object({
  theme: z.string().min(1).max(100),
  platform: CommonSchemas.platform,
  style: CommonSchemas.style
})

// 使用例
export async function POST(request: Request) {
  const body = await request.json()
  
  // バリデーション
  const parsed = createSessionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error },
      { status: 400 }
    )
  }
  
  const { theme, platform, style } = parsed.data
  // ...
}
```

### 3. プロンプト管理

```typescript
import { PromptManager } from '@/lib/core/unified-system-manager'

// プロンプトの読み込みと変数展開
const prompt = await PromptManager.load(
  'perplexity/collect-topics.txt',
  {
    theme: 'AIと働き方',
    platform: 'Twitter',
    style: 'エンターテイメント'
  },
  {
    validate: true,  // 未展開変数のチェック
    cache: true      // キャッシュを使用
  }
)

// キャラクタープロファイルの変換
const characterProfile = await PromptManager.wrapCharacterProfile('cardi-dare')
```

### 4. データ変換管理

```typescript
import { DataTransformer, EntityType } from '@/lib/core/unified-system-manager'

// DB層 → プロセス層
const rawSession = await prisma.viralSession.findUnique({ where: { id } })
const processData = DataTransformer.toProcessData(rawSession, EntityType.VIRAL_SESSION)

// プロセス層 → 表示層（レベル別）
const summaryData = DataTransformer.toDisplayData(processData, 'summary')
const previewData = DataTransformer.toDisplayData(processData, 'preview')
const detailData = DataTransformer.toDisplayData(processData, 'detail')
```

### 5. エラーハンドリング管理

```typescript
import { ErrorManager, SystemError } from '@/lib/core/unified-system-manager'

try {
  // 処理実行
  const result = await someOperation()
} catch (error) {
  // エラーログの記録
  const errorId = await ErrorManager.logError(error, {
    module: 'create',
    operation: 'generate-concepts',
    sessionId: session.id,
    metadata: { theme: session.theme }
  })
  
  // ユーザー向けメッセージの取得
  const userMessage = ErrorManager.getUserMessage(error, 'ja')
  
  // リトライ可能かチェック
  if (ErrorManager.isRetryable(error)) {
    // リトライロジック
  }
  
  return NextResponse.json(
    { 
      error: userMessage,
      errorId,
      retryable: ErrorManager.isRetryable(error)
    },
    { status: 500 }
  )
}
```

### 6. DB連携管理

```typescript
import { DBManager } from '@/lib/core/unified-system-manager'

// トランザクション処理
const result = await DBManager.transaction(async (tx) => {
  // セッション作成
  const session = await tx.viralSession.create({
    data: { /* ... */ }
  })
  
  // アクティビティログ記録
  await tx.sessionActivityLog.create({
    data: {
      sessionId: session.id,
      activityType: 'SESSION_CREATED',
      details: { theme: session.theme }
    }
  })
  
  return session
}, {
  maxRetries: 3,
  timeout: 30000
})

// バッチ処理
await DBManager.batchOperation(
  largeDataArray,
  async (batch) => {
    await prisma.newsArticle.createMany({
      data: batch
    })
  },
  100  // バッチサイズ
)
```

## 実装例：新しいAPIエンドポイント

```typescript
// app/api/create/flow/start/route.ts
import { NextResponse } from 'next/server'
import { 
  IDGenerator, 
  EntityType,
  CommonSchemas,
  PromptManager,
  DataTransformer,
  ErrorManager,
  DBManager,
  SystemError
} from '@/lib/core/unified-system-manager'
import { z } from 'zod'

// リクエストスキーマの定義
const requestSchema = z.object({
  theme: z.string().min(1).max(100),
  platform: CommonSchemas.platform,
  style: CommonSchemas.style,
  autoProgress: z.boolean().optional()
})

export async function POST(request: Request) {
  try {
    // 1. リクエストのバリデーション
    const body = await request.json()
    const parsed = requestSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: parsed.error.errors
        },
        { status: 400 }
      )
    }
    
    const { theme, platform, style, autoProgress } = parsed.data
    
    // 2. ID生成
    const sessionId = IDGenerator.generate(EntityType.VIRAL_SESSION)
    
    // 3. トランザクション処理
    const session = await DBManager.transaction(async (tx) => {
      // セッション作成
      const newSession = await tx.viralSession.create({
        data: {
          id: sessionId,
          theme,
          platform,
          style,
          status: 'CREATED',
          selectedIds: []
        }
      })
      
      // アクティビティログ
      await tx.sessionActivityLog.create({
        data: {
          id: IDGenerator.generate(EntityType.ACTIVITY_LOG),
          sessionId: newSession.id,
          sessionType: 'viral',
          activityType: 'SESSION_STARTED',
          details: { theme, platform, style }
        }
      })
      
      return newSession
    })
    
    // 4. データ変換（表示用）
    const processData = DataTransformer.toProcessData(session, EntityType.VIRAL_SESSION)
    const displayData = DataTransformer.toDisplayData(processData, 'preview')
    
    // 5. 自動進行の場合は次のステップを開始
    if (autoProgress) {
      // 非同期でトピック収集を開始
      startTopicCollection(sessionId).catch(error => {
        ErrorManager.logError(error, {
          module: 'create',
          operation: 'auto-progress-collection',
          sessionId
        })
      })
    }
    
    return NextResponse.json({
      success: true,
      data: displayData,
      meta: {
        requestId: IDGenerator.generate(EntityType.JOB),
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    })
    
  } catch (error) {
    // 6. エラーハンドリング
    const errorId = await ErrorManager.logError(error, {
      module: 'create',
      operation: 'flow-start'
    })
    
    const userMessage = ErrorManager.getUserMessage(error, 'ja')
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error instanceof SystemError ? error.code : 'CREATE_001',
          message: userMessage,
          errorId,
          retryable: ErrorManager.isRetryable(error)
        }
      },
      { status: 500 }
    )
  }
}

// 非同期でトピック収集を開始
async function startTopicCollection(sessionId: string) {
  const prompt = await PromptManager.load(
    'perplexity/collect-topics.txt',
    { 
      theme: session.theme,
      platform: session.platform,
      style: session.style
    },
    { validate: true, cache: true }
  )
  
  // Perplexity API呼び出し...
}
```

## ベストプラクティス

### 1. ID生成
- 必ず`IDGenerator.generate()`を使用する
- 手動でIDを作成しない
- バリデーションを忘れない

### 2. エラーハンドリング
- すべてのエラーを`ErrorManager.logError()`で記録
- ユーザーには`ErrorManager.getUserMessage()`を表示
- リトライ可能性を必ずチェック

### 3. データ変換
- 3層アーキテクチャを守る（Raw → Process → Display）
- 表示レベルを適切に選択（summary/preview/detail）
- 不要なデータを送信しない

### 4. DB操作
- 複数の更新は必ずトランザクションで
- 大量データはバッチ処理を使用
- リトライ可能なエラーは自動リトライ

### 5. プロンプト管理
- 変数の展開を忘れない
- キャッシュを活用する
- バリデーションを有効にする

## 移行ガイド

### 既存コードの移行

```typescript
// Before
const sessionId = nanoid()
const session = await prisma.viralSession.create({
  data: { id: sessionId, /* ... */ }
})

// After
const sessionId = IDGenerator.generate(EntityType.VIRAL_SESSION)
const session = await DBManager.transaction(async (tx) => {
  return await tx.viralSession.create({
    data: { id: sessionId, /* ... */ }
  })
})
```

### 段階的な導入

1. **Phase 1**: 新規APIエンドポイントから使用開始
2. **Phase 2**: エラーハンドリングを統一
3. **Phase 3**: 既存のID生成を移行
4. **Phase 4**: データ変換層を統一
5. **Phase 5**: 全体的な整合性チェック

## トラブルシューティング

### よくある問題

1. **IDバリデーションエラー**
   - プレフィックスが正しいか確認
   - EntityTypeが適切か確認

2. **プロンプト展開エラー**
   - 変数名のタイポをチェック
   - 必須変数が渡されているか確認

3. **トランザクションタイムアウト**
   - バッチサイズを調整
   - タイムアウト時間を延長

4. **データ変換エラー**
   - エンティティタイプが正しいか確認
   - 必須フィールドの存在確認

## 今後の拡張予定

- [ ] GraphQL対応
- [ ] WebSocket対応
- [ ] 国際化（i18n）対応
- [ ] メトリクス収集機能
- [ ] A/Bテスト機能
- [ ] キャッシュ戦略の高度化