#!/usr/bin/env node

const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

async function checkPerplexityUrls(sessionId) {
  console.log(`\n=== Perplexity URLs確認 ===`);
  console.log(`セッションID: ${sessionId}\n`);

  try {
    // 1. Perplexityタスクを取得
    const perplexityTasks = await prisma.$queryRaw`
      SELECT id, request, response, status
      FROM api_tasks 
      WHERE session_id = ${sessionId}
      AND type = 'PERPLEXITY_SEARCH'
      AND status = 'COMPLETED'
    `;

    console.log(`完了したPerplexityタスク数: ${perplexityTasks.length}\n`);

    // 2. 各タスクのレスポンスからURLを抽出
    perplexityTasks.forEach((task, index) => {
      console.log(`\n--- タスク ${index + 1} ---`);
      console.log(`質問: ${task.request?.query || 'N/A'}`);
      
      const response = task.response;
      
      // contentからURLを抽出
      if (response?.content) {
        const content = response.content;
        
        // URLパターンの抽出
        const urlRegex = /https?:\/\/[^\s\)]+/g;
        const urls = content.match(urlRegex) || [];
        
        // 【1】【2】形式の参照を探す
        const refRegex = /【\d+】/g;
        const refs = content.match(refRegex) || [];
        
        console.log(`見つかったURL: ${urls.length}個`);
        urls.forEach((url, i) => {
          console.log(`  ${i + 1}. ${url}`);
        });
        
        console.log(`\n見つかった参照番号: ${refs.length}個`);
        refs.forEach(ref => {
          console.log(`  ${ref}`);
        });
      }
      
      // citationsやsearchResultsも確認
      if (response?.citations) {
        console.log(`\ncitations: ${response.citations.length}個`);
        response.citations.forEach((citation, i) => {
          console.log(`  ${i + 1}. ${citation.title || 'No title'} - ${citation.url || 'No URL'}`);
        });
      }
      
      if (response?.searchResults) {
        console.log(`\nsearchResults: ${response.searchResults.length}個`);
        response.searchResults.forEach((result, i) => {
          console.log(`  ${i + 1}. ${result.title || 'No title'} - ${result.url || 'No URL'}`);
        });
      }
    });

    // 3. Phase 1のexecuteResultを確認
    const phase1 = await prisma.cotPhase.findUnique({
      where: {
        sessionId_phaseNumber: {
          sessionId,
          phaseNumber: 1
        }
      }
    });

    if (phase1?.executeResult) {
      console.log(`\n\n=== Phase 1 ExecuteResult ===`);
      const executeResult = phase1.executeResult;
      
      if (executeResult.searchResults) {
        console.log(`保存されたsearchResults数: ${executeResult.searchResults.length}`);
        
        executeResult.searchResults.forEach((result, index) => {
          console.log(`\n--- 結果 ${index + 1} ---`);
          console.log(`タスクID: ${result.taskId}`);
          
          // URL抽出
          if (result.content) {
            const urls = result.content.match(/https?:\/\/[^\s\)]+/g) || [];
            console.log(`抽出されたURL数: ${urls.length}`);
            urls.forEach((url, i) => {
              console.log(`  ${i + 1}. ${url}`);
            });
          }
          
          // citations
          if (result.citations && result.citations.length > 0) {
            console.log(`citations: ${result.citations.length}個`);
          }
          
          // searchResults
          if (result.searchResults && result.searchResults.length > 0) {
            console.log(`searchResults: ${result.searchResults.length}個`);
          }
        });
      }
    }

    // 4. Phase 1のintegrateResultを確認（URLが次フェーズに渡されているか）
    if (phase1?.integrateResult) {
      console.log(`\n\n=== Phase 1 IntegrateResult ===`);
      const integrateResult = phase1.integrateResult;
      
      if (integrateResult.trendedTopics) {
        console.log(`トレンドトピック数: ${integrateResult.trendedTopics.length}`);
        
        integrateResult.trendedTopics.forEach((topic, index) => {
          console.log(`\n--- トピック ${index + 1}: ${topic.topicName} ---`);
          if (topic.sources && topic.sources.length > 0) {
            console.log(`ソース数: ${topic.sources.length}`);
            topic.sources.forEach((source, i) => {
              console.log(`  ${i + 1}. ${source.title || 'No title'} - ${source.url || 'No URL'}`);
            });
          } else {
            console.log(`ソース: なし`);
          }
        });
      }
    }

  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 実行
const sessionId = process.argv[2] || 'a5f3dff1-1954-4db0-a50b-48750603f569';
checkPerplexityUrls(sessionId);