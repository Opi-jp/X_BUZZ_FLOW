const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

async function updatePresets() {
  try {
    // エンゲージメント狙いプリセットを更新
    const engagementPreset = await prisma.collectionPreset.findFirst({
      where: { category: 'engagement' }
    });
    
    if (engagementPreset) {
      await prisma.collectionPreset.update({
        where: { id: engagementPreset.id },
        data: {
          keywords: [
            'AI 議論',
            'AGI 問題',
            'シンギュラリティ AI',
            'AI 倫理',
            'AI 雇用',
            'AI教育',
            'AI格差',
            'AI規制',
            '生成AI 社会',
            'ChatGPT 影響',
            'LLM 未来'
          ],
          query: '(AI OR 生成AI OR LLM OR ChatGPT) AND (議論 OR 問題 OR 倫理 OR 雇用 OR 教育 OR 格差 OR 規制 OR 社会 OR 未来)'
        }
      });
      console.log('✅ エンゲージメント狙いプリセットを更新しました');
    }
    
    // LLM×働き方革命プリセットを更新
    const workPreset = await prisma.collectionPreset.findFirst({
      where: { category: 'future_work' }
    });
    
    if (workPreset) {
      await prisma.collectionPreset.update({
        where: { id: workPreset.id },
        data: {
          keywords: [
            'LLM 働き方',
            'AI 働き方',
            'AI リモートワーク',
            'AI フリーランス',
            'AI 副業',
            'Web3 働き方',
            'DAO 組織',
            'AI 未来の仕事',
            'ChatGPT 業務'
          ],
          query: '(LLM OR AI OR ChatGPT) AND (働き方 OR リモートワーク OR フリーランス OR 副業 OR 仕事 OR 業務)'
        }
      });
      console.log('✅ LLM×働き方革命プリセットを更新しました');
    }
    
    // クリエイティブ×AI実践を更新
    const creativePreset = await prisma.collectionPreset.findFirst({
      where: { category: 'creative_ai' }
    });
    
    if (creativePreset) {
      await prisma.collectionPreset.update({
        where: { id: creativePreset.id },
        data: {
          keywords: [
            'AI クリエイティブ',
            'AI デザイン',
            'Midjourney 作品',
            'Stable Diffusion 生成',
            'DALL-E 画像',
            'RunwayML 動画',
            'AI 映像制作',
            'プロンプト テクニック',
            'AI art'
          ],
          query: '(Midjourney OR "Stable Diffusion" OR DALL-E OR RunwayML OR "AI art") AND (作品 OR 生成 OR 制作 OR デザイン OR クリエイティブ)'
        }
      });
      console.log('✅ クリエイティブ×AI実践プリセットを更新しました');
    }
    
    // 未来の職業・スキルを更新
    const skillsPreset = await prisma.collectionPreset.findFirst({
      where: { category: 'future_skills' }
    });
    
    if (skillsPreset) {
      await prisma.collectionPreset.update({
        where: { id: skillsPreset.id },
        data: {
          keywords: [
            'AI 未来の職業',
            'AI スキル',
            'AI リスキリング',
            'AI キャリアチェンジ',
            'AI 転職',
            'Web3 キャリア',
            'DAO 働き方',
            'メタバース 仕事',
            'プロンプトエンジニア'
          ],
          query: '(AI OR Web3 OR DAO) AND (職業 OR スキル OR キャリア OR 転職 OR リスキリング)'
        }
      });
      console.log('✅ 未来の職業・スキルプリセットを更新しました');
    }
    
    console.log('\n✅ すべてのプリセットの更新が完了しました');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updatePresets();