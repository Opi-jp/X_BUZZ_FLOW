#!/usr/bin/env node

/**
 * ガイドセクションでの変数使用の問題を実証するテストスクリプト
 * 
 * 作成日: 2025-06-18
 * 目的: 「視点」と「検索条件」の違いを具体的に示す
 */

const mockPerplexityAPI = async (prompt) => {
  console.log('\n🤖 Perplexityへのプロンプト:')
  console.log('-'.repeat(80))
  console.log(prompt)
  console.log('-'.repeat(80))
  
  // プロンプトから問題のあるパターンを検出
  const hasThemePart1 = prompt.includes('${theme_part1}')
  const hasSearchVerb = prompt.match(/探す|検索|収集/)
  
  if (hasThemePart1) {
    console.log('\n❌ 問題: theme_part1/theme_part2の使用を検出')
    console.log('   → LLMは「AIについて探す」と「働き方について探す」を別々に検索')
    console.log('   → 本来は「AIと働き方」の交差点にある情報が欲しいのに！')
  }
  
  if (hasSearchVerb && prompt.includes('${')) {
    console.log('\n⚠️  警告: 「探す」と変数の組み合わせを検出')
    console.log('   → 具体的な検索条件になってしまい、創造性が制限される')
  }
  
  console.log('\n📊 シミュレーション結果:')
  
  // 問題のあるプロンプトの場合
  if (hasThemePart1) {
    return {
      topics: [
        { title: 'OpenAIの最新モデル発表', category: 'AI単体' },
        { title: 'リモートワーク疲れの対策', category: '働き方単体' },
        { title: 'ChatGPTの使い方10選', category: 'AI単体' }
      ],
      problem: '「AIと働き方」の交差点ではなく、それぞれ別々のトピック'
    }
  }
  
  // 良いプロンプトの場合
  return {
    topics: [
      { title: 'AI導入で残業ゼロを実現した企業の衝撃', category: 'AI×働き方' },
      { title: 'ChatGPT活用で年収2倍になったフリーランサー', category: 'AI×働き方' },
      { title: 'AIに仕事を奪われた人が見つけた新しい生き方', category: 'AI×働き方' }
    ],
    success: '視点として捉えることで、交差点の情報を発見'
  }
}

// テスト実行
async function runTest() {
  console.log('🧪 ガイドセクションでの変数使用テスト\n')
  
  // 問題のあるプロンプト（現在の実装）
  const badPrompt = `
【AIと働き方】について発信するためのトピックを探してください。

A：現在の出来事の分析
- \${theme_part1}と\${theme_part2}に関する政治的議論
- \${theme_part1}導入を巡る企業の対立

C：ソーシャルリスニング
- TikTokで話題の\${theme_part1}関連のサウンド
`

  console.log('❌ 問題のあるプロンプト例:')
  const badResult = await mockPerplexityAPI(badPrompt.replace(/\${theme_part1}/g, 'AI').replace(/\${theme_part2}/g, '働き方'))
  console.log(JSON.stringify(badResult, null, 2))
  
  // 良いプロンプト（修正版）
  const goodPrompt = `
【AIと働き方】について発信するためのトピックを探してください。

以下の視点でトレンド情報を収集・分析してください：

A：現在の出来事の分析
- 技術と社会の交差点で起きている政治的議論
- 新技術導入を巡る企業文化の衝突
- 従来の価値観と新しい価値観の対立

C：ソーシャルリスニング  
- TikTokで話題になっている仕事や生活スタイルの変化
- 技術がもたらす予想外の使い方や文化
`

  console.log('\n\n✅ 良いプロンプト例:')
  const goodResult = await mockPerplexityAPI(goodPrompt)
  console.log(JSON.stringify(goodResult, null, 2))
  
  console.log('\n\n💡 重要な学び:')
  console.log('1. ガイドセクションは「どんな視点で見るか」を示すもの')
  console.log('2. 変数を入れると「何を探すか」になってしまう')
  console.log('3. 視点 = 創造的な発見を促す')
  console.log('4. 検索条件 = 限定的な結果しか得られない')
}

runTest().catch(console.error)