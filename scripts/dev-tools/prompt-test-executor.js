#!/usr/bin/env node

/**
 * プロンプトテスト実行ツール
 * 
 * 実際のLLM APIを呼び出してプロンプトをテストする
 */

const fs = require('fs').promises
const path = require('path')

class PromptTestExecutor {
  constructor() {
    this.apiConfigs = {
      perplexity: {
        url: 'https://api.perplexity.ai/chat/completions',
        model: 'llama-3.1-sonar-large-128k-online',
        headers: {
          'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json'
        }
      },
      gpt: {
        url: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-4o',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      },
      claude: {
        url: 'https://api.anthropic.com/v1/messages',
        model: 'claude-sonnet-4-20250514',
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        }
      }
    }
  }

  /**
   * プロンプトを実行
   */
  async execute(provider, prompt, options = {}) {
    const config = this.apiConfigs[provider]
    
    if (!config) {
      throw new Error(`不明なプロバイダー: ${provider}`)
    }
    
    // APIキーチェック
    const apiKeyName = provider === 'perplexity' ? 'PERPLEXITY_API_KEY' : 
                      provider === 'gpt' ? 'OPENAI_API_KEY' : 
                      'ANTHROPIC_API_KEY'
    
    if (!config.headers.Authorization && !config.headers['x-api-key']) {
      throw new Error(`${apiKeyName}が設定されていません`)
    }
    
    console.log(`\n🚀 ${provider.toUpperCase()} APIを呼び出し中...`)
    
    try {
      const startTime = Date.now()
      
      // リクエストボディの構築
      const body = this.buildRequestBody(provider, prompt, options)
      
      // API呼び出し
      const response = await fetch(config.url, {
        method: 'POST',
        headers: config.headers,
        body: JSON.stringify(body)
      })
      
      const elapsedTime = Date.now() - startTime
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API Error (${response.status}): ${errorText}`)
      }
      
      const result = await response.json()
      
      // レスポンスの解析
      const content = this.parseResponse(provider, result)
      
      return {
        success: true,
        provider,
        model: config.model,
        executionTime: elapsedTime,
        content,
        usage: result.usage || null,
        raw: result
      }
    } catch (error) {
      return {
        success: false,
        provider,
        error: error.message,
        content: null
      }
    }
  }

  /**
   * リクエストボディを構築
   */
  buildRequestBody(provider, prompt, options) {
    const config = this.apiConfigs[provider]
    
    switch (provider) {
      case 'perplexity':
        return {
          model: config.model,
          messages: [
            {
              role: 'system',
              content: options.systemPrompt || 'あなたは優秀なアシスタントです。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 4000
        }
        
      case 'gpt':
        return {
          model: config.model,
          messages: [
            {
              role: 'system',
              content: options.systemPrompt || 'あなたは優秀なアシスタントです。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 4000,
          response_format: options.jsonMode ? { type: "json_object" } : undefined
        }
        
      case 'claude':
        return {
          model: config.model,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          system: options.systemPrompt || 'あなたは優秀なアシスタントです。',
          max_tokens: options.maxTokens || 4000,
          temperature: options.temperature || 0.7
        }
        
      default:
        throw new Error(`未対応のプロバイダー: ${provider}`)
    }
  }

  /**
   * レスポンスを解析
   */
  parseResponse(provider, result) {
    switch (provider) {
      case 'perplexity':
      case 'gpt':
        return result.choices[0].message.content
        
      case 'claude':
        return result.content[0].text
        
      default:
        return JSON.stringify(result)
    }
  }

  /**
   * テスト結果を保存
   */
  async saveResult(result, filename) {
    const resultsDir = path.join(process.cwd(), 'prompt-test-results')
    await fs.mkdir(resultsDir, { recursive: true })
    
    const timestamp = new Date().toISOString().replace(/:/g, '-')
    const resultFile = path.join(resultsDir, `${filename}-${timestamp}.json`)
    
    await fs.writeFile(resultFile, JSON.stringify(result, null, 2))
    
    console.log(`\n💾 結果を保存しました: ${resultFile}`)
    
    return resultFile
  }

  /**
   * 結果を表示
   */
  displayResult(result) {
    console.log('\n' + '='.repeat(80))
    console.log('📊 テスト結果')
    console.log('='.repeat(80))
    
    if (result.success) {
      console.log(`✅ 成功`)
      console.log(`プロバイダー: ${result.provider}`)
      console.log(`モデル: ${result.model}`)
      console.log(`実行時間: ${result.executionTime}ms`)
      
      if (result.usage) {
        console.log(`トークン使用量:`)
        console.log(`  - 入力: ${result.usage.prompt_tokens}`)
        console.log(`  - 出力: ${result.usage.completion_tokens}`)
        console.log(`  - 合計: ${result.usage.total_tokens}`)
      }
      
      console.log('\n📝 出力内容:')
      console.log('-'.repeat(80))
      
      // JSON形式の場合はパース
      try {
        const json = JSON.parse(result.content)
        console.log(JSON.stringify(json, null, 2))
      } catch {
        // JSONでない場合はそのまま表示
        console.log(result.content)
      }
      
    } else {
      console.log(`❌ 失敗`)
      console.log(`プロバイダー: ${result.provider}`)
      console.log(`エラー: ${result.error}`)
    }
  }

  /**
   * 比較実行
   */
  async compareProviders(prompt, options = {}) {
    const results = []
    
    for (const provider of ['perplexity', 'gpt', 'claude']) {
      const result = await this.execute(provider, prompt, options)
      results.push(result)
      
      if (result.success) {
        console.log(`✅ ${provider}: 成功 (${result.executionTime}ms)`)
      } else {
        console.log(`❌ ${provider}: 失敗 - ${result.error}`)
      }
    }
    
    return results
  }
}

// エクスポート
module.exports = PromptTestExecutor

// CLI実行
if (require.main === module) {
  const executor = new PromptTestExecutor()
  
  async function main() {
    const [,, provider, ...args] = process.argv
    
    if (!provider) {
      console.log(`
🧪 プロンプトテスト実行ツール

使い方:
  node prompt-test-executor.js <provider> <prompt>
  node prompt-test-executor.js compare <prompt>

プロバイダー:
  perplexity, gpt, claude, compare

例:
  node prompt-test-executor.js gpt "AIの未来について教えて"
  node prompt-test-executor.js compare "最新のAIトレンドは？"
      `)
      return
    }
    
    const prompt = args.join(' ') || 'テストプロンプト'
    
    if (provider === 'compare') {
      const results = await executor.compareProviders(prompt)
      console.log('\n📊 比較結果サマリー')
      results.forEach(r => {
        if (r.success) {
          console.log(`${r.provider}: ${r.executionTime}ms`)
        }
      })
    } else {
      const result = await executor.execute(provider, prompt)
      executor.displayResult(result)
    }
  }
  
  // .env読み込み
  require('dotenv').config({ path: '.env.local' })
  require('dotenv').config({ path: '.env' })
  
  main().catch(console.error)
}