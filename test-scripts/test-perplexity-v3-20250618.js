#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });

const fs = require('fs').promises;
const path = require('path');

async function testPerplexityV3() {
  try {
    // 改善版v3のプロンプトファイルを読み込む
    const promptPath = path.join(process.cwd(), 'lib/prompts/perplexity/collect-topics-draft-v3.txt');
    let promptTemplate = await fs.readFile(promptPath, 'utf-8');
    
    // 変数を置換
    const variables = {
      theme: 'AIと働き方',
      platform: 'Twitter',
      style: 'エンターテイメント'
    };
    
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
      promptTemplate = promptTemplate.replace(regex, value);
    });
    
    console.log('📝 改善版v3プロンプト:');
    console.log('─'.repeat(80));
    console.log(promptTemplate.substring(0, 500) + '...\n[以下省略]');
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
            content: '質問の意図を理解し、2つのトピックをJSON形式で提供してください。必ずすべての必須フィールドを含めてください。'
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
    
    console.log('✅ Perplexity応答（冒頭部分）:');
    console.log('─'.repeat(80));
    console.log(content.substring(0, 1000) + '...\n');
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
      console.log(`   記事タイトル: ${topic.title || '未設定'}`);
      console.log(`   メディア: ${topic.source || '未設定'}`);
      console.log(`   URL: ${topic.url}`);
      console.log(`   日付: ${topic.date}`);
      
      // keyPointsの確認
      if (topic.keyPoints && Array.isArray(topic.keyPoints)) {
        console.log(`   キーポイント数: ${topic.keyPoints.length}`);
        topic.keyPoints.forEach((point, i) => {
          console.log(`     ${i + 1}. ${point.substring(0, 50)}...`);
        });
      } else {
        console.log('   ⚠️  キーポイントが出力されていません');
      }
      
      // summaryとperplexityAnalysisの文字数確認
      if (topic.summary) {
        console.log(`   要約文字数: ${topic.summary.length}文字`);
      }
      if (topic.perplexityAnalysis) {
        console.log(`   分析文字数: ${topic.perplexityAnalysis.length}文字`);
      }
      
      console.log('');
    });
    
    // 改善効果の確認
    console.log('\n📋 チェックリスト:');
    const checks = {
      'keyPointsが5つ出力されている': topics.every(t => t.keyPoints?.length === 5),
      'summaryが400文字前後': topics.every(t => t.summary && t.summary.length >= 350 && t.summary.length <= 450),
      'perplexityAnalysisが200文字前後': topics.every(t => t.perplexityAnalysis && t.perplexityAnalysis.length >= 150 && t.perplexityAnalysis.length <= 250),
      'titleフィールドが含まれている': topics.every(t => t.title),
      'sourceフィールドが含まれている': topics.every(t => t.source),
      'summaryとanalysisが明確に分離': topics.every(t => t.summary && t.perplexityAnalysis && !t.summary.includes('バズ'))
    };
    
    Object.entries(checks).forEach(([check, result]) => {
      console.log(`${result ? '✅' : '❌'} ${check}`);
    });
    
  } catch (error) {
    console.error('エラー:', error);
  }
}

testPerplexityV3();