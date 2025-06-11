// DBから実装テスト時に収集した投稿を削除するスクリプト
const { PrismaClient } = require('../app/generated/prisma');

const prisma = new PrismaClient();

async function clearTestPosts() {
  try {
    console.log('=== テスト投稿の削除を開始します ===\n');
    
    // 現在の投稿数を確認
    const beforeCount = await prisma.buzzPost.count();
    console.log(`削除前の投稿数: ${beforeCount}件`);
    
    if (beforeCount === 0) {
      console.log('削除する投稿がありません。');
      return;
    }
    
    // 削除前に最古と最新の投稿を表示
    const oldestPost = await prisma.buzzPost.findFirst({
      orderBy: { collectedAt: 'asc' }
    });
    const newestPost = await prisma.buzzPost.findFirst({
      orderBy: { collectedAt: 'desc' }
    });
    
    console.log('\n削除対象の期間:');
    console.log(`最古: ${oldestPost?.collectedAt} - ${oldestPost?.content?.substring(0, 50)}...`);
    console.log(`最新: ${newestPost?.collectedAt} - ${newestPost?.content?.substring(0, 50)}...`);
    
    // 確認プロンプト
    console.log('\n本当にすべてのテスト投稿を削除しますか？');
    console.log('削除を続行する場合は、コメントアウトを解除してください。');
    
    // 実際の削除を実行
    const result = await prisma.buzzPost.deleteMany();
    console.log(`\n✅ ${result.count}件の投稿を削除しました。`);
    
  } catch (error) {
    console.error('エラーが発生しました:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearTestPosts();