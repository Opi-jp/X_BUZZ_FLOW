#!/usr/bin/env node

/**
 * Google Custom Search API の単体テスト
 */

require('dotenv').config({ path: '.env.local' })

async function testGoogleSearch() {
  console.log('🔍 Google Custom Search API テスト\n')
  
  // 環境変数チェック
  console.log('📋 環境変数チェック:')
  console.log('GOOGLE_API_KEY:', process.env.GOOGLE_API_KEY ? `✅ 設定済み (${process.env.GOOGLE_API_KEY.substring(0, 10)}...)` : '❌ 未設定')
  console.log('GOOGLE_SEARCH_ENGINE_ID:', process.env.GOOGLE_SEARCH_ENGINE_ID ? `✅ 設定済み (${process.env.GOOGLE_SEARCH_ENGINE_ID})` : '❌ 未設定')
  console.log('')

  if (!process.env.GOOGLE_API_KEY || !process.env.GOOGLE_SEARCH_ENGINE_ID) {
    console.error('❌ 必要な環境変数が設定されていません')
    return
  }

  // 直接Google APIを呼び出す
  const searchQueries = [
    { query: 'AI workplace automation 2025', lang: 'en' },
    { query: 'AI 働き方改革 最新 2025', lang: 'ja' },
    { query: 'ChatGPT business impact latest', lang: 'en' }
  ]

  for (const { query, lang } of searchQueries) {
    console.log(`\n🔎 検索: "${query}" (${lang})`)
    
    try {
      const params = new URLSearchParams({
        key: process.env.GOOGLE_API_KEY,
        cx: process.env.GOOGLE_SEARCH_ENGINE_ID,
        q: query,
        num: '3',
        dateRestrict: 'd7', // 7日以内
        ...(lang === 'ja' && { lr: 'lang_ja' })
      })

      const url = `https://www.googleapis.com/customsearch/v1?${params}`
      console.log(`URL: ${url.replace(process.env.GOOGLE_API_KEY, 'API_KEY_HIDDEN')}\n`)

      const response = await fetch(url)
      const data = await response.json()

      if (!response.ok) {
        console.error(`❌ エラー: ${response.status} - ${data.error?.message || 'Unknown error'}`)
        continue
      }

      console.log(`✅ 検索成功! 結果数: ${data.items?.length || 0}`)
      
      if (data.items) {
        data.items.forEach((item, index) => {
          console.log(`\n${index + 1}. ${item.title}`)
          console.log(`   URL: ${item.link}`)
          console.log(`   ${item.snippet}`)
        })
      } else {
        console.log('検索結果がありません')
      }

      // API使用状況
      if (data.searchInformation) {
        console.log(`\n📊 検索情報:`)
        console.log(`   総結果数: ${data.searchInformation.totalResults}`)
        console.log(`   検索時間: ${data.searchInformation.searchTime}秒`)
      }

    } catch (error) {
      console.error(`❌ エラー:`, error.message)
    }
  }
}

// 実行
console.log('=== Google Custom Search API 直接テスト ===')
testGoogleSearch().catch(console.error)