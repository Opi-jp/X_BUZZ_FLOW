import { prisma } from '../lib/prisma'

async function checkNewsData() {
  try {
    // ニュースソースの数を確認
    const sourcesCount = await prisma.newsSource.count()
    console.log(`ニュースソース数: ${sourcesCount}`)

    // ニュース記事の数を確認
    const articlesCount = await prisma.newsArticle.count()
    console.log(`ニュース記事数: ${articlesCount}`)

    // 処理済み記事の数を確認
    const processedCount = await prisma.newsArticle.count({
      where: { processed: true }
    })
    console.log(`処理済み記事数: ${processedCount}`)

    // 最新の記事を表示
    const latestArticles = await prisma.newsArticle.findMany({
      take: 5,
      orderBy: { publishedAt: 'desc' },
      include: { source: true }
    })
    
    console.log('\n最新記事:')
    latestArticles.forEach((article, index) => {
      console.log(`${index + 1}. ${article.title}`)
      console.log(`   ソース: ${article.source.name}`)
      console.log(`   日時: ${article.publishedAt}`)
      console.log(`   処理済み: ${article.processed}`)
      console.log(`   重要度: ${article.importance || 'なし'}`)
    })

    // スレッドの数を確認
    const threadsCount = await prisma.newsThread.count()
    console.log(`\nスレッド数: ${threadsCount}`)

  } catch (error) {
    console.error('エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkNewsData()