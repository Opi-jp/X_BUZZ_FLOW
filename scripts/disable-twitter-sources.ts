import { prisma } from '../lib/prisma'

async function disableTwitterSources() {
  try {
    // Twitterタイプのソースを無効化
    const result = await prisma.newsSource.updateMany({
      where: {
        type: 'TWITTER'  // 大文字に修正
      },
      data: {
        active: false
      }
    })

    console.log(`${result.count}件のTwitterソースを無効化しました`)

    // 無効化されたソースを確認
    const disabledSources = await prisma.newsSource.findMany({
      where: {
        type: 'TWITTER',  // 大文字に修正
        active: false
      },
      select: {
        name: true,
        url: true
      }
    })

    console.log('\n無効化されたソース:')
    disabledSources.forEach(source => {
      console.log(`- ${source.name} (${source.url})`)
    })

  } catch (error) {
    console.error('エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

disableTwitterSources()