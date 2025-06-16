// Phase 1 INTEGRATEを手動で実行するスクリプト
const { PrismaClient } = require('./app/generated/prisma');
const OpenAI = require('openai');

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function manualIntegrate() {
  const sessionId = 'd2cf059f-b26a-40cd-aba4-c4ed6fa47437';
  
  try {
    // セッションを取得
    const session = await prisma.cotSession.findUnique({
      where: { id: sessionId }
    });
    
    if (!session) {
      console.error('Session not found');
      return;
    }
    
    console.log('Session:', {
      id: session.id,
      expertise: session.expertise,
      style: session.style,
      platform: session.platform,
      status: session.status
    });
    
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
    
    console.log('\nPhase 1 data loaded');
    console.log('- Think result exists:', !!phase.thinkResult);
    console.log('- Execute result exists:', !!phase.executeResult);
    console.log('- Execute result size:', JSON.stringify(phase.executeResult).length, 'bytes');
    
    // セッションをINTEGRATINGに更新
    await prisma.cotSession.update({
      where: { id: sessionId },
      data: {
        status: 'INTEGRATING',
        currentStep: 'INTEGRATE'
      }
    });
    
    console.log('\nStarting INTEGRATE step...');
    
    // INTEGRATEのプロンプトを構築
    const integratePrompt = `
# ユーザー設定
* 発信したい分野: ${session.expertise}
* コンテンツのスタイル: ${session.style}
* プラットフォーム: ${session.platform}

# 収集した検索結果
${formatSearchResults(phase.executeResult.searchResults)}

# タスク
上記の調査結果をもとに、バイラルパターン認識を行い、バズる可能性のあるトピックを特定してください。

必ず以下のJSON形式で出力してください：
{
  "trendedTopics": [
    {
      "topic": "トピック名",
      "category": "カテゴリ",
      "viralPotential": {
        "controversyLevel": "高/中/低",
        "emotionalIntensity": "高/中/低",
        "relatabilityFactor": "高/中/低",
        "shareability": "高/中/低",
        "timingSensitivity": "高/中/低",
        "platformAlignment": "高/中/低"
      },
      "keyInsights": ["洞察1", "洞察2", "洞察3"],
      "newsSource": "ニュースソース",
      "sourceUrl": "URL"
    }
  ]
}`;

    console.log('\nPrompt length:', integratePrompt.length, 'characters');
    
    // OpenAI APIを呼び出し
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { 
          role: 'system', 
          content: 'あなたはバズるコンテンツ戦略家です。収集された情報を分析し、バイラルポテンシャルの高いトピックを特定してください。必ずJSON形式で回答してください。'
        },
        { role: 'user', content: integratePrompt }
      ],
      temperature: 0.5,
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    });
    
    console.log('\nOpenAI response received');
    console.log('- Tokens used:', completion.usage?.total_tokens);
    
    const result = JSON.parse(completion.choices[0].message.content || '{}');
    console.log('- Topics found:', result.trendedTopics?.length || 0);
    
    // 結果をDBに保存
    await prisma.cotPhase.update({
      where: {
        sessionId_phaseNumber: {
          sessionId,
          phaseNumber: 1
        }
      },
      data: {
        integratePrompt,
        integrateResult: result,
        integrateTokens: completion.usage?.total_tokens || 0,
        integrateAt: new Date(),
        status: 'COMPLETED'
      }
    });
    
    // セッションを更新
    await prisma.cotSession.update({
      where: { id: sessionId },
      data: {
        status: 'PENDING',
        currentPhase: 2,
        currentStep: 'THINK',
        totalTokens: (session.totalTokens || 0) + (completion.usage?.total_tokens || 0)
      }
    });
    
    console.log('\n✅ INTEGRATE completed successfully!');
    console.log('Next: Phase 2 - THINK');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    
    // エラーの場合はセッションをFAILEDに
    await prisma.cotSession.update({
      where: { id: sessionId },
      data: {
        status: 'FAILED',
        lastError: error.message
      }
    }).catch(() => {});
    
  } finally {
    await prisma.$disconnect();
  }
}

function formatSearchResults(results) {
  if (!results || !Array.isArray(results)) return '検索結果がありません';
  
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

manualIntegrate();