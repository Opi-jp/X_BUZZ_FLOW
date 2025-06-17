const { PrismaClient } = require('../lib/generated/prisma')
const prisma = new PrismaClient()

async function checkVariationSystem() {
  try {
    // 最新のセッションでcontents内のpreviousContentsを確認
    const session = await prisma.viralSession.findFirst({
      where: {
        characterProfileId: 'cardi-dare',
        contents: { not: null }
      },
      orderBy: { createdAt: 'desc' }
    })

    if (!session) {
      console.log('カーディセッションが見つかりません')
      return
    }

    console.log('\n=== バリエーションシステムの確認 ===')
    console.log('セッションID:', session.id)
    console.log('コンテンツ数:', session.contents.length)

    // APIを直接呼んでテスト
    console.log('\n=== APIテスト用のデータ ===')
    console.log('セッションID（コピー用）:', session.id)
    
    // 最近成功したセッションのコンセプトを表示
    if (session.concepts && Array.isArray(session.concepts)) {
      console.log('\n利用可能なコンセプト:')
      session.concepts.slice(0, 3).forEach((concept, idx) => {
        console.log(`\n【コンセプト${idx + 1}】`)
        console.log('ID:', concept.conceptId)
        console.log('トピック:', concept.topicTitle)
        console.log('フック:', concept.structure?.openingHook || concept.hook)
      })
    }

    // 実際の生成履歴を確認
    const drafts = await prisma.viralDraftV2.findMany({
      where: {
        sessionId: session.id,
        characterId: 'cardi-dare'
      },
      orderBy: { createdAt: 'asc' }
    })

    console.log('\n\n=== 生成順序と内容 ===')
    drafts.forEach((draft, idx) => {
      console.log(`\n【${idx + 1}番目に生成】`)
      console.log('コンセプトID:', draft.conceptId)
      console.log('冒頭50文字:', draft.content.substring(0, 50))
      console.log('作成時刻:', draft.createdAt)
    })

  } catch (error) {
    console.error('エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkVariationSystem()