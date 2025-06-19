#!/usr/bin/env node

/**
 * Perplexityパーサーのテスト
 * 作成日: 2025-01-19
 */

const { PerplexityResponseParser } = require('../lib/parsers/perplexity-response-parser');

// テスト用のサンプルデータ（実際のPerplexityレスポンスの一部）
const sampleResponse = `### トピック1: サム・アルトマンのAI予測と社会への影響

\`\`\`
{
  "TOPIC": "AI予測と社会変化",
  "title": "The AI Prediction Sam Altman Says He Didn't Get Quite Right",
  "source": "Business Insider",
  "url": "https://www.businessinsider.com/sam-altman-expected-society-look-different-chatgpt-prediction-2025-6",
  "date": "2025-06-18",
  "summary": "OpenAIのCEO、サム・アルトマンは、ChatGPTが現在の能力に達した後、社会が大幅に変化することを予測していた。しかし、現実にはそれほど大きな変化は見られていない。アルトマンは、AI技術がビジネスに影響を与えている一方で、その潜在的な未来的な変化に対する社会の反応が予想よりも鈍いと感じている。彼は、AIが現在は「コ・パイロット」の役割を果たしているが、将来的に自律的に動作する能力を持つと、特に科学分野で大きな変化をもたらす可能性があると指摘している。例えば、科学者がAIを使用することで3倍の生産性を上げることができ、将来的にはAIが独自に新しい物理学を発見することも期待されている[1].",
  "keyPoints": [
    "サム・アルトマンのAI予測と現実のギャップ",
    "AIのビジネスへの影響",
    "自律的なAIの潜在的な変化",
    "科学分野でのAIの利用",
    "将来的に予想される社会的変化"
  ],
  "perplexityAnalysis": "このニュースは、AIの未来予測と現実のギャップが強い感情的な反応を引き起こすためバズる可能性が高い。特に、AIの自律性とその潜在的な社会的影響についての議論が、賛成派と反対派の対立を引き起こし、多くの人が共感できる体験談や驚きの事実を提供する。さらに、AI技術の進化が今後の社会に与える影響についてのタイムリーな話題であるため、シェアされやすい[1].",
  "additionalSources": [
    {
      "url": "https://radicaldatascience.wordpress.com/2025/06/18/ai-news-briefs-bulletin-board-for-june-2025/",
      "title": "AI News Briefs BULLETIN BOARD for June 2025",
      "source": "Radical Data Science",
      "date": "2025-06-18"
    }
  ]
}
\`\`\``;

console.log('🧪 Perplexityパーサーテスト');
console.log('================================\n');

try {
  console.log('📝 テスト入力:');
  console.log(sampleResponse.substring(0, 200) + '...\n');
  
  console.log('🔍 パース実行中...');
  const topics = PerplexityResponseParser.parseTopics(sampleResponse);
  
  console.log('✅ パース成功!');
  console.log(`📊 見つかったトピック数: ${topics.length}`);
  
  topics.forEach((topic, index) => {
    console.log(`\n📌 トピック ${index + 1}:`);
    console.log(`  - TOPIC: ${topic.TOPIC}`);
    console.log(`  - title: ${topic.title}`);
    console.log(`  - source: ${topic.source}`);
    console.log(`  - keyPoints: ${topic.keyPoints.length}個`);
    console.log(`  - summary文字数: ${topic.summary.length}`);
    console.log(`  - perplexityAnalysis文字数: ${topic.perplexityAnalysis.length}`);
  });
  
} catch (error) {
  console.error('❌ パースエラー:', error.message);
  console.error('スタックトレース:', error.stack);
}