# Publishing (Publish) Module

## 概要
コンテンツの配信と管理を担当するモジュール。Twitter投稿、スケジュール管理、投稿追跡を行います。

## サブモジュール

### Post
- **now**: 即時投稿
- **thread**: スレッド投稿

### Schedule
- **set**: スケジュール設定
- **manage**: スケジュール管理

### Track
- **status**: 投稿状態追跡

## エンドポイント例
- `POST /api/publish/post/now`
- `POST /api/publish/schedule/set`
- `GET /api/publish/track/status/{id}`