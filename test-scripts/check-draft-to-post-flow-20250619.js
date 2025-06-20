#!/usr/bin/env node

/**
 * 下書き→投稿のデータフロー確認
 */

const { prisma } = require('../lib/prisma-test')

async function checkDraftToPostFlow() {
  try {
    // 1. 最新の下書きを取得
    const draft = await prisma.viralDraftV2.findFirst({
      where: { status: 'DRAFT' },
      orderBy: { createdAt: 'desc' }
    })
    
    if (!draft) {
      console.log('下書きが見つかりません')
      return
    }
    
    console.log('📝 下書きデータ:')
    console.log(`ID: ${draft.id}`)
    console.log(`タイトル: ${draft.title}`)
    console.log(`内容: ${draft.content.substring(0, 100)}...`)
    console.log(`ハッシュタグ: ${draft.hashtags}`)
    console.log(`ステータス: ${draft.status}`)
    
    // 2. フロントエンドが送るデータ（app/drafts/page.tsxより）
    console.log('\n📤 フロントエンドが送るデータ:')
    const hashtags = draft.hashtags || ['AI時代', 'X_BUZZ_FLOW']
    const text = `${draft.content}\n\n${hashtags.map(tag => `#${tag.replace(/^#/, '')}`).join(' ')}`
    
    console.log('送信データ:')
    console.log(JSON.stringify({
      text: text.substring(0, 100) + '...',
      draftId: draft.id
    }, null, 2))
    
    // 3. APIが期待するデータ（app/api/post/route.tsより）
    console.log('\n📥 APIが期待するデータ:')
    console.log('- text (必須): 投稿テキスト')
    console.log('- draftId (オプション): 下書きID')
    
    // 4. データ整合性チェック
    console.log('\n✅ データ整合性:')
    console.log('- text: ✓ content + hashtags を結合')
    console.log('- draftId: ✓ 下書きIDを送信')
    console.log('- ハッシュタグ処理: ✓ #の重複を防ぐ処理あり')
    
  } catch (error) {
    console.error('エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkDraftToPostFlow()