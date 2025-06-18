#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });

const fs = require('fs').promises;
const path = require('path');

async function testPerplexityFixed() {
  try {
    // 修正後のプロンプトファイルを読み込む
    const promptPath = path.join(process.cwd(), 'lib/prompts/perplexity/collect-topics.txt');
    let promptTemplate = await fs.readFile(promptPath, 'utf-8');
    
    // 変数を置換（theme_part1/2は削除済み）
    const variables = {
      theme: 'AIと働き方',
      platform: 'Twitter',
      style: 'エンターテイメント'
    };
    
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
      promptTemplate = promptTemplate.replace(regex, value);
    });
    
    console.log('✅ 修正後のプロンプト:');
    console.log('─'.repeat(80));
    console.log(promptTemplate);
    console.log('─'.repeat(80));
    
    // theme_part1/2が残っていないことを確認
    if (promptTemplate.includes('${theme_part')) {
      console.error('❌ エラー: theme_part変数がまだ残っています！');
      return;
    }
    
    console.log('\n✅ theme_part1/2が正しく削除されていることを確認しました');
    
    // Perplexity API呼び出し
    console.log('\n🔄 Perplexity APIを呼び出し中...\n');
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [
          {
            role: 'system',
            content: '質問の意図を理解し、2つのトピックをJSON形式で提供してください。必ずURLと日付を含めてください。'
          },
          {
            role: 'user',
            content: promptTemplate
          }
        ],
        max_tokens: 4000,
        temperature: 0.7,
        top_p: 0.9
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Perplexity APIエラー:', error);
      return;
    }
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    console.log('✅ Perplexity応答:');
    console.log('─'.repeat(80));
    console.log(content);
    console.log('─'.repeat(80));
    
    // トピックを抽出
    const topics = [];
    const jsonCodeBlocks = content.matchAll(/```json\n([\s\S]*?)\n```/g);
    for (const match of jsonCodeBlocks) {
      try {
        const topic = JSON.parse(match[1]);
        if (topic.TOPIC) {
          topics.push(topic);
        }
      } catch (e) {
        console.error('JSONパースエラー:', e.message);
      }
    }
    
    console.log(`\n📊 抽出されたトピック数: ${topics.length}\n`);
    
    topics.forEach((topic, index) => {
      console.log(`✨ トピック${index + 1}: ${topic.TOPIC}`);
      console.log(`   URL: ${topic.url}`);
      console.log(`   日付: ${topic.date}`);
      console.log(`   分析: ${topic.perplexityAnalysis?.substring(0, 100)}...`);
      console.log('');
    });
    
    console.log('\n💡 改善効果:');
    console.log('- theme_part1/2の削除により、より統合的な視点での検索が可能に');
    console.log('- 「技術と社会の交差点」という表現で、創造的な発見を促進');
    console.log('- 具体的な検索条件ではなく、視点として機能');
    
  } catch (error) {
    console.error('エラー:', error);
  }
}

testPerplexityFixed();