#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });

const fs = require('fs').promises;
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk').default;

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY,
});

async function testClaudeCardi() {
  try {
    // GPT Version 3で生成されたコンセプトA（AI時代の就職神話破壊）を使用
    const concept = {
      conceptId: "topic1_conceptA",
      conceptTitle: "AI時代の就職神話破壊",
      format: "thread",
      hookType: "意外性",
      angle: "神話破壊型",
      structure: {
        openingHook: "AIがあなたの仕事を奪う？実は、それは神話かもしれません。",
        background: "AIがホワイトカラー職を奪うと恐れられていますが、それは本当でしょうか？",
        mainContent: "1. AIが何を実際にできるのかを考える。\n2. AIが人間の仕事を補完する方法。\n3. 神話の裏にある実際のデータとケース。",
        reflection: "AI時代で重要なのは、どう適応するかの視点。",
        cta: "AIとの共存について、皆さんの意見をコメントで教えてください！"
      }
    };
    
    // カーディの人物像
    const cardiPhilosophy = `クリエイティブディレクター。アメリカ文学PhD。Twitterでの皮肉と哲学的洞察で人気。
「人生は皮肉だ。だが、それが美しい」が口癖。
バーボンと古典文学を愛し、現代社会の矛盾を独特の視点で切り取る。`;

    // シンプル版（2連投稿）のテスト
    console.log('🔄 Claudeでカーディ・ダーレの投稿を生成中（シンプル版）...\n');
    
    const simplePrompt = `あなたはカーディ・ダーレという53歳の男性です。

${cardiPhilosophy}

【今日のトピック】
${concept.conceptTitle}

【注目ポイント】
${concept.structure.openingHook}

このトピックについて、120-135文字で印象的な一言を。
（ハッシュタグは不要、本文のみ）
皮肉と哲学を込めて、カーディらしく。`;

    const simpleResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      temperature: 0.8,
      messages: [
        {
          role: 'user',
          content: simplePrompt
        }
      ]
    });
    
    const simplePost = simpleResponse.content[0].text.trim();
    
    console.log('📝 シンプル版（メイン投稿）:');
    console.log('─'.repeat(60));
    console.log(simplePost);
    console.log(`文字数: ${simplePost.length}`);
    console.log('─'.repeat(60));
    
    // スレッド版（5連投稿）のテスト
    console.log('\n🔄 Claudeでカーディ・ダーレの投稿を生成中（スレッド版）...\n');
    
    // プロンプトファイルを読み込む
    const threadPromptPath = path.join(process.cwd(), 'lib/prompts/claude/character-profiles/cardi-dare-thread.txt');
    let threadPromptTemplate = await fs.readFile(threadPromptPath, 'utf-8');
    
    // 変数を置換
    const threadVariables = {
      philosophy: cardiPhilosophy,
      topicTitle: concept.conceptTitle,
      openingHook: concept.structure.openingHook,
      background: concept.structure.background,
      mainContent: concept.structure.mainContent,
      reflection: concept.structure.reflection,
      cta: concept.structure.cta
    };
    
    Object.entries(threadVariables).forEach(([key, value]) => {
      const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
      threadPromptTemplate = threadPromptTemplate.replace(regex, String(value));
    });
    
    const threadPrompt = threadPromptTemplate;

    const threadResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      temperature: 0.8,
      messages: [
        {
          role: 'user',
          content: threadPrompt
        }
      ]
    });
    
    const threadContent = threadResponse.content[0].text.trim();
    
    console.log('📝 スレッド版（5連投稿）:');
    console.log('─'.repeat(60));
    console.log(threadContent);
    console.log('─'.repeat(60));
    
    // JSON形式の場合の文字数確認
    try {
      const threadJson = JSON.parse(threadContent);
      console.log('\n📊 各投稿の文字数:');
      for (let i = 1; i <= 5; i++) {
        const postKey = `post${i}`;
        if (threadJson[postKey]) {
          console.log(`投稿${i}: ${threadJson[postKey].length}文字`);
        }
      }
    } catch (e) {
      // 旧形式の場合
      const posts = threadContent.split('\n\n').filter(p => p.trim());
      console.log('\n📊 各投稿の文字数:');
      posts.forEach((post, index) => {
        const cleanPost = post.replace(/^\d+\.\s*/, ''); // 番号を除去
        console.log(`投稿${index + 1}: ${cleanPost.length}文字`);
      });
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

testClaudeCardi();