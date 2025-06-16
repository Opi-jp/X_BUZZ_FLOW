#!/usr/bin/env node

/**
 * Perplexity分析テスト
 * 目的：実際の検索結果をPerplexityで分析し、品質を評価する
 */

import fs from 'fs';
import dotenv from 'dotenv';
// Perplexity APIの直接実装（TypeScriptモジュールの問題を回避）
class PerplexityClient {
  constructor() {
    this.apiKey = process.env.PERPLEXITY_API_KEY;
    this.baseUrl = 'https://api.perplexity.ai';
    this.model = 'llama-3.1-sonar-large-128k-online';
  }
  
  async searchWithContext(options) {
    const { query, systemPrompt, searchDomains = [] } = options;
    
    const requestBody = {
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ],
      temperature: 0.2,
      max_tokens: 2000,
      search_domain_filter: searchDomains.length > 0 ? searchDomains : undefined,
      search_recency_filter: 'week',
      return_citations: true
    };
    
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Perplexity API error: ${response.status} - ${error}`);
    }
    
    return await response.json();
  }
}

// 環境変数読み込み
dotenv.config({ path: ['.env.local', '.env'] });

async function testPerplexityAnalysis() {
  console.log('🚀 Perplexity分析テストを開始します...');
  
  // 検索結果を読み込み
  const searchResults = JSON.parse(
    fs.readFileSync('./search-results.json', 'utf-8')
  );
  
  // テスト用に上位5件を選択
  const testArticles = searchResults.results.slice(0, 5);
  console.log(`\n📊 分析対象: ${testArticles.length}件の記事`);
  
  const perplexity = new PerplexityClient();
  const analysisResults = [];
  
  for (const [index, article] of testArticles.entries()) {
    console.log(`\n📄 記事 ${index + 1}/${testArticles.length}: ${article.title}`);
    console.log(`   URL: ${article.url}`);
    
    const startTime = Date.now();
    
    try {
      // Perplexityで記事を分析
      const prompt = `
以下の記事を読んで、「AIと働き方」の観点からバイラルコンテンツの機会を分析してください。

記事URL: ${article.url}
タイトル: ${article.title}
検索クエリ: ${article.query}

以下の形式で分析結果を提供してください：

## 要約（200-300文字）
[記事の主要内容と話題になっている理由]

## キーポイント
- [重要ポイント1]
- [重要ポイント2]
- [重要ポイント3]

## 感情的要素
トーン: [議論的/共感的/警告的/楽観的など]
感情トリガー: [具体的な要素]

## 議論性
レベル: [高/中/低]
論点: [具体的な議論ポイント]

## バイラル要素
- 強い意見: [あり/なし] - [詳細]
- 感情的トリガー: [あり/なし] - [詳細]
- 時間的緊急性: [あり/なし] - [詳細]
- 共感性: [あり/なし] - [詳細]

## AIと働き方との関連性
[この記事から導き出せる独自の視点]

## 重要な引用
[印象的な発言や数字があれば]`;

      const response = await perplexity.searchWithContext({
        query: `analyze article: ${article.url}`,
        systemPrompt: prompt,
        searchDomains: [new URL(article.url).hostname]
      });
      
      const analysisTime = Date.now() - startTime;
      const content = response.choices?.[0]?.message?.content || '';
      
      console.log(`   ✅ 分析完了（${(analysisTime / 1000).toFixed(2)}秒）`);
      console.log(`   📝 分析結果の長さ: ${content.length}文字`);
      
      // 分析品質の簡易評価
      const qualityScore = evaluateQuality(content);
      console.log(`   ⭐ 品質スコア: ${(qualityScore * 100).toFixed(0)}%`);
      
      analysisResults.push({
        article: {
          title: article.title,
          url: article.url,
          originalSnippet: article.snippet
        },
        analysis: {
          content: content,
          responseTime: analysisTime,
          contentLength: content.length,
          qualityScore: qualityScore
        },
        timestamp: new Date().toISOString()
      });
      
      // サンプル表示（最初の500文字）
      console.log('\n   --- 分析結果サンプル ---');
      console.log(content.substring(0, 500) + '...\n');
      
    } catch (error) {
      console.error(`   ❌ エラー:`, error.message);
      analysisResults.push({
        article: article,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
    
    // API制限を考慮して少し待機
    if (index < testArticles.length - 1) {
      console.log('   ⏳ 次の記事まで2秒待機...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // 結果のサマリー
  console.log('\n📊 分析結果サマリー:');
  const successful = analysisResults.filter(r => !r.error).length;
  console.log(`- 成功: ${successful}/${analysisResults.length}件`);
  
  if (successful > 0) {
    const avgTime = analysisResults
      .filter(r => r.analysis)
      .reduce((sum, r) => sum + r.analysis.responseTime, 0) / successful;
    console.log(`- 平均分析時間: ${(avgTime / 1000).toFixed(2)}秒`);
    
    const avgQuality = analysisResults
      .filter(r => r.analysis)
      .reduce((sum, r) => sum + r.analysis.qualityScore, 0) / successful;
    console.log(`- 平均品質スコア: ${(avgQuality * 100).toFixed(0)}%`);
  }
  
  // 結果を保存
  fs.writeFileSync(
    './perplexity-analysis-results.json',
    JSON.stringify(analysisResults, null, 2)
  );
  
  console.log('\n💾 詳細な結果を perplexity-analysis-results.json に保存しました');
  
  // Snippetとの比較
  if (successful > 0) {
    console.log('\n🔍 Snippet vs Perplexity分析の比較:');
    const firstResult = analysisResults.find(r => r.analysis);
    console.log('\n【元のSnippet】');
    console.log(firstResult.article.originalSnippet);
    console.log('\n【Perplexity分析（要約部分）】');
    const summaryMatch = firstResult.analysis.content.match(/##\s*要約[^#]*/);
    if (summaryMatch) {
      console.log(summaryMatch[0].trim());
    }
  }
}

// 分析品質の簡易評価
function evaluateQuality(content) {
  let score = 0;
  const checks = [
    { pattern: /##\s*要約/, weight: 0.2 },
    { pattern: /##\s*キーポイント/, weight: 0.15 },
    { pattern: /##\s*感情的要素/, weight: 0.15 },
    { pattern: /##\s*議論性/, weight: 0.15 },
    { pattern: /##\s*バイラル要素/, weight: 0.15 },
    { pattern: /##\s*関連性/, weight: 0.1 },
    { pattern: /##\s*重要な引用/, weight: 0.1 }
  ];
  
  checks.forEach(check => {
    if (check.pattern.test(content)) {
      score += check.weight;
    }
  });
  
  // コンテンツの長さボーナス
  if (content.length > 1000) score = Math.min(1, score * 1.1);
  if (content.length > 2000) score = Math.min(1, score * 1.1);
  
  return score;
}

// 実行
testPerplexityAnalysis().catch(console.error);