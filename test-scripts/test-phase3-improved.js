require('dotenv').config();
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testPhase3WithImprovedConcept() {
  // 改善されたコンセプト（D要素5つ）
  const improvedConcepts = [
    {
      A: "video",
      B: "「あなたの仕事、AIに取られちゃうかも？！」",
      C: "AIによる業務自動化が新卒のスキルシフトを迫る現状",
      D: [
        "プログラミングや契約書レビューなどAIが既に代替している業務の具体例を紹介。",
        "AIの進化で求められる新しいスキルセットを提示。",
        "「あなたのスキルは大丈夫？今すぐスキルチェック！」と視聴者に問いかける。",
        "ビジュアル: 各業務のAI導入前後の比較映像。",
        "ハッシュタグ: #AI革命 #スキルシフト #未来の働き方"
      ],
      title: "AIが新卒業務をどう変えているか？",
      newsSource: "Tech Insider",
      sourceUrl: "https://www.techinsider.com/ai-impact-on-entry-level-jobs"
    }
  ];

  const context = {
    platform: 'Twitter',
    concepts: improvedConcepts
  };

  // Phase 3のプロンプト（orchestrated-cot-strategy.tsから）
  const phase3IntegratePrompt = `
# 前フェーズで作成された3つのコンセプト

【コンセプト】
{concepts}

# タスク
上記の3つのコンセプト全てに基づいて、{platform}にすぐにコピー＆ペースト可能な完全なコンテンツを作成してください。
各コンセプトのA、B、C、Dを効果的に使って、魅力的な投稿を作成してください。

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

# JSON出力形式
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
    }
  ]
}`;

  // プロンプトの補間
  const prompt = phase3IntegratePrompt.replace(/{(\w+)}/g, (match, key) => {
    const value = context[key];
    if (value && typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return value || match;
  });

  console.log('=== Phase 3 改善テスト ===\n');
  console.log('📋 入力コンセプト:');
  console.log(`D要素数: ${improvedConcepts[0].D.length}`);
  console.log('\n🤖 GPTに送信中...\n');

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { 
          role: 'system', 
          content: 'あなたは、新たなトレンドを特定し、流行の波がピークに達する前にその波に乗るコンテンツのコンセプトを作成するバズるコンテンツ戦略家です。' 
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');
    
    if (result.contents && result.contents[0]) {
      const content = result.contents[0];
      console.log('✅ 生成成功！\n');
      console.log('📝 生成されたコンテンツ:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(content.mainPost);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      console.log('\n🔍 要素の反映チェック:');
      console.log(`B（フック）反映: ${content.mainPost.includes('AIに取られ') ? '✅' : '❌'}`);
      console.log(`C（スキルシフト視点）反映: ${content.mainPost.includes('スキル') ? '✅' : '❌'}`);
      console.log(`D-3（CTA）反映: ${content.mainPost.includes('スキルチェック') ? '✅' : '❌'}`);
      console.log(`D-5（ハッシュタグ）反映: ${content.mainPost.includes('#AI革命') ? '✅' : '❌'}`);
    }
    
  } catch (error) {
    console.error('エラー:', error);
  }
}

testPhase3WithImprovedConcept();