// 投稿作成フローのテスト

// テスト用のコンテキストデータ
const testContext = {
  timeSlot: 'morning',
  title: '朝の投稿（7-9時）',
  trends: ['生成AIの普及とクリエイティブ業界への影響', '新たな職種とスキルの創出', '現実逃避とリアリティの融合'],
  buzzPrediction: 0.8,
  topNews: [
    {
      title: 'OpenAI、新しいGPT-5モデルを発表',
      summary: '大幅な性能向上を実現',
      keyPoints: ['推論能力の向上', 'マルチモーダル対応強化']
    }
  ],
  personalAngles: [
    {
      type: 'creative-paradox',
      angle: '効率化の流れに逆らって「非効率の美学」を語る',
      hook: '23年の映像制作で学んだ「回り道が新しい発見を生む」経験',
      postTemplate: 'みんなが効率化を語る中、あえて「無駄な手作業」の価値を語りたい'
    }
  ],
  rawAnalysis: '今日の分析結果...',
  recommendations: {
    immediateAction: [
      {
        action: '「生成AIの普及とクリエイティブ業界への影響」について独自視点で投稿',
        timeframe: '30分以内'
      }
    ]
  }
};

console.log('=== 投稿作成コンテキストのテスト ===\n');

// URLパラメータのエンコード（ブラウザと同じ処理）
const encodedContext = Buffer.from(encodeURIComponent(JSON.stringify(testContext))).toString('base64');
console.log('エンコード後の長さ:', encodedContext.length);

// デコードテスト
try {
  const decoded = JSON.parse(decodeURIComponent(Buffer.from(encodedContext, 'base64').toString()));
  console.log('\n✅ デコード成功');
  console.log('- トレンド数:', decoded.trends.length);
  console.log('- バズ予測:', decoded.buzzPrediction);
  console.log('- パーソナル視点:', decoded.personalAngles.length);
  console.log('- 推奨アクション:', decoded.recommendations.immediateAction.length);
} catch (error) {
  console.log('\n❌ デコードエラー:', error.message);
}

console.log('\n=== コンテキストデータの確認 ===');
console.log('トレンド:', testContext.trends);
console.log('バズ予測スコア:', testContext.buzzPrediction);
console.log('パーソナル視点[0]:', testContext.personalAngles[0].angle);
console.log('推奨アクション[0]:', testContext.recommendations.immediateAction[0].action);