#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });

const fs = require('fs').promises;
const path = require('path');

async function testPerplexityFinal() {
  try {
    // 最終版のプロンプトファイルを読み込む
    const promptPath = path.join(process.cwd(), 'lib/prompts/perplexity/collect-topics-final.txt');
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
    
    console.log('📝 最終版プロンプト（文字数指定を改善）:');
    console.log('─'.repeat(80));
    console.log('重要な改善点:');
    console.log('- summaryは350文字以上450文字以内でまとめる');
    console.log('- perplexityAnalysisは150文字以上250文字以内でまとめる');
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
            content: '質問の意図を理解し、2つのトピックをJSON形式で提供してください。文字数指定は必ず守ってください。'
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
    
    console.log(`📊 抽出されたトピック数: ${topics.length}\n`);
    
    topics.forEach((topic, index) => {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`✨ トピック${index + 1}: ${topic.TOPIC}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📰 記事タイトル: ${topic.title || '未設定'}`);
      console.log(`📍 メディア: ${topic.source || '未設定'}`);
      console.log(`🔗 URL: ${topic.url}`);
      console.log(`📅 日付: ${topic.date}`);
      
      // キーポイント
      if (topic.keyPoints && Array.isArray(topic.keyPoints)) {
        console.log(`\n📌 キーポイント (${topic.keyPoints.length}個):`);
        topic.keyPoints.forEach((point, i) => {
          console.log(`  ${i + 1}. ${point}`);
        });
      } else {
        console.log('\n⚠️  キーポイントが出力されていません');
      }
      
      // 要約
      if (topic.summary) {
        console.log(`\n📄 要約 (${topic.summary.length}文字):`);
        console.log(`  ${topic.summary}`);
      }
      
      // 分析
      if (topic.perplexityAnalysis) {
        console.log(`\n💡 バズ分析 (${topic.perplexityAnalysis.length}文字):`);
        console.log(`  ${topic.perplexityAnalysis}`);
      }
      
      // 追加ソース
      if (topic.additionalSources && topic.additionalSources.length > 0) {
        console.log(`\n📚 追加ソース (${topic.additionalSources.length}件):`);
        topic.additionalSources.forEach((source, i) => {
          console.log(`  ${i + 1}. ${source.title} (${source.source})`);
        });
      }
      
      console.log('');
    });
    
    // 改善効果の確認
    console.log('\n📋 品質チェック:');
    const checks = {
      'keyPointsが5つ出力': topics.every(t => t.keyPoints?.length === 5),
      'summaryが350-450文字': topics.every(t => t.summary && t.summary.length >= 350 && t.summary.length <= 450),
      'perplexityAnalysisが150-250文字': topics.every(t => t.perplexityAnalysis && t.perplexityAnalysis.length >= 150 && t.perplexityAnalysis.length <= 250),
      'titleフィールド': topics.every(t => t.title),
      'sourceフィールド': topics.every(t => t.source),
      'summaryとanalysisの分離': topics.every(t => t.summary && t.perplexityAnalysis && !t.summary.includes('バズ'))
    };
    
    Object.entries(checks).forEach(([check, result]) => {
      console.log(`${result ? '✅' : '❌'} ${check}`);
    });
    
    // 詳細な文字数レポート
    console.log('\n📊 文字数詳細:');
    topics.forEach((topic, i) => {
      console.log(`トピック${i + 1}:`);
      console.log(`  summary: ${topic.summary?.length || 0}文字 ${topic.summary?.length >= 350 && topic.summary?.length <= 450 ? '✅' : '❌'}`);
      console.log(`  analysis: ${topic.perplexityAnalysis?.length || 0}文字 ${topic.perplexityAnalysis?.length >= 150 && topic.perplexityAnalysis?.length <= 250 ? '✅' : '❌'}`);
    });
    
  } catch (error) {
    console.error('エラー:', error);
  }
}

testPerplexityFinal();