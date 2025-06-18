#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });

const fs = require('fs').promises;
const path = require('path');

async function testGPTv3() {
  try {
    // モックデータを読み込む
    const mockDataPath = path.join(process.cwd(), 'lib/prompts/mock-data/perplexity/ai-work-20250618.json');
    const mockData = JSON.parse(await fs.readFile(mockDataPath, 'utf-8'));
    
    // GPT v3プロンプトを読み込む
    const promptPath = path.join(process.cwd(), 'lib/prompts/gpt/generate-concepts-v3.txt');
    let promptTemplate = await fs.readFile(promptPath, 'utf-8');
    
    // 最初のトピックを使用
    const topic = mockData.response.topics[0];
    const variables = {
      platform: mockData.variables.platform,
      style: mockData.variables.style,
      topicTitle: topic.TOPIC,
      topicSource: topic.source,
      topicDate: topic.date,
      topicUrl: topic.url,
      topicSummary: topic.summary,
      topicKeyPoints: topic.keyPoints.map((point, i) => `${i + 1}. ${point}`).join('\n'),
      topicAnalysis: topic.perplexityAnalysis,
      topicIndex: 1
    };
    
    // 変数を置換
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
      promptTemplate = promptTemplate.replace(regex, String(value));
    });
    
    console.log('🔄 Version 3テスト: OpenAI GPT-4を呼び出し中...\n');
    
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
            content: 'あなたはバイラルコンテンツの専門家です。与えられた詳細な記事情報から、深い洞察に基づいたバズる投稿コンセプトを作成してください。'
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
    
    // 生の応答を表示
    console.log('📝 GPT Version 3の生の応答:');
    console.log('─'.repeat(80));
    console.log(content);
    console.log('─'.repeat(80));
    
    // 各コンセプトを抽出して確認（コードブロックに対応）
    const conceptAMatch = content.match(/【コンセプトA】\s*(?:```json\s*)?(\{[\s\S]*?\})\s*(?:```\s*)?(?=【コンセプトB】)/);
    const conceptBMatch = content.match(/【コンセプトB】\s*(?:```json\s*)?(\{[\s\S]*?\})\s*(?:```\s*)?(?=【コンセプトC】)/);
    const conceptCMatch = content.match(/【コンセプトC】\s*(?:```json\s*)?(\{[\s\S]*?\})\s*(?:```\s*)?$/m);
    
    console.log('\n🔍 コンセプト抽出結果:');
    console.log(`コンセプトA: ${conceptAMatch ? '✅ 検出' : '❌ 未検出'}`);
    console.log(`コンセプトB: ${conceptBMatch ? '✅ 検出' : '❌ 未検出'}`);
    console.log(`コンセプトC: ${conceptCMatch ? '✅ 検出' : '❌ 未検出'}`);
    
    // 各コンセプトの内容を確認
    if (conceptAMatch) {
      try {
        const conceptA = JSON.parse(conceptAMatch[1]);
        console.log('\n📊 コンセプトAの構造:');
        console.log(`タイトル: ${conceptA.conceptTitle}`);
        console.log(`フック: ${conceptA.hookType}`);
        console.log(`角度: ${conceptA.angle}`);
        console.log(`mainContent文字数: ${conceptA.structure.mainContent.length}`);
      } catch (e) {
        console.error('コンセプトAのパースエラー:', e.message);
      }
    }
    
  } catch (error) {
    console.error('エラー:', error);
  }
}

testGPTv3();