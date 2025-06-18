#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });

const fs = require('fs').promises;
const path = require('path');

async function testGPTRawResponse() {
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
      topicSource: topic.source,
      topicDate: topic.date,
      topicUrl: topic.url,
      topicSummary: topic.summary,
      topicKeyPoints: topic.keyPoints.map((point, i) => `${i + 1}. ${point}`).join('\n'),
      topicAnalysis: topic.perplexityAnalysis,
      topicIndex: 0
    };
    
    // 変数を置換
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
      promptTemplate = promptTemplate.replace(regex, String(value));
    });
    
    // OpenAI API呼び出し
    console.log('🔄 OpenAI GPT-4を呼び出し中...\n');
    
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
    console.log('📝 GPTの生の応答:');
    console.log('─'.repeat(80));
    console.log(content);
    console.log('─'.repeat(80));
    
    // 最初のコンセプトのmainContentを詳しく確認
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const concepts = JSON.parse(jsonMatch[0]);
        if (concepts.length > 0) {
          console.log('\n🔍 最初のコンセプトのmainContent詳細:');
          console.log(concepts[0].structure.mainContent);
          console.log(`文字数: ${concepts[0].structure.mainContent.length}`);
        }
      }
    } catch (e) {
      console.error('JSONパースエラー:', e.message);
    }
    
  } catch (error) {
    console.error('エラー:', error);
  }
}

testGPTRawResponse();