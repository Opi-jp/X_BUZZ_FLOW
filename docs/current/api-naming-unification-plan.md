# API命名規則統一実装計画

## 現状の問題分析

### 重複API問題
- **generate系**: 3つの重複エンドポイント
- **collect系**: 4つの重複エンドポイント  
- **drafts系**: 2つの重複エンドポイント
- **[id]パラメータ**: 6つの重複パターン

### 命名の一貫性問題
- `/api/intelligence/news/collect` vs `/api/intel/news/collect`
- `/api/generation/content/sessions/[id]/drafts` vs `/api/drafts`
- `/api/create/flow/start` vs `/api/intelligence/news/collect/start`

## 統一命名規則

### 1. モジュールベース階層構造
```
/api/{module}/{resource}/{action}
/api/{module}/{resource}/[id]
/api/{module}/{resource}/[id]/{action}
```

### 2. 5フェーズ対応API構造
```
# Create→Post フロー専用
/api/flow/{action}              # フロー管理
/api/flow/[id]/{action}         # セッション操作

# モジュール別API
/api/intel/{resource}/{action}   # 情報収集
/api/create/{resource}/{action}  # コンテンツ生成  
/api/publish/{resource}/{action} # 投稿・スケジュール
/api/analyze/{resource}/{action} # 分析・レポート
```

### 3. 動詞の統一
- `collect` → 情報収集専用
- `generate` → コンテンツ生成専用  
- `create` → リソース作成専用
- `schedule` → 投稿予約専用
- `post` → 即時投稿専用

## 移行対象API（優先度順）

### 高優先度（アクティブ使用中）
1. `/api/generation/content/sessions/*` → `/api/create/sessions/*`
2. `/api/drafts/*` → `/api/create/drafts/*`  
3. `/api/twitter/post` → `/api/publish/post/now`
4. `/api/flow/*` → 現状維持（既に統合済み）

### 中優先度（部分使用）
1. `/api/intelligence/news/*` → `/api/intel/news/*`
2. `/api/intelligence/buzz/*` → `/api/intel/buzz/*`
3. `/api/automation/*` → `/api/publish/schedule/*`

### 低優先度（未使用・重複）
1. 未使用APIの削除
2. 重複APIの統合
3. test-*, debug-* APIの整理

## 実装手順

### Phase 2.1: 重複API整理（即実行可能）
- [ ] 未使用APIファイルの削除
- [ ] 重複APIの統合
- [ ] middleware.tsでのリダイレクト設定

### Phase 2.2: 命名規則適用（段階的移行）
- [ ] 新しい命名規則でAPIを再作成
- [ ] フロントエンドの参照先を段階的更新
- [ ] 旧APIの非推奨化

### Phase 2.3: 最終検証
- [ ] 依存関係スキャンでの確認
- [ ] E2Eテストでの動作確認
- [ ] ドキュメント更新

## 期待効果

1. **開発効率向上**: 直感的なAPI構造
2. **保守性向上**: 一貫した命名規則
3. **重複排除**: APIエンドポイント数の大幅削減
4. **拡張性確保**: 新機能追加時の明確な配置基準

## リスク管理

- **既存機能への影響**: middleware.tsでのリダイレクト維持
- **段階的移行**: 一度に変更せず、モジュール別に実施
- **ロールバック準備**: 旧APIの一時保持