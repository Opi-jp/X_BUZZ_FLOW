import { prisma } from '../lib/prisma'

async function checkTwitterSources() {
  try {
    // すべてのソースタイプを確認
    const sourcesByType = await prisma.newsSource.groupBy({
      by: ['type'],
      _count: true
    })

    console.log('ソースタイプ別の数:')
    sourcesByType.forEach(group => {
      console.log(`- ${group.type}: ${group._count}件`)
    })

    // TwitterまたはX関連のソースを検索
    const twitterSources = await prisma.newsSource.findMany({
      where: {
        OR: [
          { type: { contains: 'twitter', mode: 'insensitive' } },
          { type: { contains: 'x', mode: 'insensitive' } },
          { url: { contains: 'twitter.com', mode: 'insensitive' } },
          { url: { contains: 'x.com', mode: 'insensitive' } },
          { name: { contains: 'Twitter', mode: 'insensitive' } },
          { category: { contains: 'twitter', mode: 'insensitive' } }
        ]
      }
    })

    console.log(`\nTwitter/X関連のソース: ${twitterSources.length}件`)
    twitterSources.forEach(source => {
      console.log(`- ${source.name}`)
      console.log(`  Type: ${source.type}`)
      console.log(`  URL: ${source.url}`)
      console.log(`  Category: ${source.category}`)
      console.log(`  Active: ${source.active}`)
      console.log('')
    })

  } catch (error) {
    console.error('エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkTwitterSources()