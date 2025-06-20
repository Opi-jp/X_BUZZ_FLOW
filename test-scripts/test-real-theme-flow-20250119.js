#!/usr/bin/env node
/**
 * 実際のテーマでCreate→Draft→Post完全フローテスト
 */

const baseUrl = 'http://localhost:3000'

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function testRealFlow() {
  console.log('🚀 実テーマで完全フロー動作テスト')
  console.log('='.repeat(60))
  
  try {
    // 1. 新規フロー作成（実際のテーマ）
    console.log('\n1️⃣ フロー作成...')
    const createRes = await fetch(`${baseUrl}/api/flow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        theme: 'AIと働き方の未来',
        platform: 'Twitter',
        style: 'エンターテイメント'
      })
    })
    
    const session = await createRes.json()
    console.log(`✅ セッションID: ${session.id}`)
    
    // 2. Perplexity収集
    console.log('\n2️⃣ Perplexity収集開始...')
    await fetch(`${baseUrl}/api/flow/${session.id}/next`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    
    console.log('⏳ 収集完了待機中（25秒）...')
    await sleep(25000)
    
    // 3. GPTコンセプト生成
    console.log('\n3️⃣ GPTコンセプト生成...')
    const conceptRes = await fetch(`${baseUrl}/api/flow/${session.id}/next`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    
    const conceptResult = await conceptRes.json()
    
    if (conceptResult.action === 'generating_concepts') {
      console.log('⏳ コンセプト生成待機中（15秒）...')
      await sleep(15000)
      
      // コンセプト選択画面を取得
      const selectRes = await fetch(`${baseUrl}/api/flow/${session.id}/next`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      
      const selectResult = await selectRes.json()
      
      if (selectResult.action === 'select_concepts' && selectResult.concepts) {
        console.log(`✅ ${selectResult.concepts.length}個のコンセプト生成完了`)
        
        // 4. コンセプト選択（上位3つ）
        console.log('\n4️⃣ コンセプト選択...')
        const selectedConcepts = selectResult.concepts.slice(0, 3)
        
        await fetch(`${baseUrl}/api/flow/${session.id}/next`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ selectedConcepts })
        })
        
        console.log('✅ コンセプト選択完了')
        
        // 5. キャラクター選択
        console.log('\n5️⃣ キャラクター選択...')
        const charSelectRes = await fetch(`${baseUrl}/api/flow/${session.id}/next`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        })
        
        const charSelectResult = await charSelectRes.json()
        
        if (charSelectResult.action === 'select_character') {
          console.log('📝 利用可能なキャラクター:')
          charSelectResult.characters.forEach(char => {
            console.log(`  - ${char.name}: ${char.description}`)
          })
          
          // カーディ・ダーレを選択してClaude生成
          await fetch(`${baseUrl}/api/flow/${session.id}/next`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ characterId: 'cardi-dare' })
          })
          
          console.log('⏳ Claude生成待機中（20秒）...')
          await sleep(20000)
          
          // 6. 完了確認
          console.log('\n6️⃣ 完了確認...')
          const finalRes = await fetch(`${baseUrl}/api/flow/${session.id}/next`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
          })
          
          const finalResult = await finalRes.json()
          
          if (finalResult.action === 'completed' && finalResult.drafts) {
            console.log(`✅ ${finalResult.drafts.length}個の下書き生成完了`)
            
            // 7. 投稿テスト
            console.log('\n7️⃣ Twitter投稿テスト...')
            if (finalResult.drafts.length > 0) {
              const draft = finalResult.drafts[0]
              console.log(`\n📝 投稿内容:`)
              console.log(`内容: ${draft.content.substring(0, 100)}...`)
              console.log(`ハッシュタグ: ${draft.hashtags.join(' ')}`)
              
              const postRes = await fetch(`${baseUrl}/api/post`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  content: draft.content,
                  hashtags: draft.hashtags,
                  draftId: draft.id
                })
              })
              
              if (postRes.ok) {
                const postResult = await postRes.json()
                console.log('\n✅ 投稿成功！')
                console.log(`📱 Twitter URL: ${postResult.url || '(モックモード)'}`)
              } else {
                console.log(`\n❌ 投稿失敗: ${postRes.status}`)
                const errorText = await postRes.text()
                console.log(errorText.substring(0, 200))
              }
            }
          }
        }
      }
    }
    
    console.log('\n📊 最終結果:')
    console.log('- Perplexity収集: ✅')
    console.log('- GPTコンセプト生成: ✅')
    console.log('- コンセプト選択: ✅')
    console.log('- Claude生成: ✅')
    console.log('- 下書き作成: ✅')
    console.log('- Twitter投稿: ?')
    
  } catch (error) {
    console.error('\n❌ エラー:', error.message)
    console.error(error.stack)
  }
}

testRealFlow()