/**
 * カーディ・ダーレのアウトプットをテストするスクリプト
 * APIエンドポイント経由でテスト
 */

const testCardiOutput = async () => {
  console.log('=== カーディ・ダーレ アウトプットテスト ===\n')
  
  // 1. テスト用セッションを作成
  console.log('1. セッション作成中...')
  const sessionResponse = await fetch('http://localhost:3000/api/viral/v2/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      theme: 'AIと働き方の未来',
      platform: 'Twitter',
      style: 'insightful'
    })
  })
  
  const sessionData = await sessionResponse.json()
  const session = sessionData.session
  console.log(`✅ セッションID: ${session.id}\n`)
  
  // 2. 実際のDBからトピックを取得してコンセプトを作成
  console.log('2. 実際のセッションデータからコンセプトを生成...')
  
  // 最新のトピックがあるセッションを探す
  const latestSessionWithTopics = await prisma.viralSession.findFirst({
    where: {
      theme: session.theme,
      topics: { not: null },
      status: { in: ['TOPICS_COLLECTED', 'CONCEPTS_GENERATED', 'CONTENTS_GENERATED', 'COMPLETED'] }
    },
    orderBy: { createdAt: 'desc' }
  })
  
  if (!latestSessionWithTopics || !latestSessionWithTopics.topics) {
    console.error('❌ トピックが収集されたセッションが見つかりません')
    return
  }
  
  const topics = latestSessionWithTopics.topics.parsed || []
  console.log(`✅ ${topics.length}個のトピックを取得（セッションID: ${latestSessionWithTopics.id}）`)
  
  // トピックからコンセプトを生成
  const testConcepts = topics.map((topic, idx) => ({
    conceptId: `concept${idx + 1}`,
    topicTitle: topic.TOPIC,
    topicUrl: topic.url,
    hook: topic.keyPoints ? topic.keyPoints[0] : `${topic.TOPIC}の重要なポイント`,
    angle: topic.perplexityAnalysis || '感情的な要素を含む分析',
    structure: {
      openingHook: `${topic.TOPIC}について知ってる？`,
      background: topic.summary ? topic.summary.substring(0, 100) : '背景情報',
      mainContent: topic.keyPoints ? topic.keyPoints.join(' ') : '主要な内容',
      reflection: '考えさせられる内容',
      cta: 'あなたはどう思う？'
    },
    hashtags: ['AI時代', '働き方革命', 'バズフロー']
  }))
  
  // Prismaを使用してセッションを更新
  const { PrismaClient } = require('../lib/generated/prisma')
  const prisma = new PrismaClient()
  
  await prisma.viralSession.update({
    where: { id: session.id },
    data: {
      status: 'CONCEPTS_GENERATED',
      concepts: testConcepts,
      selectedIds: ['test1', 'test2', 'test3']
    }
  })
  
  console.log('✅ テストコンセプト3つを設定\n')
  
  // 3. カーディでコンテンツ生成（V2エンドポイントを使用）
  console.log('3. カーディ・ダーレでコンテンツ生成（シンプル形式）...')
  const generateResponse = await fetch(`http://localhost:3000/api/viral/v2/sessions/${session.id}/generate-character-contents-v2`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      characterId: 'cardi-dare',
      voiceStyleMode: 'normal',
      format: 'simple'
    })
  })
  
  const generateResult = await generateResponse.json()
  
  if (generateResult.error) {
    console.error('❌ エラー:', generateResult.error)
    return
  }
  
  console.log(`✅ ${generateResult.generatedCount}件のコンテンツを生成\n`)
  
  // 4. 生成された下書きを取得して表示
  console.log('4. 生成されたコンテンツ:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  
  const drafts = await prisma.viralDraftV2.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: 'asc' }
  })
  
  for (const [idx, draft] of drafts.entries()) {
    console.log(`【コンテンツ ${idx + 1}】`)
    console.log(`タイトル: ${draft.title}`)
    
    try {
      const content = JSON.parse(draft.content)
      console.log('\n📝 メイン投稿:')
      console.log(content.mainPost)
      console.log(`(文字数: ${content.mainPost.length})`)
      
      console.log('\n🔗 ツリー投稿:')
      console.log(content.replyPost)
      
    } catch (e) {
      // JSONパースに失敗した場合は直接表示
      console.log('\n📝 投稿:')
      console.log(draft.content)
    }
    
    console.log('\n' + '─'.repeat(50) + '\n')
  }
  
  // 5. スレッド形式もテスト
  console.log('\n5. スレッド形式でも生成...')
  const threadResponse = await fetch(`http://localhost:3000/api/viral/v2/sessions/${session.id}/generate-character-contents-v2`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      characterId: 'cardi-dare',
      voiceStyleMode: 'normal',
      format: 'thread'
    })
  })
  
  const threadResult = await threadResponse.json()
  console.log(`✅ スレッド形式でも${threadResult.generatedCount}件生成\n`)
  
  // スレッド形式の結果も表示
  console.log('6. スレッド形式のコンテンツ:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  
  const threadDrafts = await prisma.viralDraftV2.findMany({
    where: { 
      sessionId: session.id,
      createdAt: { gt: drafts[drafts.length - 1].createdAt }
    },
    orderBy: { createdAt: 'asc' }
  })
  
  for (const [idx, draft] of threadDrafts.entries()) {
    console.log(`【スレッド ${idx + 1}】`)
    console.log(`タイトル: ${draft.title}`)
    
    try {
      const content = JSON.parse(draft.content)
      
      if (content.threadPosts) {
        content.threadPosts.forEach((post, postIdx) => {
          console.log(`\n📝 投稿 ${postIdx + 1}:`)
          console.log(post)
          console.log(`(文字数: ${post.length})`)
        })
        
        console.log('\n🔗 出典:')
        console.log(content.sourcePost)
      }
      
    } catch (e) {
      console.log('\n📝 投稿:')
      console.log(draft.content)
    }
    
    console.log('\n' + '─'.repeat(50) + '\n')
  }
  
  await prisma.$disconnect()
}

// 実行
testCardiOutput().catch(console.error)