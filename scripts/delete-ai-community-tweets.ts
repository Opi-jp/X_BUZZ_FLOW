import { PrismaClient } from '../app/generated/prisma'

const prisma = new PrismaClient()

async function deleteAICommunityTweets() {
  try {
    // AI Community Tweetsソースを取得
    const source = await prisma.newsSource.findFirst({
      where: {
        name: 'AI Community Tweets'
      }
    })
    
    if (!source) {
      console.log('AI Community Tweetsソースが見つかりません')
      return
    }
    
    console.log('AI Community Tweetsソース:', source.id, source.name)
    
    // このソースからの記事数を確認
    const articleCount = await prisma.newsArticle.count({
      where: {
        sourceId: source.id
      }
    })
    
    console.log('削除対象の記事数:', articleCount, '件')
    
    if (articleCount === 0) {
      console.log('削除する記事がありません')
      return
    }
    
    // 確認メッセージ
    console.log(`${articleCount}件のAI Community Tweets記事を削除します...`)
    
    // 記事を削除
    const result = await prisma.newsArticle.deleteMany({
      where: {
        sourceId: source.id
      }
    })
    
    console.log('✅ 削除完了:', result.count, '件の記事を削除しました')
    
    // ソースのアクティブ状態を確認
    console.log('ソースのアクティブ状態:', source.active ? '有効' : '無効')
    console.log('ソース自体は履歴として保持します')
    
  } catch (error) {
    console.error('❌ エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 実行
deleteAICommunityTweets().catch(console.error)