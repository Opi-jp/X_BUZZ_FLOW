const { OpenAI } = require('openai');
const dotenv = require('dotenv');
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Perplexityの結果を模擬
const perplexityResults = [
  {
    "TOPIC": "ウェイモの自動運転タクシーが反トランプデモの標的となり、AIが職を奪う懸念が高まる",
    "perplexityAnalysis": "このトピックは、AIが人間の労働を置き換える可能性に対する強い感情的な反応を引き起こしています。ウェイモの自動運転タクシーがデモの標的となったことは、AI技術が多くの人々の仕事を奪う可能性に対する懸念を高めており、賛成派と反対派の間で激しい議論を生み出しています。怒り、憤慨、驚きなどの強い感情が含まれており、多くの人が共感できる体験談として広がりやすいです。",
    "url": "https://toyokeizai.net/articles/-/884240",
    "date": "2025-06-15",
    "summary": "ロサンゼルスのダウンタウンで行われた反トランプデモにおいて、ウェイモの自動運転タクシーが標的となり炎上する映像が世界中に配信されました。この事件は、AI技術が多くの人々の仕事を奪う可能性に対する懸念を高めており、強い感情的な反応を引き起こしています。"
  },
  {
    "TOPIC": "大日本印刷が生成AIと統計データを用いたマーケティングサービスを発表",
    "perplexityAnalysis": "このトピックは、AI技術の進化とその応用に関する興味と驚きを引き起こします。大日本印刷の新しいマーケティングサービス「ペルソナインサイト」は、生成AIと統計データを組み合わせた革新的なアプローチを示しており、企業と消費者の関係性に大きな変化をもたらす可能性があります。新しいテクノロジーの発表とその潜在的な影響についての議論が、Twitterなどで広がりやすいです。",
    "url": "https://it.impress.co.jp/articles/-/28006",
    "date": "2025-06-16",
    "summary": "大日本印刷は、生成AIと国内の統計データを用いたマーケティングサービス「ペルソナインサイト」を2025年6月30日から提供することを発表しました。このサービスは、仮想消費者を再現し、マーケティング戦略に大きな影響を与える可能性があります。"
  },
  {
    "TOPIC": "OpenAIの新モデル「o3-pro」が公開、AIの進化とその影響についての議論",
    "perplexityAnalysis": "OpenAIの新モデル「o3-pro」の公開は、AI技術の急速な進化とその社会への影響についての議論を引き起こします。この新モデルは、AIの能力とその応用範囲をさらに拡大し、多くの人々が今すぐ知らないと損するタイムリーな話題となっています。Twitterや他のプラットフォームでは、AIの進化に対する賛否両論の議論が活発に進行し、強い意見の対立や驚きの事実が共有されます。",
    "url": "https://note.com/chaen_channel/n/n0ca9c17afaf3",
    "date": "2025-06-16",
    "summary": "OpenAIは最新モデル「o3-pro」を公開しました。このモデルはAIの能力を大幅に向上させ、AI技術の進化とその社会への影響についての議論を引き起こしています。AIの将来的な役割や影響についての賛否両論が、インターネット上で広がっています。"
  }
];

// Phase 2のプロンプト
const phase2Prompt = `
# あなたの役割
あなたは、新たなトレンドを特定し、流行の波がピークに達する前にその波に乗るコンテンツのコンセプトを作成するバズるコンテンツ戦略家です。

# フェーズ1で得た情報
${JSON.stringify(perplexityResults, null, 2)}

# タスク
下記の視点で分析を行い、
A：ウイルス速度指標
- 検索ボリュームの急増と成長率
- ソーシャルメンションの加速
- 複数プラットフォームの存在
- インフルエンサーの採用
- メディア報道の勢い
B：コンテンツアングル識別：実行可能なトレンドごとに、独自の角度を特定します。
- 反対派は世論に異議を唱える
- 専門家による内部視点の分析
- 個人的なつながりの物語
- 教育の内訳
- 次に何が起こるかを予測するコンテンツ
- 舞台裏の洞察
- 過去のイベントとの比較内容

その分析に基づいて、物語性を豊かに、下記の構造に基づいて、3 つのコンセプトを提供してください。

●コンテンツコンセプトフレームワーク
それぞれの機会について、以下を開発します
A：形式: [スレッド/ビデオ/投稿タイプ]
B：フック: 「[注目を集める具体的なオープナー]」
C：角度: [独自の視点や見方]

●コンテンツ概要:
トレンドにつながるオープニングフック
[物語を構築する3～5つのキーポイント]
-予期せぬ洞察や啓示
-エンゲージメントを促進するCTA
-タイミング: 最大の効果を得るには [X] 時間以内に投稿してください
-ビジュアル: [具体的な画像/動画の説明]
-ハッシュタグ: [最適化されたタグ]

。この際には、コンセプト作成のもととなったニュースソースとURLも必ず提示します。

出力は
A：形式: [スレッド/ビデオ/投稿タイプ]
B：フック: 「[注目を集める具体的なオープナー]」
C：角度: [独自の視点や見方]
D：3〜5個のキーポイント
で出力してください

# 出力形式
必ず以下のJSON形式で出力してください：
{
  "analysisInsights": "記事分析から得られた主要な洞察",
  "concepts": [
    {
      "title": "コンセプトタイトル",
      "A": "形式（single/thread/video/carousel）",
      "B": "注目を集める具体的なオープナー",
      "C": "独自の視点や見方",
      "D": [],
      "newsSource": "記事のタイトル",
      "sourceUrl": "記事のURL"
    }
  ],
  "nextStepMessage": "バズるコンテンツのコンセプトの概要は次のとおりです。「続行」と入力すると、各コンセプトに基づいたコンテンツ作成を開始します"
}`;

async function testPhase2() {
  try {
    console.log('=== Phase 2 GPT テスト開始 ===\n');
    console.log('GPT-4oでコンセプト生成中...\n');
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'あなたは、新たなトレンドを特定し、流行の波がピークに達する前にその波に乗るコンテンツのコンセプトを作成するバズるコンテンツ戦略家です。'
        },
        { 
          role: 'user', 
          content: phase2Prompt 
        }
      ],
      max_tokens: 4500,
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });
    
    const result = JSON.parse(response.choices[0].message.content);
    
    console.log('=== Phase 2 結果 ===\n');
    console.log('分析洞察:', result.analysisInsights);
    console.log('\n生成されたコンセプト数:', result.concepts.length);
    
    result.concepts.forEach((concept, index) => {
      console.log(`\n--- コンセプト${index + 1}: ${concept.title} ---`);
      console.log('A（形式）:', concept.A);
      console.log('B（フック）:', concept.B);
      console.log('C（角度）:', concept.C);
      console.log('D（キーポイント）:');
      concept.D.forEach((point, i) => {
        console.log(`  ${i + 1}. ${point}`);
      });
      console.log('ソース:', concept.newsSource);
      console.log('URL:', concept.sourceUrl);
    });
    
    // 完全な結果をファイルに保存
    const fs = require('fs');
    fs.writeFileSync('phase2-result.json', JSON.stringify(result, null, 2));
    console.log('\n\n完全な結果をphase2-result.jsonに保存しました。');
    
  } catch (error) {
    console.error('エラーが発生しました:', error.message);
  }
}

testPhase2();