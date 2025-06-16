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
    
    // 以下のモックレスポンスは削除
    /*
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
          },
          {
            question: "企業がAIを導入することで生まれる新しい職種や働き方の変化は？2025年の最新事例を教えて",
            category: "C",
            strategicIntent: "AI導入による雇用形態の変化を理解",
            viralAngle: "職業の未来への不安と希望"
          },
          {
            question: "AIとの協働で成功している日本企業の事例は？効率化と創造性の両立について",
            category: "D",
            strategicIntent: "日本企業の具体的な成功事例を収集",
            viralAngle: "日本企業の成功ストーリー"
          },
          {
            question: "AIが仕事を奪うのではなく人間の能力を拡張する最新の取り組みとは？",
            category: "A",
            strategicIntent: "AI共存の新しいパラダイムを探る",
            viralAngle: "前向きな未来への希望"
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
  
  // Phase 2 THINK
  if (prompt.includes('opportunities') && prompt.includes('ウイルス速度指標')) {
    return {
      content: JSON.stringify({
        evaluations: [
          { opportunity: "AIツールによる働き方革命", score: 9.2, viralVelocity: "高", contentAngle: "専門家による内部視点" },
          { opportunity: "企業のAI導入と新職種", score: 8.5, viralVelocity: "中", contentAngle: "成功事例の舞台裏" },
          { opportunity: "AIとの協働成功事例", score: 8.8, viralVelocity: "高", contentAngle: "個人的なつながりの物語" }
        ],
        topOpportunities: ["AIツールによる働き方革命", "AIとの協働成功事例", "企業のAI導入と新職種"]
      }),
      usage: { total_tokens: 400 }
    };
  }
  
  // Phase 2 INTEGRATE
  if (prompt.includes('evaluations') && prompt.includes('concepts')) {
    return {
      content: JSON.stringify({
        concepts: [
          {
            number: 1,
            title: "AIが変える新卒採用の衝撃",
            opportunity: "AIツールによる働き方革命",
            hook: "🚨 就活生必見！AIが面接官になる時代、あなたの準備は大丈夫？",
            angle: "若者視点での不安と期待",
            format: "スレッド形式",
            viralPotential: "高"
          },
          {
            number: 2,
            title: "成功企業のAI導入の真実",
            opportunity: "企業のAI導入と新職種",
            hook: "大手企業がひた隠すAI導入の失敗談を暴露します",
            angle: "内部関係者の証言",
            format: "単一投稿",
            viralPotential: "中"
          },
          {
            number: 3,
            title: "AIと人間の共創ストーリー",
            opportunity: "AIとの協働成功事例",
            hook: "AIに仕事を奪われると思っていた私が、AIと最高のパートナーになった理由",
            angle: "個人体験談",
            format: "カルーセル",
            viralPotential: "高"
          }
        ]
      }),
      usage: { total_tokens: 500 }
    };
  }
  
  // Phase 3 INTEGRATE
  if (prompt.includes('concepts') && prompt.includes('contents')) {
    return {
      content: JSON.stringify({
        contents: [
          {
            conceptNumber: 1,
            title: "AIが変える新卒採用の衝撃",
            mainPost: "🚨 就活生必見！\n\nAIが面接官になる時代が来ました。\n\n大手企業の80%が既にAI面接を導入。\nでも誰も教えてくれない「AI面接攻略法」があるんです。\n\n実は、AIは〇〇を重視している！\n\n#就活 #AI時代 #新卒採用",
            hashtags: ["就活", "AI時代", "新卒採用"],
            visualDescription: "AIロボットと向き合う就活生のイラスト"
          },
          {
            conceptNumber: 2,
            title: "成功企業のAI導入の真実",
            mainPost: "【衝撃】大手企業のAI導入、実は失敗だらけ？\n\n「AI導入で生産性2倍！」\nそんな成功事例の裏側には...\n\n・導入コスト回収に5年\n・社員の反発で頓挫\n・期待した効果の30%しか実現せず\n\nでも、失敗から学んだ企業は強い。\n\n#AI導入 #企業変革 #DX",
            hashtags: ["AI導入", "企業変革", "DX"],
            visualDescription: "グラフと困惑するビジネスパーソン"
          },
          {
            conceptNumber: 3,
            title: "AIと人間の共創ストーリー",
            mainPost: "AIに仕事を奪われる...\n\nそう思っていた私が、今ではAIと最高のパートナー。\n\n変わったのは「考え方」だけ。\n\nAIを「競争相手」から「相棒」に。\n結果、収入は3倍に！\n\nAIとの付き合い方、教えます。\n\n#AI共創 #働き方改革 #未来の仕事",
            hashtags: ["AI共創", "働き方改革", "未来の仕事"],
            visualDescription: "人間とAIが協力して働く様子"
          }
        ]
      }),
      usage: { total_tokens: 600 }
    };
  }
  
  // Phase 4 INTEGRATE
  if (prompt.includes('strategy')) {
    return {
      content: JSON.stringify({
        executionPlan: {
          immediateActions: ["ビジュアル素材の準備", "投稿時間の設定"],
          postingSchedule: ["平日18:00-20:00", "週末10:00-12:00"],
          engagementTactics: ["最初の1時間でリプライ対応", "インフルエンサーへのメンション"]
        },
        kpis: {
          impressions: 10000,
          engagementRate: 5,
          shares: 100
        },
        riskAssessment: "炎上リスクは低い。事実に基づいた内容で構成。"
      }),
      usage: { total_tokens: 400 }
    };
  }
  
    // デフォルトのモック
    return {
      content: JSON.stringify({
        result: "Mock response for phase",
        status: "completed"
      }),
      usage: { total_tokens: 300 }
    };
  }
  */
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