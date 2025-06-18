#!/usr/bin/env node

/**
 * V2プロンプトの直接テスト
 * API経由ではなく直接関数を呼び出してテスト
 */

require('dotenv').config({ path: '.env.local' })
const OpenAI = require('openai')

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

async function testConceptGeneration() {
  console.log('🧪 V2コンセプト生成プロンプトの直接テスト')
  console.log('==========================================\n')
  
  // テスト用のトピック
  const topic = {
    TOPIC: "AIエージェントが変える未来の働き方：2025年の職場革命",
    perplexityAnalysis: "OpenAIやGoogleが相次いでAIエージェント機能を発表し、実際の業務での活用事例が急増。特に事務作業の自動化により、人間の役割が大きく変化することへの期待と不安が入り混じった議論が活発化している。",
    url: "https://example.com/ai-agent-workplace-2025"
  }
  
  const session = {
    platform: 'Twitter',
    style: 'エンターテイメント'
  }
  
  const topicIndex = 0
  
  // 新しいプロンプト
  const prompt = `あなたは、新たなトレンドを特定し、流行の波がピークに達する前にその波に乗るコンテンツのコンセプトを作成するバズるコンテンツ戦略家です。

以下のトピックについて、【${session.platform}】で【${session.style}】スタイルでバズる投稿コンセプトを3つ作成してください。

トピック: ${topic.TOPIC}
分析: ${topic.perplexityAnalysis}
URL: ${topic.url}

【フック】

●以下の5種類のうちいずれか（または組み合わせ）を使って、心をつかむ「オープニングフック」を3つ考えてください：
    1.    意外性（Surprise）：常識の逆をつく／想定外の展開
    2.    緊急性（Urgency）：今すぐ知るべき／時間や期限を意識させる
    3.    自己投影（Identity）：読者が「自分のことだ」と感じる視点
    4.    数字・ロジック（Clarity）：データや具体性による説得力
    5.    問い・未完性（Tension）：答えが知りたくなる問いかけ／途中で止める余白

⸻

【角度】

●上記のフックを活かし、以下の観点をもとに"独自の切り口"を3つ構想してください：
    •    世の流れに対して"逆張りする"視点
    •    当事者や専門家の"リアルな声"に基づく分析
    •    個人的な体験や人間関係を起点とした"ストーリー型"
    •    背景や構造を解きほぐす"わかりやすい解説型"
    •    今後の動きや波及効果を読む"予測・考察型"
    •    見えづらい部分に焦点を当てる"舞台裏や裏話的視点"
    •    過去の出来事との"比較や参照"による構造的視点
    •    誤解や常識を覆す"神話破壊型"
    •    具体例を深堀りする"ケーススタディ型"
    •    統計やグラフで語る"データ駆動型"
    •    社会的課題を浮き彫りにする"問題提起型"
    •    実用的なヒントを提供する"ライフハック型"

⸻

【投稿構造】

●下記の流れに沿って、1投稿を構成してください：
    1.    オープニングフック
　👉 興味を引く最初の一文（驚き・問い・逆説 など）
　例：「たった1つの工夫で、仕事が3倍速くなるとしたら？」
    2.    背景／問題提起（Why）
　👉 なぜその話が今重要なのか／どんな課題を扱うのか
　例：「多くの人が、"情報に振り回される働き方"をしている」
    3.    具体的な中身（What/How）
　👉 ノウハウ・体験談・数字・ストーリーなど。箇条書きでも可
　例：「ぼくが試したのは、"朝10分だけの○○習慣"」
    4.    まとめ・内省・共感（So What）
　👉 読者に問いかける／共感を引き出す／価値づけする
　例：「大切なのは、ツールじゃなく"使い方"だった」
    5.    CTA（行動のきっかけ）
　👉 コメント・RT・保存・プロフィール誘導など
　例：「あなたの習慣術、よかったら教えてください」

⸻

【ビジュアル案】

●投稿の印象を高める画像や動画の方向性を提案してください。例：
    •    グラフや数字を強調したインフォグラフィック
    •    before→afterで変化が伝わる2枚比較画像
    •    感情に訴える写真（顔・手・空・紙などの抽象）
    •    手書き風の図解
    •    モノローグ系の静かな動画

⸻

【投稿タイミング】

●ターゲット層に合わせて、最適な投稿時間帯と曜日を提示してください。例：
    •    平日夜（21時〜23時）
    •    日曜夕方（「明日から」モードを活用）
    •    月曜朝（モチベーション系に強い）

【角度の組み合わせルール】
- 各コンセプトは異なる角度を使用すること
- 2-3個の角度を組み合わせる場合は、相乗効果を狙うこと
- 同じ角度の組み合わせを繰り返さないこと

また、構想したコンセプトが一目で分かるよう、各コンセプトに20文字以内のタイトルを付けてください。

構想したコンセプトにふさわしいのは単独投稿かツリー投稿かも指示してください。
- single: 単独投稿（140文字以内で完結）
- thread: ツリー投稿（複数の投稿で詳細に展開）

必ず以下のJSON形式で3つのコンセプトを出力してください：
[
  {
    "conceptId": "topic${topicIndex + 1}_concept1",
    "conceptTitle": "コンセプトのタイトル（20文字以内）",
    "format": "single/threadのいずれか",
    "hookType": "使用したフックの種類",
    "hookCombination": ["組み合わせた場合のフックタイプ"],
    "angle": "メイン角度",
    "angleCombination": ["使用した角度の組み合わせ"],
    "angleRationale": "なぜこの角度/組み合わせが効果的か、なぜこの形式を選んだか",
    "viralScore": 85,
    "viralFactors": ["バズる要因1", "バズる要因2"],
    "structure": {
      "openingHook": "どのような驚きや問いかけで始めるか",
      "background": "どんな現状認識や問題意識を提示するか",
      "mainContent": "どんな事実・体験・分析を展開するか",
      "reflection": "どのような共感ポイントや価値づけをするか",
      "cta": "どんな行動を促すか（コメント・RT・保存など）"
    },
    "visual": "ビジュアル案",
    "timing": "投稿タイミング",
    "hashtags": ["関連ハッシュタグ"]
  },
  {
    "conceptId": "topic${topicIndex + 1}_concept2",
    "conceptTitle": "コンセプトのタイトル（20文字以内）",
    "format": "single/threadのいずれか",
    "hookType": "使用したフックの種類",
    "hookCombination": ["組み合わせた場合のフックタイプ"],
    "angle": "メイン角度",
    "angleCombination": ["使用した角度の組み合わせ"],
    "angleRationale": "なぜこの角度/組み合わせが効果的か、なぜこの形式を選んだか",
    "viralScore": 82,
    "viralFactors": ["バズる要因1", "バズる要因2"],
    "structure": {
      "openingHook": "どのような驚きや問いかけで始めるか",
      "background": "どんな現状認識や問題意識を提示するか",
      "mainContent": "どんな事実・体験・分析を展開するか",
      "reflection": "どのような共感ポイントや価値づけをするか",
      "cta": "どんな行動を促すか（コメント・RT・保存など）"
    },
    "visual": "ビジュアル案",
    "timing": "投稿タイミング",
    "hashtags": ["関連ハッシュタグ"]
  },
  {
    "conceptId": "topic${topicIndex + 1}_concept3",
    "conceptTitle": "コンセプトのタイトル（20文字以内）",
    "format": "single/threadのいずれか",
    "hookType": "使用したフックの種類",
    "hookCombination": ["組み合わせた場合のフックタイプ"],
    "angle": "メイン角度",
    "angleCombination": ["使用した角度の組み合わせ"],
    "angleRationale": "なぜこの角度/組み合わせが効果的か、なぜこの形式を選んだか",
    "viralScore": 88,
    "viralFactors": ["バズる要因1", "バズる要因2"],
    "structure": {
      "openingHook": "どのような驚きや問いかけで始めるか",
      "background": "どんな現状認識や問題意識を提示するか",
      "mainContent": "どんな事実・体験・分析を展開するか",
      "reflection": "どのような共感ポイントや価値づけをするか",
      "cta": "どんな行動を促すか（コメント・RT・保存など）"
    },
    "visual": "ビジュアル案",
    "timing": "投稿タイミング",
    "hashtags": ["関連ハッシュタグ"]
  }
]`
  
  try {
    console.log('📤 OpenAI APIを呼び出し中...')
    const startTime = Date.now()
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'JSON形式で正確に出力してください。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 3500
    })
    
    const endTime = Date.now()
    console.log(`✅ 応答受信（${(endTime - startTime) / 1000}秒）\n`)
    
    const content = response.choices[0].message.content || '[]'
    let concepts = []
    
    try {
      concepts = JSON.parse(content)
    } catch (e) {
      console.error('JSONパースエラー。コードブロックを探しています...')
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          concepts = JSON.parse(jsonMatch[0])
        } catch (e2) {
          console.error('❌ JSONパース失敗:', e2.message)
          console.log('生の応答:', content)
          return
        }
      }
    }
    
    console.log(`✅ ${concepts.length}個のコンセプトを生成しました\n`)
    
    // 結果の表示
    concepts.forEach((concept, i) => {
      console.log(`${'='.repeat(60)}`)
      console.log(`🎯 コンセプト${i + 1}: ${concept.conceptTitle || '❌ タイトルなし'}`)
      console.log(`${'='.repeat(60)}`)
      console.log(`📌 ID: ${concept.conceptId}`)
      console.log(`📝 形式: ${concept.format} ${concept.format === 'carousel' ? '⚠️ (廃止予定)' : '✅'}`)
      console.log(`🎣 フック: ${concept.hookType}`)
      if (concept.hookCombination?.length > 0) {
        console.log(`   組み合わせ: ${concept.hookCombination.join(' + ')}`)
      }
      console.log(`🎭 角度: ${concept.angle}`)
      if (concept.angleCombination?.length > 0) {
        console.log(`   組み合わせ: ${concept.angleCombination.join(' + ')}`)
      }
      console.log(`💡 理由: ${concept.angleRationale}`)
      console.log(`📊 バイラルスコア: ${concept.viralScore}`)
      console.log(`✨ バイラル要因: ${concept.viralFactors?.join(', ')}`)
      
      if (concept.structure) {
        console.log(`\n📋 投稿構造:`)
        console.log(`  1️⃣ オープニング: ${concept.structure.openingHook}`)
        console.log(`  2️⃣ 背景: ${concept.structure.background}`)
        console.log(`  3️⃣ 中身: ${concept.structure.mainContent}`)
        console.log(`  4️⃣ 内省: ${concept.structure.reflection}`)
        console.log(`  5️⃣ CTA: ${concept.structure.cta}`)
      }
      
      console.log(`\n🎨 ビジュアル: ${concept.visual}`)
      console.log(`⏰ タイミング: ${concept.timing}`)
      console.log(`#️⃣ ハッシュタグ: ${concept.hashtags?.join(' ')}`)
      console.log()
    })
    
    // 検証
    console.log('\n' + '='.repeat(60))
    console.log('📊 プロンプト改善の検証結果')
    console.log('='.repeat(60))
    
    const hasAllTitles = concepts.every(c => c.conceptTitle && c.conceptTitle.length > 0)
    console.log(`✅ conceptTitle: ${hasAllTitles ? '全て生成済み ✅' : '❌ 欠損あり'}`)
    
    const formats = [...new Set(concepts.map(c => c.format))]
    console.log(`✅ format種類: ${formats.join(', ')} ${formats.includes('carousel') ? '⚠️' : '✅'}`)
    
    const hasFormatRationale = concepts.every(c => 
      c.angleRationale && (c.angleRationale.includes('single') || c.angleRationale.includes('thread') || c.angleRationale.includes('投稿'))
    )
    console.log(`✅ 形式選択理由: ${hasFormatRationale ? '全て含まれている ✅' : '❌ 一部欠損'}`)
    
    const angles = [...new Set(concepts.map(c => c.angle))]
    console.log(`✅ 角度の多様性: ${angles.length}種類`)
    angles.forEach((angle, i) => console.log(`   ${i + 1}. ${angle}`))
    
    console.log('\n✨ テスト完了！')
    
  } catch (error) {
    console.error('❌ エラー:', error.message)
    console.error(error.stack)
  }
}

// 実行
testConceptGeneration()