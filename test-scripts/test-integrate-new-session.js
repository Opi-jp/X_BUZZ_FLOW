// Phase 1 INTEGRATEを手動で実行するスクリプト
const { PrismaClient } = require('./app/generated/prisma');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// orchestrated-cot-strategy.tsからPhase1Strategyを読み込む
const strategyContent = fs.readFileSync(path.join(__dirname, 'lib/orchestrated-cot-strategy.ts'), 'utf8');
const integratePromptMatch = strategyContent.match(/integrate:\s*{[\s\S]*?prompt:\s*`([\s\S]*?)`,/);
const integratePrompt = integratePromptMatch ? integratePromptMatch[1] : '';

async function manualIntegrate() {
  const sessionId = '3abdb3e4-9031-4f5b-9419-845fb93a80ed';
  
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
    
    const executeResult = phase.executeResult;
    const thinkResult = phase.thinkResult;
    
    // コンテキストを構築
    const context = {
      expertise: session.expertise,
      style: session.style,
      platform: session.platform,
      userConfig: {
        expertise: session.expertise,
        style: session.style,
        platform: session.platform
      },
      ...thinkResult,
      ...executeResult
    };
    
    console.log('\nContext keys:', Object.keys(context));
    console.log('Context.expertise:', context.expertise);
    console.log('Context.searchResults length:', context.searchResults?.length);
    
    // プロンプトを構築
    const prompt = integratePrompt.replace(/{(\w+)}/g, (match, key) => {
      if (key === 'searchResults' && context.searchResults) {
        return context.searchResults.map((r, i) => 
          `${i + 1}. ${r.question}
   分析: ${r.analysis?.substring(0, 500)}...
   戦略的意図: ${r.strategicIntent}
   バイラル角度: ${r.viralAngle}`
        ).join('\n\n');
      }
      const value = context[key];
      if (value && typeof value === 'object') {
        return JSON.stringify(value, null, 2);
      }
      return value || match;
    });
    
    console.log('\nPrompt length:', prompt.length);
    console.log('\nSending request to OpenAI...');
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { 
          role: 'system', 
          content: 'あなたは、新たなトレンドを特定し、流行の波がピークに達する前にその波に乗るコンテンツのコンセプトを作成するバズるコンテンツ戦略家です。' 
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.5,
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    });
    
    console.log('Response received - Tokens used:', completion.usage?.total_tokens);
    
    const result = JSON.parse(completion.choices[0].message.content || '{}');
    console.log('\nIntegrate result keys:', Object.keys(result));
    
    // DBに保存
    await prisma.cotPhase.update({
      where: {
        sessionId_phaseNumber: {
          sessionId,
          phaseNumber: 1
        }
      },
      data: {
        integratePrompt: prompt,
        integrateResult: result,
        integrateTokens: completion.usage?.total_tokens || 0,
        integrateAt: new Date(),
        status: 'COMPLETED'
      }
    });
    
    // セッションを更新（Phase 2へ）
    await prisma.cotSession.update({
      where: { id: sessionId },
      data: {
        currentPhase: 2,
        currentStep: 'THINK',
        status: 'PENDING',
        totalTokens: session.totalTokens + (completion.usage?.total_tokens || 0)
      }
    });
    
    console.log('\n✅ Phase 1 INTEGRATE completed successfully!');
    console.log('Next phase: 2, Next step: THINK');
    
    if (result.trendedTopics) {
      console.log(`\n📊 Identified ${result.trendedTopics.length} trended topics`);
      result.trendedTopics.forEach((topic, i) => {
        console.log(`\n${i + 1}. ${topic.topicName}`);
        console.log(`   カテゴリ: ${topic.category}`);
        console.log(`   概要: ${topic.summary?.substring(0, 100)}...`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

manualIntegrate();