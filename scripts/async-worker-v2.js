#!/usr/bin/env node

/**
 * 非同期APIワーカー v2
 * 
 * 改善版：重複処理を防ぎ、ステップを正しく進める
 */

const dotenv = require('dotenv');
const path = require('path');

// .env.localファイルを読み込む
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

// 処理済みタスクIDを記録（重複防止）
const processedTasks = new Set();

// モックGPT処理
async function processGptTask(request) {
  console.log('[WORKER] Processing GPT task...');
  
  // 実際のOpenAI APIの代わりにモック応答
  await new Promise(resolve => setTimeout(resolve, 2000)); // 2秒待機
  
  const prompt = request.messages?.[1]?.content || '';
  
  // Phase 1 THINK
  if (prompt.includes('Perplexityに投げる')) {
    return {
      content: JSON.stringify({
        searchStrategy: {
          approach: "AIと働き方に関する最新動向を調査",
          timeframeRationale: "直近7日間の最新情報を重視",
          expectedInsights: "AI技術の進化が働き方に与える影響"
        },
        perplexityQuestions: [
          {
            question: "What are the latest AI tools and technologies that are changing how people work in 2025?",
            category: "B",
            strategicIntent: "最新のAIツールと働き方の変化を把握",
            viralAngle: "技術革新への期待と不安"
          }
        ]
      }),
      usage: { total_tokens: 500 }
    };
  }
  
  // Phase 1 INTEGRATE
  if (prompt.includes('searchResults')) {
    return {
      content: JSON.stringify({
        trendedTopics: [{
          topicName: "AIツールによる働き方革命",
          category: "B",
          summary: "最新のAI技術が職場に与える影響",
          currentStatus: "急速に普及中",
          viralElements: {
            controversy: "高",
            emotion: "期待と不安",
            relatability: "高",
            shareability: "高",
            timeSensitivity: "高",
            platformFit: "Twitter向け"
          },
          expertiseRelevance: "AIと働き方の専門知識が必要",
          sources: [{ title: "AI Work Future", url: "https://example.com" }]
        }],
        categoryInsights: { B: "技術革新が最も注目を集めている" },
        topicCount: 1,
        collectionSummary: "AI技術による働き方の変革が大きな話題",
        nextStepMessage: "1つのトレンドトピックを特定しました"
      }),
      usage: { total_tokens: 400 }
    };
  }
  
  // Phase 2以降のモック
  return {
    content: JSON.stringify({
      result: "Mock response for phase",
      status: "completed"
    }),
    usage: { total_tokens: 300 }
  };
}

// モックPerplexity処理
async function processPerplexityTask(request) {
  console.log('[WORKER] Processing Perplexity task...');
  
  // 実際のPerplexity APIの代わりにモック応答
  await new Promise(resolve => setTimeout(resolve, 3000)); // 3秒待機
  
  return {
    content: "最新のAI技術により、リモートワークやハイブリッドワークが主流となり、多くの企業が業務の自動化を進めています。特にChatGPTやClaude等の対話型AIが、日常業務の効率化に大きく貢献しています。",
    citations: [],
    searchResults: [
      {
        title: "AIが変える働き方の未来",
        url: "https://example.com/ai-work-future",
        date: "2025年6月15日"
      }
    ]
  };
}

// メインループ
async function runWorker() {
  console.log('🤖 非同期APIワーカー v2 起動\n');
  
  let idleCount = 0;
  
  while (true) {
    try {
      // 待機中のタスクを取得（ロック付き）
      const tasks = await prisma.$queryRaw`
        SELECT * FROM api_tasks 
        WHERE status = 'QUEUED'
        AND id NOT IN (
          SELECT id FROM api_tasks WHERE status = 'PROCESSING'
        )
        ORDER BY created_at ASC
        LIMIT 3
        FOR UPDATE SKIP LOCKED
      `;
      
      if (tasks.length === 0) {
        idleCount++;
        if (idleCount % 12 === 0) { // 1分ごとにログ
          console.log(`[WORKER] 待機中... (${new Date().toLocaleTimeString()})`);
        }
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }
      
      idleCount = 0;
      console.log(`[WORKER] ${tasks.length}件のタスクを処理します`);
      
      // タスクを処理
      for (const task of tasks) {
        // 重複チェック
        if (processedTasks.has(task.id)) {
          console.log(`[WORKER] タスク ${task.id} は既に処理済みです`);
          continue;
        }
        
        try {
          // 処理中にマーク
          await prisma.$executeRaw`
            UPDATE api_tasks 
            SET status = 'PROCESSING', started_at = NOW()
            WHERE id = ${task.id} AND status = 'QUEUED'
          `;
          
          processedTasks.add(task.id);
          
          let response;
          if (task.type === 'GPT_COMPLETION') {
            response = await processGptTask(task.request);
          } else if (task.type === 'PERPLEXITY_SEARCH') {
            response = await processPerplexityTask(task.request);
          } else {
            throw new Error(`Unknown task type: ${task.type}`);
          }
          
          // 成功
          await prisma.$executeRaw`
            UPDATE api_tasks 
            SET status = 'COMPLETED', 
                completed_at = NOW(),
                response = ${JSON.stringify(response)}::jsonb
            WHERE id = ${task.id}
          `;
          
          console.log(`[WORKER] ✅ タスク ${task.id} 完了 (${task.type})`);
          
          // continue APIを呼び出し
          await new Promise(resolve => setTimeout(resolve, 500)); // 少し待機
          
          try {
            const continueResponse = await fetch(`http://localhost:3000/api/viral/cot-session/${task.session_id}/continue-async`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ taskId: task.id })
            });
            
            if (continueResponse.ok) {
              const result = await continueResponse.json();
              console.log(`[WORKER] Continue API: ${result.message || 'OK'}`);
            } else {
              const error = await continueResponse.text();
              console.error('[WORKER] Continue API error:', error);
            }
          } catch (e) {
            console.error('[WORKER] Continue API error:', e.message);
          }
          
        } catch (error) {
          console.error(`[WORKER] Task ${task.id} failed:`, error);
          
          await prisma.$executeRaw`
            UPDATE api_tasks 
            SET status = 'FAILED',
                error = ${error.message},
                retry_count = retry_count + 1
            WHERE id = ${task.id}
          `;
          
          processedTasks.delete(task.id); // 失敗したら記録から削除
        }
      }
      
    } catch (error) {
      console.error('[WORKER] Error:', error);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// 統計情報を定期的に表示
async function showStats() {
  setInterval(async () => {
    try {
      const stats = await prisma.$queryRaw`
        SELECT 
          COUNT(*) FILTER (WHERE status = 'QUEUED') as queued,
          COUNT(*) FILTER (WHERE status = 'PROCESSING') as processing,
          COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed,
          COUNT(*) FILTER (WHERE status = 'FAILED' AND retry_count >= 3) as failed
        FROM api_tasks
        WHERE created_at > NOW() - INTERVAL '1 hour'
      `;
      
      console.log(`[STATS] 過去1時間: キュー ${stats[0].queued} | 処理中 ${stats[0].processing} | 完了 ${stats[0].completed} | 失敗 ${stats[0].failed}`);
    } catch (e) {
      // 無視
    }
  }, 60000); // 1分ごと
}

// シグナルハンドリング
process.on('SIGINT', async () => {
  console.log('\n[WORKER] Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[WORKER] Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

// 実行
console.log('Starting worker...');
showStats();
runWorker().catch(console.error);