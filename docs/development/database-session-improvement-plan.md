# データベース接続とセッション管理の改善計画

## 現状の問題点

### 1. DB接続の問題
- **接続プールの枯渇**: 複数のワーカーとAPIが同時に接続し、プールが枯渇
- **DIRECT_URLの未使用**: 環境変数に設定されているが、活用されていない
- **エラーハンドリング不足**: 接続失敗時のリトライ機能がない
- **Prisma Studioの自動起動**: 開発環境起動時に自動でブラウザが開く

### 2. セッション管理の問題
- **競合状態**: 複数プロセスが同時にセッション状態を更新
- **スタック状態**: INTEGRATING等の状態で止まるセッションが多い
- **リカバリー不足**: エラー時の自動復旧が不完全

### 3. ワーカーの問題
- **ハードコードされたURL**: localhost:3000が固定
- **タイムアウト**: continue-asyncの30秒タイムアウトでカスケード障害
- **接続管理**: Prismaクライアントの再利用が不適切

## 改善案

### Phase 1: DB接続の安定化（即実施）

#### 1.1 接続プール設定の改善
```typescript
// lib/prisma.ts
import { PrismaClient } from '@/lib/generated/prisma'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// 接続プール設定を追加
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

// Direct接続用クライアント（マイグレーション、単一トランザクション用）
export const prismaDirect = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// ヘルスチェック関数
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error('Database health check failed:', error)
    return false
  }
}

// グレースフルシャットダウン
export async function disconnectDB() {
  await prisma.$disconnect()
  await prismaDirect.$disconnect()
}
```

#### 1.2 開発環境スクリプトの改善
```bash
#!/bin/bash
# scripts/dev-persistent-no-studio.sh
# Prisma Studioなしの開発環境起動スクリプト

if ! command -v tmux &> /dev/null; then
    echo "❌ tmuxがインストールされていません"
    echo "   brew install tmux でインストールしてください"
    exit 1
fi

if tmux has-session -t xbuzz 2>/dev/null; then
    echo "📍 既存のセッションに接続します"
    tmux attach-session -t xbuzz
else
    echo "🚀 新しいtmuxセッションを作成します"
    
    tmux new-session -d -s xbuzz -n next
    tmux send-keys -t xbuzz:next "cd /Users/yukio/X_BUZZ_FLOW && npm run dev" Enter
    
    # DB管理用ウィンドウ（Prisma Studioの代わり）
    tmux new-window -t xbuzz -n db
    tmux send-keys -t xbuzz:db "cd /Users/yukio/X_BUZZ_FLOW && node scripts/db-admin.js" Enter
    
    tmux new-window -t xbuzz -n logs
    tmux send-keys -t xbuzz:logs "cd /Users/yukio/X_BUZZ_FLOW && tail -f .next/server/*.log 2>/dev/null" Enter
    
    echo "✅ 開発環境が起動しました（Prisma Studioなし）"
    tmux attach-session -t xbuzz
fi
```

### Phase 2: セッション管理の改善

#### 2.1 セッションロック機構の実装
```typescript
// lib/session-lock.ts
import { prisma } from './prisma'

export async function acquireSessionLock(
  sessionId: string,
  timeoutMs: number = 30000
): Promise<boolean> {
  try {
    // PostgreSQLのアドバイザリロックを使用
    const lockId = BigInt('0x' + sessionId.replace(/-/g, '').substring(0, 15))
    
    const result = await prisma.$queryRaw<[{ acquired: boolean }]>`
      SELECT pg_try_advisory_lock(${lockId}) as acquired
    `
    
    return result[0].acquired
  } catch (error) {
    console.error('Failed to acquire lock:', error)
    return false
  }
}

export async function releaseSessionLock(sessionId: string): Promise<void> {
  try {
    const lockId = BigInt('0x' + sessionId.replace(/-/g, '').substring(0, 15))
    
    await prisma.$queryRaw`
      SELECT pg_advisory_unlock(${lockId})
    `
  } catch (error) {
    console.error('Failed to release lock:', error)
  }
}

export async function withSessionLock<T>(
  sessionId: string,
  operation: () => Promise<T>
): Promise<T> {
  const acquired = await acquireSessionLock(sessionId)
  
  if (!acquired) {
    throw new Error(`Could not acquire lock for session ${sessionId}`)
  }
  
  try {
    return await operation()
  } finally {
    await releaseSessionLock(sessionId)
  }
}
```

