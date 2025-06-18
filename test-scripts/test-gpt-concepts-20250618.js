#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });

const fs = require('fs').promises;
const path = require('path');

async function testGPTConcepts() {
  try {
    // モックデータを読み込む
    const mockDataPath = path.join(process.cwd(), 'lib/prompts/mock-data/perplexity/ai-work-20250618.json');
    const mockData = JSON.parse(await fs.readFile(mockDataPath, 'utf-8'));
    
    // GPTプロンプトを読み込む
    const promptPath = path.join(process.cwd(), 'lib/prompts/gpt/generate-concepts.txt');
    let promptTemplate = await fs.readFile(promptPath, 'utf-8');
    
    // 最初のトピックを使用
    const topic = mockData.response.topics[0];
    const variables = {
      platform: mockData.variables.platform,
      style: mockData.variables.style,
      topicTitle: topic.TOPIC,
      topicAnalysis: topic.perplexityAnalysis,
      topicUrl: topic.url,
      topicIndex: 0
    };
    
    // 変数を置換
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
      promptTemplate = promptTemplate.replace(regex, String(value));
    });
    
    console.log('📊 使用するトピック:');
    console.log('─'.repeat(80));
    console.log(`タイトル: ${topic.TOPIC}`);
    console.log(`記事: ${topic.title}`);
    console.log(`要約: ${topic.summary.substring(0, 100)}...`);
    console.log(`分析: ${topic.perplexityAnalysis}`);
    console.log('─'.repeat(80));
    
    // OpenAI API呼び出し
    console.log('\n🔄 OpenAI GPT-4を呼び出し中...\n');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'あなたはバイラルコンテンツの専門家です。与えられたトピックから、バズる投稿コンセプトを作成してください。'
          },
          {
            role: 'user',
            content: promptTemplate
          }
        ],
        temperature: 0.8,
        max_tokens: 4000
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('❌ OpenAI APIエラー:', error);
      return;
    }
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // コンセプトを抽出
    let concepts = [];
    try {
      // JSONブロックを探す
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        concepts = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('JSONパースエラー:', e.message);
      console.log('生の応答:', content);
    }
    
    console.log(`✅ 生成されたコンセプト数: ${concepts.length}\n`);
    
    // コンセプトを表示
    concepts.forEach((concept, index) => {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`💡 コンセプト${index + 1}: ${concept.conceptTitle}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📝 形式: ${concept.format === 'single' ? '単独投稿' : 'ツリー投稿'}`);
      console.log(`🎯 フック: ${concept.hookType}`);
      if (concept.hookCombination?.length > 0) {
        console.log(`   組み合わせ: ${concept.hookCombination.join('、')}`);
      }
      console.log(`📐 角度: ${concept.angle}`);
      if (concept.angleCombination?.length > 0) {
        console.log(`   組み合わせ: ${concept.angleCombination.join('、')}`);
      }
      console.log(`💬 角度の理由: ${concept.angleRationale}`);
      console.log(`🔥 バイラルスコア: ${concept.viralScore}/100`);
      console.log(`✨ バズ要因: ${concept.viralFactors.join('、')}`);
      
      console.log('\n📋 投稿構造:');
      console.log(`  フック: ${concept.structure.openingHook}`);
      console.log(`  背景: ${concept.structure.background}`);
      console.log(`  メイン: ${concept.structure.mainContent}`);
      console.log(`  振り返り: ${concept.structure.reflection}`);
      console.log(`  CTA: ${concept.structure.cta}`);
      
      console.log(`\n🖼️  ビジュアル: ${concept.visual}`);
      console.log(`⏰ タイミング: ${concept.timing}`);
      console.log(`#️⃣  ハッシュタグ: ${concept.hashtags.join(' ')}`);
      console.log('');
    });
    
    // 品質チェック
    console.log('📋 品質チェック:');
    const checks = {
      '3つのコンセプトが生成': concepts.length === 3,
      '異なる角度を使用': new Set(concepts.map(c => c.angle)).size === 3,
      'structure完備': concepts.every(c => c.structure && Object.keys(c.structure).length === 5),
      'バイラルスコア適正': concepts.every(c => c.viralScore >= 70 && c.viralScore <= 100),
      'conceptId正しい': concepts.every((c, i) => c.conceptId === `topic0_concept${i + 1}`)
    };
    
    Object.entries(checks).forEach(([check, result]) => {
      console.log(`${result ? '✅' : '❌'} ${check}`);
    });
    
  } catch (error) {
    console.error('エラー:', error);
  }
}

testGPTConcepts();