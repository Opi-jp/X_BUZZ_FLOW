#!/usr/bin/env node
/**
 * Create→Draft→Post完全フローテスト
 */

const baseUrl = 'http://localhost:3000'

async function testFullFlow() {
  console.log('🚀 完全フロー動作テスト（Create→Draft→Post）')
  console.log('='.repeat(60))
  
  try {
    // 1. 新規フロー作成
    console.log('\n1️⃣ フロー作成...')
    const createRes = await fetch(`${baseUrl}/api/flow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        theme: '完全フローテスト',
        platform: 'Twitter',
        style: 'エンターテイメント'
      })
    })
    
    const session = await createRes.json()
    console.log(`✅ セッションID: ${session.id}`)
    
    // 2. Perplexity収集
    console.log('\n2️⃣ Perplexity収集実行...')
    const collectRes = await fetch(`${baseUrl}/api/flow/${session.id}/next`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    
    if (collectRes.ok) {
      console.log('✅ 収集開始')
      
      // 収集完了を待つ
      await new Promise(resolve => setTimeout(resolve, 25000))
      
      // 3. 状態確認
      const statusRes = await fetch(`${baseUrl}/api/flow/${session.id}`)
      const status = await statusRes.json()
      console.log(`📊 ステータス: ${status.status}`)
      
      if (status.topics) {
        console.log('✅ トピック収集完了')
        
        // 4. GPTコンセプト生成
        console.log('\n3️⃣ GPTコンセプト生成...')
        const conceptRes = await fetch(`${baseUrl}/api/flow/${session.id}/next`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        })
        
        if (conceptRes.ok) {
          const conceptResult = await conceptRes.json()
          
          if (conceptResult.action === 'select_concepts' && conceptResult.concepts) {
            console.log(`✅ ${conceptResult.concepts.length}個のコンセプト生成完了`)
            
            // 5. コンセプト選択
            console.log('\n4️⃣ コンセプト選択...')
            const selectedConcepts = conceptResult.concepts.slice(0, 3)
            
            const selectRes = await fetch(`${baseUrl}/api/flow/${session.id}/next`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ selectedConcepts })
            })
            
            if (selectRes.ok) {
              console.log('✅ コンセプト選択完了')
              
              // 6. キャラクター選択とClaude生成
              console.log('\n5️⃣ キャラクター選択とClaude生成...')
              const charRes = await fetch(`${baseUrl}/api/flow/${session.id}/next`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ characterId: 'cardi-dare' })
              })
              
              if (charRes.ok) {
                const charResult = await charRes.json()
                
                if (charResult.action === 'completed' && charResult.drafts) {
                  console.log(`✅ ${charResult.drafts.length}個の下書き生成完了`)
                  
                  // 7. 投稿実行
                  console.log('\n6️⃣ Twitter投稿...')
                  if (charResult.drafts.length > 0) {
                    const draft = charResult.drafts[0]
                    
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
                      console.log('✅ 投稿成功！')
                      console.log(`📱 Twitter URL: ${postResult.url}`)
                    } else {
                      console.log('❌ 投稿失敗:', postRes.status)
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    
    console.log('\n📊 フロー完了状態:')
    console.log('- Perplexity収集: ✅')
    console.log('- GPTコンセプト生成: ?')
    console.log('- コンセプト選択: ?')
    console.log('- Claude生成: ?')
    console.log('- 下書き作成: ?')
    console.log('- Twitter投稿: ?')
    
  } catch (error) {
    console.error('❌ エラー:', error.message)
  }
}

testFullFlow()