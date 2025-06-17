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

const { PrismaClient } = require('../lib/generated/prisma');
const prisma = new PrismaClient();

// 処理済みタスクIDを記録（重複防止）
const processedTasks = new Set();

// OpenAI APIを使用したGPT処理
async function processGptTask(request) {
  console.log('[WORKER] Processing GPT task...');
  console.log('[WORKER] Request params:', {
    model: request.model,
    temperature: request.temperature,
    max_tokens: request.max_tokens,
    response_format: request.response_format
  });
  
  try {
    // OpenAI APIを呼び出し
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }
    
    const data = await response.json();
    console.log('[WORKER] OpenAI API success, tokens used:', data.usage?.total_tokens);
    return {
      content: data.choices[0].message.content,
      usage: data.usage
    };
  } catch (error) {
    console.error('[WORKER] OpenAI API error:', error);
    
    // エラーを再スローして適切に処理
    throw new Error(`OpenAI API failed: ${error.message || 'Unknown error'}`);
  }
}

// 本番Perplexity処理
async function processPerplexityTask(request) {
  console.log('[WORKER] Processing Perplexity task...');
  
  const perplexityApiKey = process.env.PERPLEXITY_API_KEY;
  if (!perplexityApiKey) {
    throw new Error('PERPLEXITY_API_KEY is not set');
  }
  
  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [
          {
            role: 'system',
            content: request.systemPrompt || '最新の情報を提供してください。'
          },
          {
            role: 'user',
            content: request.query
          }
        ],
        temperature: 0.2,
        top_p: 0.9,
        search_domain_filter: ['perplexity.ai'],
        return_citations: true,
        search_recency_filter: 'week',
        top_k: 0,
        stream: false,
        presence_penalty: 0,
        frequency_penalty: 1
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Perplexity API error: ${response.status} - ${error}`);
    }
    
    const data = await response.json();
    const message = data.choices?.[0]?.message?.content || '';
    
    // 応答形式を整形
    return {
      content: message,
      citations: data.citations || [],
      searchResults: data.citations?.map(c => ({
        title: c.title || 'No title',
        url: c.url || '',
        date: new Date().toISOString()
      })) || []
    };
    
  } catch (error) {
    console.error('[WORKER] Perplexity API error:', error);
    throw error;
  }
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
        AND retry_count < 3
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
          const updateResult = await prisma.$executeRaw`
            UPDATE api_tasks 
            SET status = 'PROCESSING', started_at = NOW()
            WHERE id = ${task.id} AND status = 'QUEUED'
          `;
          
          // 更新できなかった場合はスキップ
          if (updateResult === 0) {
            console.log(`[WORKER] タスク ${task.id} は既に処理中またはステータスが変更されています`);
            continue;
          }
          
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
            const sessionId = task.session_id || task.sessionId;
            console.log(`[WORKER] Calling continue-async for session: ${sessionId}`);
            const continueResponse = await fetch(`http://localhost:3000/api/viral/cot-session/${sessionId}/continue-async`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ taskId: task.id }),
              // 30秒のタイムアウトを設定
              signal: AbortSignal.timeout(30000)
            });
            
            if (continueResponse.ok) {
              const result = await continueResponse.json();
              console.log(`[WORKER] Continue API: ${result.message || 'OK'}`);
              if (result.continueUrl) {
                console.log(`[WORKER] Next step URL: ${result.continueUrl}`);
              }
            } else {
              const error = await continueResponse.text();
              console.error('[WORKER] Continue API error:', continueResponse.status, error);
            }
          } catch (e) {
            if (e.name === 'AbortError') {
              console.error('[WORKER] Continue API timeout after 30s');
            } else {
              console.error('[WORKER] Continue API error:', e.message);
            }
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
