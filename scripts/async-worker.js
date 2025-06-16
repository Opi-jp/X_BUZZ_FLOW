#!/usr/bin/env node

/**
 * 非同期APIワーカー
 * 
 * AsyncApiProcessorのタスクを処理するバックグラウンドワーカー
 */

const dotenv = require('dotenv');
const path = require('path');

// .env.localファイルを読み込む
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

// モックGPT処理
async function processGptTask(request) {
  console.log('[WORKER] Processing GPT task...');
  
  // 実際のOpenAI APIの代わりにモック応答
  await new Promise(resolve => setTimeout(resolve, 2000)); // 2秒待機
  
  const isPhase1 = request.messages?.[1]?.content?.includes('Perplexityに投げる');
  
  if (isPhase1) {
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
  
  // 他のフェーズのモック応答
  return {
    content: JSON.stringify({
      result: "Mock response",
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
  console.log('🤖 非同期APIワーカー起動\n');
  
  while (true) {
    try {
      // 待機中のタスクを取得
      const tasks = await prisma.$queryRaw`
        SELECT * FROM api_tasks 
        WHERE status = 'QUEUED'
        ORDER BY created_at ASC
        LIMIT 3
      `;
      
      if (tasks.length === 0) {
        // タスクがない場合は5秒待機
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }
      
      console.log(`[WORKER] ${tasks.length}件のタスクを処理します`);
      
      // タスクを並列処理
      await Promise.all(tasks.map(async (task) => {
        try {
          // 処理中にマーク
          await prisma.$executeRaw`
            UPDATE api_tasks 
            SET status = 'PROCESSING', started_at = NOW()
            WHERE id = ${task.id}
          `;
          
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
          
          console.log(`[WORKER] ✅ タスク ${task.id} 完了`);
          
          // continue APIを呼び出し
          try {
            const continueResponse = await fetch(`http://localhost:3000/api/viral/cot-session/${task.session_id}/continue-async`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ taskId: task.id })
            });
            
            if (continueResponse.ok) {
              const result = await continueResponse.json();
              console.log(`[WORKER] Continue API: ${result.message}`);
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
        }
      }));
      
    } catch (error) {
      console.error('[WORKER] Error:', error);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// シグナルハンドリング
process.on('SIGINT', async () => {
  console.log('\n[WORKER] Shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

// 実行
runWorker().catch(console.error);