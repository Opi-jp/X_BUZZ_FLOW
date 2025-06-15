const { PrismaClient } = require('./app/generated/prisma')
const prisma = new PrismaClient()

async function checkPhase3() {
  const sessionId = 'a2a3c490-c41d-4db8-964c-7964c83f21b7'
  
  try {
    // Phase 3の結果を取得
    const phase3 = await prisma.cotPhase.findFirst({
      where: {
        sessionId,
        phaseNumber: 3
      }
    })
    
    if (!phase3) {
      console.log('Phase 3の結果が見つかりません')
      return
    }
    
    console.log('=== Phase 3 実行状態 ===')
    console.log('ステータス:', phase3.status)
    console.log('実行日時:', phase3.integrateAt)
    console.log()
    
    if (phase3.integrateResult) {
      const result = phase3.integrateResult
      console.log('=== Phase 3 INTEGRATE 出力結果 ===')
      console.log()
      
      if (result.contents && Array.isArray(result.contents)) {
        console.log(`生成されたコンテンツ数: ${result.contents.length}`)
        console.log()
        
        result.contents.forEach((content, index) => {
          console.log(`📝 コンテンツ${index + 1}:`)
          console.log(`  タイトル: ${content.title}`)
          console.log(`  形式: ${content.conceptNumber === 1 ? 'thread' : content.conceptNumber === 2 ? 'video' : 'carousel'}`)
          console.log(`  ニュースソース: ${content.newsSource}`)
          console.log(`  ソースURL: ${content.sourceUrl}`)
          console.log(`  ハッシュタグ: ${content.hashtags.join(', ')}`)
          console.log()
          console.log('  投稿文:')
          console.log('  ' + content.mainPost.split('\n').join('\n  '))
          console.log()
          console.log(`  視覚的説明: ${content.visualDescription}`)
          console.log(`  投稿のヒント: ${content.postingNotes}`)
          console.log()
          console.log('---')
          console.log()
        })
      }
    }
    
  } catch (error) {
    console.error('エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkPhase3()