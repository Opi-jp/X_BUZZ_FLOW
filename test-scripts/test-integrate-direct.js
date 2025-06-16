// INTEGRATEステップを直接テストするスクリプト
const { PrismaClient } = require('./app/generated/prisma');

const prisma = new PrismaClient();

// Phase 1のINTEGRATEプロンプトを直接定義
const integratePrompt = `
# ユーザー設定
* 発信したい分野: {expertise}
* コンテンツのスタイル: {style}
* プラットフォーム: {platform}

# 収集した検索結果
{searchResults}

# 収集した情報の分類視点

### A：現在の出来事の分析
- 最新ニュース
- 有名人の事件と世間の反応
- 議論が巻きおこるような政治的展開

### B：テクノロジーの発表とテクノロジードラマ
- ビジネスニュースと企業論争
- 文化的瞬間と社会運動
- スポーツイベントと予想外の結果
- インターネットドラマとプラットフォーム論争

### C：ソーシャルリスニング研究
- Twitterのトレンドトピックとハッシュタグの速度
- TikTokサウンドとチャレンジの出現
- Redditのホットな投稿とコメントの感情
- Googleトレンドの急上昇パターン
- YouTubeトレンド動画分析
- ニュース記事のコメント欄
- ソーシャルメディアのエンゲージメントパターン

### D：バイラルパターン認識
バイラルが起きる可能性があるトピックを特定する:
- 論争レベル（強い意見を生み出す）
- 感情の強さ（怒り、喜び、驚き、憤慨）
- 共感性要因（多くの人に影響を与える）
- 共有可能性（人々が広めたいと思うこと）
- タイミングの敏感さ（関連性のウィンドウが狭い）
- プラットフォーム調整（{platform}文化に適合）

# タスク
上記の調査結果をもとに、バイラルパターン認識を行い、バズる可能性のあるトピックを特定してください。
`;

function interpolatePrompt(template, context) {
  return template.replace(/{(\w+)}/g, (match, key) => {
    if (key === 'searchResults' && context.searchResults) {
      return formatSearchResults(context.searchResults);
    }
    const value = context[key];
    if (value && typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return value || match;
  });
}

function formatSearchResults(results) {
  return results.map((result, index) => {
    return `
## 検索結果 ${index + 1}
質問: ${result.question || result.query}
カテゴリ: ${result.category}
戦略的意図: ${result.strategicIntent}
バイラル角度: ${result.viralAngle}

### 分析内容
${result.analysis || result.rawResponse}
`;
  }).join('\n\n');
}

async function testIntegrate() {
  const sessionId = '2cf500f3-2ece-4961-a7f5-dc3ef011ae38';
  
  try {
    // セッションを取得
    const session = await prisma.cotSession.findUnique({
      where: { id: sessionId }
    });
    
    if (!session) {
      console.error('Session not found');
      return;
    }
    
    console.log('Session found:');
    console.log('- expertise:', session.expertise);
    console.log('- style:', session.style);
    console.log('- platform:', session.platform);
    
    // Phase 1のデータを取得
    const phase = await prisma.cotPhase.findUnique({
      where: {
        sessionId_phaseNumber: {
          sessionId,
          phaseNumber: 1
        }
      }
    });
    
    if (!phase || !phase.executeResult) {
      console.error('Phase 1 execute result not found');
      return;
    }
    
    const executeResult = phase.executeResult;
    const thinkResult = phase.thinkResult || {};
    
    // INTEGRATEのコンテキストを構築
    const baseContext = {
      expertise: session.expertise,
      style: session.style,
      platform: session.platform,
      userConfig: {
        expertise: session.expertise,
        style: session.style,
        platform: session.platform
      }
    };
    
    const integrateContext = {
      ...baseContext,
      ...thinkResult,
      ...executeResult
    };
    
    console.log('\nContext keys:', Object.keys(integrateContext));
    console.log('- expertise in context:', integrateContext.expertise);
    console.log('- searchResults count:', integrateContext.searchResults?.length);
    
    // プロンプトを生成
    const prompt = interpolatePrompt(integratePrompt, integrateContext);
    
    console.log('\nPrompt preview (first 500 chars):');
    console.log(prompt.substring(0, 500));
    console.log('...');
    console.log('\nPrompt length:', prompt.length, 'characters');
    
    // expertiseが正しく置換されているか確認
    if (prompt.includes('{expertise}')) {
      console.error('\n❌ ERROR: {expertise} was not replaced in the prompt!');
      console.log('Context expertise value:', integrateContext.expertise);
    } else {
      console.log('\n✅ {expertise} was successfully replaced');
    }
    
    // 他のプレースホルダーも確認
    const placeholders = prompt.match(/{(\w+)}/g);
    if (placeholders) {
      console.log('\n⚠️  Unreplaced placeholders found:', placeholders);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testIntegrate();