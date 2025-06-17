const { OpenAI } = require('openai');
const dotenv = require('dotenv');
const fs = require('fs');
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Phase 2の結果を読み込む
const phase2Result = JSON.parse(fs.readFileSync('phase2-result.json', 'utf8'));

// Phase 3のプロンプト（Phase3Strategy.integrate.promptより）
const phase3Prompt = `
# あなたの役割
あなたは、新たなトレンドを特定し、流行の波がピークに達する前にその波に乗るコンテンツのコンセプトを作成するバズるコンテンツ戦略家です。
Twitterで多くのエンゲージメントを獲得できる魅力的なコンテンツを作成することが得意です。

# 前フェーズで作成された3つのコンセプト

【コンセプト】
${JSON.stringify(phase2Result.concepts, null, 2)}

# タスク
上記の3つのコンセプト全てに基づいて、Twitterにすぐにコピー＆ペースト可能な完全なコンテンツを作成してください。
各コンセプトのA、B、C、Dを効果的に使って、物語性のある魅力的な投稿を作成してください。

重要：単なる情報伝達ではなく、読者の感情を動かし、共感を生み、シェアしたくなる物語として構成してください。
コンテンツはエンターテイメントスタイルで表現してください。

## スタイルガイド
- エンタメ: 驚き、面白さ、意外性を重視。絵文字多め、軽快なトーン
- 教育: 実用性、分かりやすさ重視。段階的な説明、具体例
- 洞察的: 深い分析、未来への示唆。専門的だが理解しやすく
- 個人的な話: 体験談、感情的なつながり。親近感のあるトーン

## 各コンセプトの要素（A、B、C、D）を効果的に使う方法
- **A（形式）**: 指定された形式（thread/video/carousel）に適した構成にする
- **B（フック）**: これを冒頭に使用して注目を集める（多少アレンジしても良いが、本質は維持）
- **C（角度/独自の視点）**: この視点を明確に本文全体に反映させ、その角度から一貫して語る
- **D（キーポイント）**: 5つ全てのポイントを効果的に活用し、以下のように展開する：
  - 具体例や洞察は詳しく説明
  - CTAは必ず含める
  - ビジュアル説明を視覚的説明として含める
  - ハッシュタグを投稿に含める
- **newsSource**と**sourceUrl**: 信頼性のある情報源として必ず含める

## 重要な要件
- **必ずA、B、C、Dの全要素を効果的に使用すること**
- C（独自の視点）は単に言及するのではなく、その視点から語るスタンスで全体を構成すること
- D（キーポイント）の5つの要素は全て何らかの形で投稿に反映させること
- すべてのテキスト、書式、改行、絵文字、ハッシュタグを含める
- 完成させてすぐに投稿できるように準備する
- 人間による文体・トーンの微調整は前提とする

# 出力形式
必ず以下のJSON形式で出力してください：
{
  "contents": [
    {
      "conceptNumber": 1,
      "title": "コンセプト1のタイトル",
      "mainPost": "完全な投稿文（改行、絵文字、ハッシュタグ含む）",
      "hashtags": ["ハッシュタグ1", "ハッシュタグ2"],
      "visualDescription": "必要な画像/動画の詳細な説明",
      "postingNotes": "具体的なタイミングと最適化のヒント",
      "newsSource": "ニュースソース名",
      "sourceUrl": "ソースURL"
    },
    {
      "conceptNumber": 2,
      "title": "コンセプト2のタイトル",
      "mainPost": "完全な投稿文（改行、絵文字、ハッシュタグ含む）",
      "hashtags": ["ハッシュタグ1", "ハッシュタグ2"],
      "visualDescription": "必要な画像/動画の詳細な説明",
      "postingNotes": "具体的なタイミングと最適化のヒント",
      "newsSource": "ニュースソース名",
      "sourceUrl": "ソースURL"
    },
    {
      "conceptNumber": 3,
      "title": "コンセプト3のタイトル",
      "mainPost": "完全な投稿文（改行、絵文字、ハッシュタグ含む）",
      "hashtags": ["ハッシュタグ1", "ハッシュタグ2"],
      "visualDescription": "必要な画像/動画の詳細な説明",
      "postingNotes": "具体的なタイミングと最適化のヒント",
      "newsSource": "ニュースソース名",
      "sourceUrl": "ソースURL"
    }
  ]
}`;

async function testPhase3() {
  try {
    console.log('=== Phase 3 GPT テスト開始 ===\n');
    console.log('Phase 2のコンセプト数:', phase2Result.concepts.length);
    console.log('\nGPT-4oでコンテンツ生成中...\n');
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'あなたは、新たなトレンドを特定し、流行の波がピークに達する前にその波に乗るコンテンツのコンセプトを作成するバズるコンテンツ戦略家です。'
        },
        { 
          role: 'user', 
          content: phase3Prompt 
        }
      ],
      max_tokens: 4000,
      temperature: 0.8,
      response_format: { type: 'json_object' }
    });
    
    const result = JSON.parse(response.choices[0].message.content);
    
    console.log('=== Phase 3 結果 ===\n');
    console.log('生成されたコンテンツ数:', result.contents.length);
    
    result.contents.forEach((content, index) => {
      console.log(`\n--- コンテンツ${index + 1}: ${content.title} ---`);
      console.log('投稿形式:', phase2Result.concepts[index].A);
      console.log('メイン投稿（最初の100文字）:', content.mainPost.substring(0, 100) + '...');
      console.log('ハッシュタグ:', content.hashtags.join(', '));
      console.log('投稿タイミング:', content.postingNotes);
    });
    
    // 完全な結果をファイルに保存
    fs.writeFileSync('phase3-result.json', JSON.stringify(result, null, 2));
    console.log('\n\n完全な結果をphase3-result.jsonに保存しました。');
    
    // 1つ目のコンテンツを完全表示
    console.log('\n\n=== コンテンツ1の完全版 ===');
    console.log(result.contents[0].mainPost);
    
  } catch (error) {
    console.error('エラーが発生しました:', error.message);
  }
}

testPhase3();