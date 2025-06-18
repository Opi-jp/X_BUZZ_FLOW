#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });

const fs = require('fs').promises;
const path = require('path');

async function testGPTConceptsImproved() {
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
    
    console.log('📊 改善版：使用するトピック情報:');
    console.log('─'.repeat(80));
    console.log(`タイトル: ${topic.TOPIC}`);
    console.log(`メディア: ${topic.source}`);
    console.log(`公開日: ${topic.date}`);
    console.log(`\n📄 要約 (${topic.summary.length}文字):`);
    console.log(topic.summary);
    console.log(`\n📌 重要ポイント:`);
    topic.keyPoints.forEach((point, i) => {
      console.log(`  ${i + 1}. ${point}`);
    });
    console.log(`\n💡 バズ分析:`);
    console.log(topic.perplexityAnalysis);
    console.log('─'.repeat(80));
    
    // OpenAI API呼び出し
    console.log('\n🔄 OpenAI GPT-4を呼び出し中（改善版）...\n');
    
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
    
    // コンセプトを抽出
    let concepts = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        concepts = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('JSONパースエラー:', e.message);
    }
    
    console.log(`✅ 生成されたコンセプト数: ${concepts.length}\n`);
    
    // コンセプトを表示（改善点に注目）
    concepts.forEach((concept, index) => {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`💡 コンセプト${index + 1}: ${concept.conceptTitle}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      
      // 記事の具体的な内容への言及をチェック
      const referencesKeyPoints = concept.structure.mainContent.includes('半数') || 
                                 concept.structure.mainContent.includes('10%から20%') ||
                                 concept.structure.mainContent.includes('5年');
      
      if (referencesKeyPoints) {
        console.log('✨ 改善: 記事の具体的な数値を活用');
      }
      
      console.log(`\n📋 投稿構造:`);
      console.log(`  フック: ${concept.structure.openingHook}`);
      console.log(`  メイン: ${concept.structure.mainContent}`);
      
      if (concept.structure.mainContent.length > 150) {
        console.log('✨ 改善: より詳細な内容展開');
      }
    });
    
    // 改善効果の分析
    console.log('\n📊 改善効果の分析:');
    const improvements = {
      '具体的な数値の活用': concepts.some(c => 
        c.structure.mainContent.includes('56%') || 
        c.structure.mainContent.includes('半数') ||
        c.structure.mainContent.includes('10%から20%')
      ),
      '記事の詳細への言及': concepts.some(c => 
        c.structure.mainContent.includes('ホワイトカラー') ||
        c.structure.mainContent.includes('エントリーレベル')
      ),
      'メディア情報の活用': concepts.some(c => 
        c.structure.mainContent.includes('Independent') ||
        c.structure.background.includes('最新')
      ),
      '深い洞察の提供': concepts.every(c => 
        c.structure.mainContent.length > 100
      )
    };
    
    Object.entries(improvements).forEach(([improvement, achieved]) => {
      console.log(`${achieved ? '✅' : '❌'} ${improvement}`);
    });
    
  } catch (error) {
    console.error('エラー:', error);
  }
}

testGPTConceptsImproved();