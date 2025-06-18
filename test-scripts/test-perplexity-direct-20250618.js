#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });

const fs = require('fs').promises;
const path = require('path');

async function testPerplexity() {
  try {
    // プロンプトファイルを読み込む
    const promptPath = path.join(process.cwd(), 'lib/prompts/perplexity/collect-topics.txt');
    let promptTemplate = await fs.readFile(promptPath, 'utf-8');
    
    // 変数を置換
    const variables = {
      theme: 'AIと働き方',
      platform: 'Twitter',
      style: 'エンターテイメント',
      theme_part1: 'AI',
      theme_part2: '働き方'
    };
    
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
      promptTemplate = promptTemplate.replace(regex, value);
    });
    
    console.log('📝 使用するプロンプト:');
    console.log('─'.repeat(80));
    console.log(promptTemplate);
    console.log('─'.repeat(80));
    
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
      console.log(`トピック${index + 1}: ${topic.TOPIC}`);
      console.log(`URL: ${topic.url}`);
      console.log(`日付: ${topic.date}`);
      console.log('');
    });
    
    // 問題のあるtheme_part1/2の確認
    if (promptTemplate.includes('AIと働き方に関する政治的議論')) {
      console.log('\n⚠️  分析: theme_part1/theme_part2が変数として使用されています');
      console.log('これにより「AIと働き方」の交差点ではなく、別々のトピックが検索される可能性があります。');
    }
    
    // sources情報も表示
    if (data.search_results) {
      console.log('\n📚 検索ソース:');
      data.search_results.forEach((source, index) => {
        console.log(`${index + 1}. ${source.title || source.url}`);
      });
    }
    
  } catch (error) {
    console.error('エラー:', error);
  }
}

testPerplexity();