# X_BUZZ_FLOW システムアーキテクチャ図

## 全体フロー

```mermaid
graph LR
    %% Intelligence Layer
    A[🔍 Intelligence] --> A1[News RSS]
    A --> A2[Social Metrics]
    A --> A3[Trend Analysis]
    
    %% Creation Layer
    A1 --> B[🎨 Creation]
    A2 --> B
    A3 --> B
    B --> B1[Perplexity Search]
    B1 --> B2[GPT Concepts]
    B2 --> B3[Claude Contents]
    
    %% Publishing Layer
    B3 --> C[📤 Publishing]
    C --> C1[Draft Management]
    C1 --> C2[Schedule/Post]
    
    %% Analytics Layer
    C2 --> D[📊 Analytics]
    D --> D1[Metrics Collection]
    D1 --> D2[Report Generation]
    D2 --> D3[Insights]
    D3 -.-> A
    
    %% Styling
    classDef intel fill:#3498db,stroke:#2980b9,stroke-width:2px,color:#fff
    classDef create fill:#2ecc71,stroke:#27ae60,stroke-width:2px,color:#fff
    classDef publish fill:#f39c12,stroke:#e67e22,stroke-width:2px,color:#fff
    classDef analyze fill:#9b59b6,stroke:#8e44ad,stroke-width:2px,color:#fff
    
    class A,A1,A2,A3 intel
    class B,B1,B2,B3 create
    class C,C1,C2 publish
    class D,D1,D2,D3 analyze
```

## データフロー詳細

```mermaid
sequenceDiagram
    participant User
    participant Intel as Intelligence
    participant Create as Creation
    participant Pub as Publishing
    participant Analyze as Analytics
    
    User->>Intel: ニュース収集開始
    Intel->>Intel: RSS収集・分析
    Intel->>Create: 分析済みデータ
    Create->>Create: Perplexity検索
    Create->>Create: GPTコンセプト生成
    Create->>Create: Claude投稿生成
    Create->>Pub: 下書き作成
    Pub->>Pub: スケジューリング
    Pub->>Analyze: 投稿実行
    Analyze->>Analyze: メトリクス収集
    Analyze-->>Intel: インサイト
```

## 使い方

1. **GitHub**: このファイルをGitHubで開くと自動的に図が表示されます
2. **VS Code**: Mermaid拡張機能をインストールしてプレビュー表示
3. **ブラウザ**: flow-diagram.htmlをブラウザで開く
4. **オンライン**: https://mermaid.live/ にコードをコピー＆ペースト