#!/usr/bin/env node

const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

async function checkPhaseResults(sessionId) {
  try {
    const session = await prisma.cotSession.findUnique({
      where: { id: sessionId },
      include: {
        phases: {
          orderBy: { phaseNumber: 'asc' }
        }
      }
    });

    if (!session) {
      console.log('セッションが見つかりません');
      return;
    }

    console.log('\n=== セッション情報 ===');
    console.log(`ID: ${session.id}`);
    console.log(`専門分野: ${session.expertise}`);
    console.log(`スタイル: ${session.style}`);
    console.log(`プラットフォーム: ${session.platform}`);
    console.log(`ステータス: ${session.status}`);
    console.log(`現在のフェーズ: ${session.currentPhase}`);
    console.log(`現在のステップ: ${session.currentStep}`);

    // 各フェーズの結果を表示
    for (const phase of session.phases) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📊 Phase ${phase.phaseNumber}: ${phase.status}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      if (phase.thinkResult) {
        console.log('\n--- THINK結果 ---');
        console.log(JSON.stringify(phase.thinkResult, null, 2));
      }

      if (phase.executeResult) {
        console.log('\n--- EXECUTE結果 ---');
        const executeResult = phase.executeResult;
        if (executeResult.searchResults && Array.isArray(executeResult.searchResults)) {
          console.log(`検索結果数: ${executeResult.searchResults.length}`);
          executeResult.searchResults.forEach((result, index) => {
            console.log(`\n検索 ${index + 1}:`);
            if (result.content) {
              console.log(`内容プレビュー: ${result.content.substring(0, 200)}...`);
            }
          });
        }
      }

      if (phase.integrateResult) {
        console.log('\n--- INTEGRATE結果 ---');
        const result = phase.integrateResult;
        
        // Phase 1の場合
        if (phase.phaseNumber === 1 && result.trendedTopics) {
          console.log(`\n発見されたトピック数: ${result.trendedTopics.length}`);
          result.trendedTopics.forEach((topic, index) => {
            console.log(`\n${index + 1}. ${topic.topicName}`);
            console.log(`   カテゴリ: ${topic.category}`);
            console.log(`   概要: ${topic.summary}`);
            if (topic.evidenceSources && topic.evidenceSources.length > 0) {
              console.log(`   ソース: ${topic.evidenceSources[0].title} - ${topic.evidenceSources[0].url}`);
            }
          });
        }
        
        // Phase 2の場合
        else if (phase.phaseNumber === 2 && result.concepts) {
          console.log(`\n生成されたコンセプト数: ${result.concepts.length}`);
          result.concepts.forEach((concept, index) => {
            console.log(`\n${index + 1}. ${concept.title}`);
            console.log(`   形式: ${concept.A}`);
            console.log(`   フック: ${concept.B}`);
            console.log(`   角度: ${concept.C}`);
            console.log(`   ソース: ${concept.newsSource} - ${concept.sourceUrl}`);
          });
        }
        
        // Phase 3の場合
        else if (phase.phaseNumber === 3 && result.contents) {
          console.log(`\n生成されたコンテンツ数: ${result.contents.length}`);
          result.contents.forEach((content, index) => {
            console.log(`\n${index + 1}. ${content.title}`);
            console.log(`\n【投稿文プレビュー】`);
            console.log(content.mainPost?.substring(0, 300) + '...');
          });
        }
        
        // その他のフェーズ
        else {
          console.log(JSON.stringify(result, null, 2));
        }
      }
    }

  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

const sessionId = process.argv[2] || '12dba4f0-ed3d-4dcb-9d7f-0d1e05100ff3';
checkPhaseResults(sessionId);