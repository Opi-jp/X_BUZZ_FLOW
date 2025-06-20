# CoTシステム 実際のページマップ

## 🎯 メインページ
- **Mission Control**: http://localhost:3000/mission-control
  - 統合ダッシュボード（最初にアクセスすべきページ）

## 📝 コンテンツ生成フロー
1. **新規作成**: http://localhost:3000/generation/content
   - ここからセッション作成を開始

2. **セッション詳細**: http://localhost:3000/generation/content/session/{sessionId}
   - 作成したセッションの詳細確認

3. **コンセプト選択**: http://localhost:3000/generation/content/concept-select/{sessionId}
   - GPTが生成したコンセプトから選択

4. **キャラクター選択**: http://localhost:3000/generation/content/character-select/{sessionId}
   - キャラクターを選んで投稿生成

5. **結果確認**: http://localhost:3000/generation/content/results/{sessionId}
   - 生成された投稿の確認

## 📋 下書き管理
- **下書き一覧**: http://localhost:3000/generation/drafts
- **下書き詳細**: http://localhost:3000/generation/drafts/{draftId}

## ❌ 存在しないパス
- `/generation/viral/v2` - このパスは存在しません
- `/viral/*` - 旧システムのパスは削除されています