# X_BUZZ_FLOW 命名規則再設計

## 🤦‍♂️ **現在の混沌とした命名**

- NEWSシステム
- V2バイラルシステム  
- BUZZシステム
- KaitoAPIシステム
- カーディ・ダーレシステム
- CoTシステム
- GPTシステム
- 統合システム

**→ 何が何だか分からない！**

## 🎯 **新しい命名体系**

### コア機能に基づく分類

#### **1. INTELLIGENCE (情報収集・分析)**
```
📰 News Intelligence    - ニュース記事の収集・分析
⚡ Buzz Intelligence    - バズ投稿の収集・分析  
🔍 Trend Intelligence   - トレンド分析・予測
```

#### **2. GENERATION (コンテンツ生成)**
```
🤖 Content Generator    - AIコンテンツ生成エンジン
🎭 Character Engine     - キャラクター別投稿生成
📝 Draft Manager        - 下書き管理・編集
```

#### **3. AUTOMATION (自動化・投稿)**
```
📅 Scheduler           - 投稿スケジュール管理
🚀 Publisher           - 自動投稿・配信
📊 Performance        - パフォーマンス追跡
```

#### **4. INTEGRATION (統合・制御)**
```
🎯 Mission Control     - 全システム統合ダッシュボード
⚙️  Pipeline Manager   - ワークフロー制御
🔧 System Config       - 設定・管理
```

## 📁 **新しいディレクトリ構造**

### API構造
```
/api/
├── intelligence/
│   ├── news/           # ニュース収集・分析
│   ├── buzz/           # バズ投稿収集・分析
│   └── trends/         # トレンド分析
├── generation/
│   ├── content/        # コンテンツ生成
│   ├── characters/     # キャラクター生成
│   └── drafts/         # 下書き管理
├── automation/
│   ├── scheduler/      # スケジュール管理
│   ├── publisher/      # 投稿・配信
│   └── performance/    # パフォーマンス
└── integration/
    ├── mission-control/ # 統合ダッシュボード
    ├── pipeline/       # ワークフロー
    └── config/         # システム設定
```

### フロントエンド構造
```
/app/
├── intelligence/
│   ├── news/          # ニュース管理画面
│   ├── buzz/          # バズ分析画面  
│   └── trends/        # トレンド画面
├── generation/
│   ├── content/       # コンテンツ生成
│   ├── characters/    # キャラクター設定
│   └── drafts/        # 下書き管理
├── automation/
│   ├── scheduler/     # スケジュール管理
│   ├── publisher/     # 投稿管理
│   └── performance/   # 分析・レポート
└── mission-control/   # 統合ダッシュボード
```

## 🏷️ **具体的なリネーミング**

### 現在 → 新命名

#### システム名
- ~~NEWSシステム~~ → **News Intelligence**
- ~~BUZZシステム~~ → **Buzz Intelligence**  
- ~~KaitoAPIシステム~~ → **Buzz Intelligence (Kaito Provider)**
- ~~V2バイラルシステム~~ → **Content Generator**
- ~~カーディ・ダーレシステム~~ → **Character Engine (Cardi Dare Profile)**
- ~~CoTシステム~~ → **Content Generator (Chain-of-Thought Strategy)**

#### API エンドポイント
- `/api/news/*` → `/api/intelligence/news/*`
- `/api/collect` → `/api/intelligence/buzz/collect`
- `/api/viral/v2/*` → `/api/generation/content/*`
- `/api/viral/drafts/*` → `/api/generation/drafts/*`
- `/api/viral/scheduler/*` → `/api/automation/scheduler/*`

#### データベーステーブル
- `news_articles` → `intelligence_news_articles`
- `buzz_posts` → `intelligence_buzz_posts`  
- `v2_sessions` → `generation_content_sessions`
- `viral_drafts_v2` → `generation_drafts`
- `cot_sessions` → `generation_content_sessions` (統合)

#### UI ルート
- `/news` → `/intelligence/news`
- `/buzz` → `/intelligence/buzz`
- `/viral/v2` → `/generation/content`
- `/viral/drafts` → `/generation/drafts`
- `/scheduler` → `/automation/scheduler`
- 新規: `/mission-control` (統合ダッシュボード)

## 🎯 **新しいユーザー体験**

### メインナビゲーション
```
🎯 Mission Control     - 全体統制・ダッシュボード
📊 Intelligence        - 情報収集・分析
🤖 Generation          - コンテンツ生成
⚙️  Automation         - 自動化・投稿管理
```

### ワークフロー表現
```
Intelligence → Generation → Automation

📰 ニュース収集 → 🤖 AI生成 → 📅 自動投稿
⚡ バズ分析   → 🎭 キャラ化 → 📊 効果測定
```

## 💡 **命名の哲学**

### 1. **機能ベース命名**
- 技術的詳細（V2、CoT、Kaito）ではなく
- **何をするシステムか**で命名

### 2. **階層的構造**
- 大分類（Intelligence, Generation, Automation）
- 中分類（News, Buzz, Content）  
- 小分類（具体的機能）

### 3. **直感的理解**
- エンジニア以外でも理解できる
- 英語圏でも通用する命名
- 拡張しやすい体系

## 🚀 **マイグレーション戦略**

### Phase 1: 新構造準備
1. 新ディレクトリ構造作成
2. 新APIエンドポイント実装（既存との並行）
3. 新UIルート作成

### Phase 2: データ移行
1. テーブルリネーム・統合
2. データマイグレーション  
3. 新旧システム並行運用

### Phase 3: 完全移行
1. 旧システム停止
2. 旧ファイル削除
3. ドキュメント更新

この命名規則により、**X_BUZZ_FLOW = インテリジェント・バイラルコンテンツ・プラットフォーム** として明確に位置付けられます。