#### 2.2 セッション状態の正規化
```typescript
// lib/session-state-machine.ts
import { CotSessionStatus, CotPhaseStep } from '@prisma/client'

interface StateTransition {
  from: CotSessionStatus
  to: CotSessionStatus
  condition?: (session: any) => boolean
}

const VALID_TRANSITIONS: StateTransition[] = [
  { from: 'PENDING', to: 'THINKING' },
  { from: 'THINKING', to: 'EXECUTING' },
  { from: 'EXECUTING', to: 'INTEGRATING' },
  { from: 'INTEGRATING', to: 'COMPLETED' },
  { from: 'INTEGRATING', to: 'THINKING' }, // 次のフェーズへ
  // エラー時の遷移
  { from: 'THINKING', to: 'FAILED' },
  { from: 'EXECUTING', to: 'FAILED' },
  { from: 'INTEGRATING', to: 'FAILED' },
]

export function isValidTransition(
  from: CotSessionStatus,
  to: CotSessionStatus
): boolean {
  return VALID_TRANSITIONS.some(t => t.from === from && t.to === to)
}

export async function transitionSession(
  sessionId: string,
  newStatus: CotSessionStatus,
  updates: any = {}
) {
  const session = await prisma.cotSession.findUnique({
    where: { id: sessionId }
  })
  
  if (!session) {
    throw new Error('Session not found')
  }
  
  if (!isValidTransition(session.status, newStatus)) {
    throw new Error(
      `Invalid transition from ${session.status} to ${newStatus}`
    )
  }
  
  return await prisma.cotSession.update({
    where: { id: sessionId },
    data: {
      status: newStatus,
      ...updates
    }
  })
}
```

### Phase 3: ワーカーの改善

#### 3.1 環境変数ベースの設定
```javascript
// scripts/async-worker-v3.js
require('dotenv').config({ path: '.env.local' })

const WORKER_CONFIG = {
  // APIエンドポイント（環境変数から取得）
  API_BASE_URL: process.env.WORKER_API_URL || 'http://localhost:3000',
  
  // タイムアウト設定
  CONTINUE_TIMEOUT: parseInt(process.env.WORKER_CONTINUE_TIMEOUT || '60000'),
  
  // リトライ設定
  MAX_RETRIES: parseInt(process.env.WORKER_MAX_RETRIES || '3'),
  RETRY_DELAY: parseInt(process.env.WORKER_RETRY_DELAY || '1000'),
  
  // 接続プール設定
  DB_POOL_SIZE: parseInt(process.env.WORKER_DB_POOL_SIZE || '5'),
}

// Prismaクライアントを共有
const { PrismaClient } = require('../lib/generated/prisma')
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
})

// グレースフルシャットダウン
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...')
  await prisma.$disconnect()
  process.exit(0)
})
```

### Phase 4: 統合テストの改善

#### 4.1 テストヘルパーの作成
```typescript
// lib/test-helpers/db-test-utils.ts
import { prisma, prismaDirect } from '@/lib/prisma'

export class TestDBManager {
  private static instance: TestDBManager
  
  static getInstance(): TestDBManager {
    if (!this.instance) {
      this.instance = new TestDBManager()
    }
    return this.instance
  }
  
  async setupTestDB() {
    // テスト用の接続を確立
    await prisma.$connect()
  }
  
  async cleanupTestDB() {
    // テストデータのクリーンアップ
    await prisma.$disconnect()
  }
  
  async createTestSession(data: any) {
    return await prisma.cotSession.create({ data })
  }
  
  async waitForSessionStatus(
    sessionId: string,
    expectedStatus: string,
    timeoutMs: number = 30000
  ) {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeoutMs) {
      const session = await prisma.cotSession.findUnique({
        where: { id: sessionId }
      })
      
      if (session?.status === expectedStatus) {
        return session
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    throw new Error(`Timeout waiting for session status: ${expectedStatus}`)
  }
}
```

## 実装順序

1. **即座に実施**
   - DB接続プールの設定改善
   - Prisma Studioなしの開発環境スクリプト作成
   - 環境変数の整理

2. **1週間以内**
   - セッションロック機構の実装
   - ワーカーの環境変数対応
   - テストヘルパーの作成

3. **2週間以内**
   - 状態遷移の正規化
   - 統合テストの整備
   - ドキュメントの更新

## 期待される効果

- DB接続エラーの90%削減
- セッション競合の解消
- テスト実行時間の50%短縮
- 開発体験の向上（ブラウザが勝手に開かない）