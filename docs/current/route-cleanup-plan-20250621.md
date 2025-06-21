# ルート構造整理計画

## 現状の問題
- 23個のリダイレクトファイルが存在
- 同じ機能に複数のパス（例: post系が3つ）
- intel/intelligenceの重複
- 誰も全体像を把握できない

## 目標とする構造

### 統合アーキテクチャに基づく4モジュール構成
```
/api/
├── intel/          # Intelligence（情報収集）
│   ├── news/       # ニュース収集・分析
│   ├── social/     # ソーシャル分析（Buzz/KaitoAPI）
│   └── insights/   # 統合分析・ブリーフィング
│
├── create/         # Creation（コンテンツ生成）
│   ├── flow/       # 16ステップフロー管理
│   ├── draft/      # 下書き管理
│   └── persona/    # キャラクター管理
│
├── publish/        # Publishing（投稿）
│   ├── post/       # 即時投稿
│   └── schedule/   # スケジュール投稿
│
└── analyze/        # Analytics（分析）
    ├── metrics/    # メトリクス
    └── performance/# パフォーマンス
```

## 整理手順

### Phase 1: 実際の使用状況確認
1. フロントエンドからの呼び出し箇所を特定
2. 動作しているAPIと未使用APIの分類
3. リダイレクト先の実体確認

### Phase 2: 段階的統合
1. 重複APIを本命に統合
2. リダイレクトファイルを削除
3. フロントエンドの呼び出しパス修正

### Phase 3: 新構造への移行
1. intelligenceをintelに統合
2. 散在するAPIを4モジュールに整理
3. 命名規則の統一

## リダイレクト削除リスト

### 即座に削除可能（重複明確）
- /api/post/redirect.ts → /api/publish/post/now
- /api/twitter/post/redirect.ts → /api/publish/post/now
- /api/publish/redirect.ts → /api/publish/post/now（自己参照？）

### 統合必要
- /api/intelligence/* → /api/intel/*
- /api/generation/* → /api/create/*
- /api/posting-plan/* → /api/publish/schedule/*

### 要確認
- /api/buzz-posts/ → /api/intel/social/posts
- /api/collect/ → /api/intel/social/collect