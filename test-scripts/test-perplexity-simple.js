/**
 * Perplexity API 単純テスト
 */

require('dotenv').config({ path: '.env.local' })

async function testPerplexity() {
  console.log('Perplexity APIテスト')
  console.log('API Key:', process.env.PERPLEXITY_API_KEY ? '設定済み' : '未設定')
  
  if (!process.env.PERPLEXITY_API_KEY) {
    console.error('PERPLEXITY_API_KEYが設定されていません')
    return
  }
  
  try {
    const requestBody = {
      model: 'llama-3.1-sonar-large-128k-online',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant.'
        },
        {
          role: 'user',
          content: 'What is the latest news about AI in 2024?'
        }
      ],
      temperature: 0.2,
      max_tokens: 500
    }
    
    console.log('\nAPIリクエスト送信中...')
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })
    
    console.log('ステータス:', response.status)
    console.log('ステータステキスト:', response.statusText)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('エラー:', errorText)
      return
    }
    
    const result = await response.json()
    console.log('\n成功！')
    console.log('モデル:', result.model)
    console.log('メッセージ:', result.choices?.[0]?.message?.content?.substring(0, 200) + '...')
    
  } catch (error) {
    console.error('エラー:', error)
  }
}

testPerplexity()