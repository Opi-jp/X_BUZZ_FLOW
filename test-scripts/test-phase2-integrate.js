// Phase 2 INTEGRATEを手動で実行するスクリプト
const { PrismaClient } = require('./app/generated/prisma');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// orchestrated-cot-strategy.tsからPhase2Strategyを読み込む
const strategyContent = fs.readFileSync(path.join(__dirname, 'lib/orchestrated-cot-strategy.ts'), 'utf8');
// Phase2Strategyのintegrateプロンプトを探す
const phase2Start = strategyContent.indexOf('export const Phase2Strategy');
const phase2End = strategyContent.indexOf('export const Phase3Strategy');
const phase2Content = strategyContent.substring(phase2Start, phase2End);
const integrateMatch = phase2Content.match(/integrate:\s*{[\s\S]*?prompt:\s*`([\s\S]*?)`,/);
const integratePrompt = integrateMatch ? integrateMatch[1] : '';

async function manualPhase2Integrate() {
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
    
    // Phase 2のデータを取得
    const phase2 = await prisma.cotPhase.findUnique({
      where: {
        sessionId_phaseNumber: {
          sessionId,
          phaseNumber: 2
        }
      }
    });
    
    if (!phase2 || !phase2.executeResult) {
      console.error('Phase 2 execute result not found');
      return;
    }
    
    console.log('\nPhase 2 data loaded');
    console.log('- Think result exists:', !!phase2.thinkResult);
    console.log('- Execute result exists:', !!phase2.executeResult);
    
    const executeResult = phase2.executeResult;
    const thinkResult = phase2.thinkResult;
    
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
    console.log('Context.opportunities length:', context.opportunities?.length);
    
    // プロンプトを構築
    const prompt = integratePrompt.replace(/{(\w+)}/g, (match, key) => {
      if (key === 'opportunities' && context.opportunities) {
        return context.opportunities.map((opp, i) => 
          `${i + 1}. ${opp.topic}
   ウイルス速度スコア: ${opp.viralVelocity?.overallScore || 'N/A'}
   推奨アプローチ: ${opp.recommendedApproach}
   コンテンツアングル: ${opp.contentAngles?.map(a => a.type).join(', ')}`
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
      max_tokens: 2000,
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
          phaseNumber: 2
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
    
    // セッションを更新（Phase 3へ）
    await prisma.cotSession.update({
      where: { id: sessionId },
      data: {
        currentPhase: 3,
        currentStep: 'THINK',
        status: 'PENDING',
        totalTokens: session.totalTokens + (completion.usage?.total_tokens || 0)
      }
    });
    
    console.log('\n✅ Phase 2 INTEGRATE completed successfully!');
    console.log('Next phase: 3, Next step: THINK');
    
    if (result.finalSelection) {
      console.log(`\n📊 Selected ${result.finalSelection.topOpportunities?.length} opportunities`);
      result.finalSelection.topOpportunities?.forEach((opp, i) => {
        console.log(`\n${opp.rank}. ${opp.topic}`);
        console.log(`   理由: ${opp.reason}`);
        console.log(`   スコア: ${opp.viralScore}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

manualPhase2Integrate();