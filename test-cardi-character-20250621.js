#!/usr/bin/env node

/**
 * カーディ・ダーレのキャラクターテスト
 * 複数のテーマで生成をテストし、皮肉の形をとった正論になっているか確認
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs').promises;
const path = require('path');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || ''
});

// テストするテーマ
const TEST_THEMES = [
  {
    theme: 'AIによる仕事の自動化',
    hook: '意外性',
    angle: '個人的体験',
    structure: {
      openingHook: 'AIが仕事を奪うって騒いでるが、俺の1000年の経験から言わせてもらえば...',
      background: '人間は昔から道具に仕事を奪われてきた。車輪、印刷機、蒸気機関...',
      mainContent: 'AIも同じだ。使い方次第で毒にも薬にもなる。',
      reflection: '結局、人間の本質は変わらない。',
      cta: 'さて、今夜も機械学習の勉強でもするか。'
    }
  },
  {
    theme: 'リモートワークの功罪',
    hook: '共感',
    angle: '社会的影響',
    structure: {
      openingHook: '家で仕事ができるようになって、みんな幸せになったか？',
      background: 'オフィスという檻から解放されたと思ったら...',
      mainContent: '今度は家が檻になった。面白いもんだ。',
      reflection: '人間は自由を求めて、新しい不自由を作り出す。',
      cta: 'ウイスキーでも飲みながら、この矛盾について考えてみるか。'
    }
  },
  {
    theme: 'SNSでの承認欲求',
    hook: '皮肉',
    angle: '心理的洞察',
    structure: {
      openingHook: 'いいね！が欲しくて必死な奴らを見てると...',
      background: '1000年前も同じだった。権力者に認められたくて必死だった。',
      mainContent: '道具が変わっただけで、人間の本性は何も変わっちゃいない。',
      reflection: '承認を求めるのは人間の性。それを利用するのも人間の性。',
      cta: '俺？俺は酒があればそれでいい。'
    }
  }
];

async function loadCharacterProfile(characterId) {
  const characterPath = path.join(process.cwd(), 'lib', 'prompts', 'characters', `${characterId}.json`);
  const characterData = await fs.readFile(characterPath, 'utf-8');
  const character = JSON.parse(characterData);
  
  let profile = `あなたは「${character.name}」として投稿を作成します。\n\n`;
  
  if (character.age) profile += `${character.name}（${character.age}歳）\n`;
  if (character.background) profile += `- 経歴: ${character.background}\n`;
  if (character.philosophy) profile += `- 哲学: 「${character.philosophy}」\n`;
  if (character.personality) profile += `- 性格: ${character.personality}\n`;
  if (character.tone) profile += `- 口調: ${character.tone}\n`;
  if (character.traits) profile += `- 特徴: ${character.traits.join('、')}\n`;
  
  // 重要な指示を追加
  profile += `\n【重要な指示】\n`;
  profile += `- 愚痴ではなく、皮肉の形をとった正論を語る\n`;
  profile += `- 表面的には皮肉めいているが、本質的な洞察を含む\n`;
  profile += `- 批判だけでなく、建設的な視点も忘れない\n`;
  
  return profile;
}

async function testCharacter(testCase) {
  console.log('\n' + '='.repeat(60));
  console.log(`📝 テーマ: ${testCase.theme}`);
  console.log(`🎯 フック: ${testCase.hook} / 角度: ${testCase.angle}`);
  console.log('='.repeat(60));
  
  const characterProfile = await loadCharacterProfile('cardi-dare');
  
  const prompt = `${characterProfile}

【今回のテーマ】
${testCase.theme}

【コンセプト構造】
${JSON.stringify(testCase.structure, null, 2)}

このテーマとコンセプトに基づいて、カーディ・ダーレとして140文字以内の投稿を作成してください。
皮肉を交えながらも、本質的な洞察や正論を含めることを忘れないでください。

出力形式：投稿文のみを出力してください。`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 500,
      temperature: 0.8,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });
    
    const content = response.content[0];
    if (content.type === 'text') {
      console.log('\n📄 生成された投稿:');
      console.log('-'.repeat(60));
      console.log(content.text.trim());
      console.log('-'.repeat(60));
      console.log(`文字数: ${content.text.trim().length}文字`);
      
      // 評価
      console.log('\n🔍 評価:');
      const text = content.text.trim();
      const hasIrony = text.includes('が') || text.includes('だろう') || text.includes('もんだ');
      const hasInsight = text.length > 50; // 単純な愚痴は短い傾向
      const hasConstructive = !text.includes('ダメ') && !text.includes('最悪');
      
      console.log(`- 皮肉の要素: ${hasIrony ? '✅' : '❌'}`);
      console.log(`- 洞察の深さ: ${hasInsight ? '✅' : '❌'}`);
      console.log(`- 建設的視点: ${hasConstructive ? '✅' : '❌'}`);
    }
  } catch (error) {
    console.error('❌ エラー:', error.message);
  }
}

async function runTests() {
  console.log('🚀 カーディ・ダーレ キャラクターテスト開始\n');
  
  for (const testCase of TEST_THEMES) {
    await testCharacter(testCase);
    // API制限を考慮して少し待機
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n✅ テスト完了');
}

// 実行
runTests().catch(console.error);