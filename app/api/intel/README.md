# Intelligence (Intel) Module

## 概要
情報収集・分析を担当するモジュール。あらゆる情報源からデータを収集し、AIによる分析を行います。

## サブモジュール

### News
- **collect**: ニュース記事の収集
- **analyze**: AI分析（重要度、関連性）
- **summarize**: 要約生成

### Social
- **collect**: ソーシャルメディアデータ収集
- **metrics**: メトリクス計算
- **influencers**: インフルエンサー分析

### Trends
- **detect**: トレンド検出
- **predict**: 将来予測

### Insights
- **correlate**: 相関分析（ニュース×ソーシャル）
- **recommend**: 推奨事項生成

## エンドポイント例
- `GET /api/intel/news/latest`
- `POST /api/intel/news/analyze`
- `GET /api/intel/social/metrics`
- `POST /api/intel/insights/correlate`