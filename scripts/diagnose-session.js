#!/usr/bin/env node

const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

async function 完全な診断(sessionId) {
  // セッション情報取得
  const session = await prisma.cotSession.findUnique({
    where: { id: sessionId },
    include: {
      phases: {
        orderBy: { phaseNumber: 'asc' }
      },
      drafts: {
        orderBy: { conceptNumber: 'asc' }
      }
    }
  });
  
  console.log('=== セッション情報 ===');
  console.log(`専門分野: ${session.expertise}`);
  console.log(`ステータス: ${session.status}`);
  console.log(`作成された下書き数: ${session.drafts.length}`);
  
  // Phase 1の結果確認
  const phase1 = session.phases.find(p => p.phaseNumber === 1);
  console.log('\n=== Phase 1: トレンド収集 ===');
  if (phase1?.integrateResult?.trendedTopics) {
    console.log('発見されたトピック:');
    phase1.integrateResult.trendedTopics.forEach((topic, i) => {
      console.log(`  ${i+1}. ${topic.topicName}`);
      console.log(`     理由: ${topic.reason || '不明'}`);
    });
  }
  
  // Phase 2の結果確認  
  const phase2 = session.phases.find(p => p.phaseNumber === 2);
  console.log('\n=== Phase 2: コンセプト生成 ===');
  if (phase2?.integrateResult?.concepts) {
    console.log('生成されたコンセプト:');
    phase2.integrateResult.concepts.forEach((concept, i) => {
      console.log(`\n  コンセプト${i+1}: ${concept.title}`);
      console.log(`    フック: ${concept.hook || concept.B}`);
      console.log(`    角度: ${concept.angle || concept.C}`);
      console.log(`    元トピック: ${concept.topicName || concept.opportunity || '不明'}`);
    });
  }
  
  // Phase 3の結果確認
  const phase3 = session.phases.find(p => p.phaseNumber === 3);
  console.log('\n=== Phase 3: コンテンツ生成 ===');
  if (phase3?.integrateResult?.contents) {
    console.log(`生成されたコンテンツ数: ${phase3.integrateResult.contents.length}`);
    phase3.integrateResult.contents.forEach((content, i) => {
      console.log(`\n  コンテンツ${i+1}: ${content.title || 'タイトルなし'}`);
      console.log(`    投稿文: ${content.mainPost ? '✓ あり' : '✗ なし'}`);
      if (content.mainPost) {
        console.log(`    内容: ${content.mainPost.substring(0, 80)}...`);
      }
    });
  }
  
  // 下書きの確認
  console.log('\n=== 作成された下書き ===');
  session.drafts.forEach(draft => {
    console.log(`\n📝 下書き${draft.conceptNumber}: ${draft.title}`);
    console.log(`   コンテンツ: ${draft.content ? '✓ あり' : '✗ なし'}`);
    console.log(`   ハッシュタグ: ${draft.hashtags.length > 0 ? draft.hashtags.join(', ') : 'なし'}`);
  });
  
  // 問題の診断
  console.log('\n=== 問題の診断 ===');
  const issues = [];
  
  // Phase 1で「AIと働き方」のトピックが見つかったか
  const hasAITopic = phase1?.integrateResult?.trendedTopics?.some(t => 
    t.topicName?.includes('AI') || t.topicName?.includes('働き方')
  );
  if (!hasAITopic) {
    issues.push('❌ Phase 1でAI関連のトピックが見つかっていない');
  } else {
    issues.push('✅ Phase 1でAI関連のトピックを発見');
  }
  
  // Phase 2のコンセプトがAI関連か
  const aiConceptCount = phase2?.integrateResult?.concepts?.filter(c => 
    c.title?.includes('AI') || c.title?.includes('働き方')
  ).length || 0;
  if (aiConceptCount < 3) {
    issues.push(`❌ Phase 2でAI関連のコンセプトが不足 (${aiConceptCount}/3)`);
  } else {
    issues.push('✅ Phase 2で3つのAI関連コンセプトを生成');
  }
  
  // Phase 3でコンテンツが生成されているか
  const hasContent = phase3?.integrateResult?.contents?.some(c => c.mainPost);
  if (!hasContent) {
    issues.push('❌ Phase 3でコンテンツが生成されていない');
  } else {
    issues.push('✅ Phase 3でコンテンツを生成');
  }
  
  // 下書きにコンテンツがあるか
  const draftsWithContent = session.drafts.filter(d => d.content).length;
  if (draftsWithContent === 0) {
    issues.push('❌ 下書きにコンテンツが保存されていない');
  } else {
    issues.push(`✅ ${draftsWithContent}個の下書きにコンテンツあり`);
  }
  
  issues.forEach(issue => console.log(issue));
  
  await prisma.$disconnect();
}

// 実行
const sessionId = process.argv[2] || 'd70ff7ec-ae22-4088-baf7-760c7e6cce1e';
完全な診断(sessionId).catch(console.error);