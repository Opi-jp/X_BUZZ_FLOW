const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

async function cleanupIrrelevantPosts() {
  console.log('=== 無意味な投稿の削除処理 ===\n');
  
  try {
    // まず全投稿を取得
    const allPosts = await prisma.buzzPost.findMany({
      orderBy: { collectedAt: 'desc' }
    });
    
    console.log(`総投稿数: ${allPosts.length}件\n`);
    
    // 削除対象のパターン
    const deletePatterns = {
      political: ['選挙', '政治', '政党', '議員', '内閣', '国会', '税金', '年金', '政府', '参政党', 'ファースト'],
      entertainment: ['ガンダム', 'アニメ', 'ゲーム', '声優', 'Vtuber', '配信', 'イラスト', '漫画', 'ドラマ', 'シャア', 'キシリア', 'ニュータイプ'],
      spam: ['懸賞', 'プレゼント', 'キャンペーン', 'フォロー&RT', '拡散希望', 'お願いします'],
      lowQuality: ['試してみた', '使ってみた', '行ってみた']
    };
    
    const postsToDelete = [];
    const deleteReasons = {};
    
    // 各投稿をチェック
    for (const post of allPosts) {
      const content = post.content;
      let shouldDelete = false;
      let reason = '';
      
      // AI関連のキーワードが全く含まれていない
      const aiKeywords = ['AI', 'ChatGPT', 'Claude', '生成AI', 'Copilot', 'プロンプト', '効率化', '自動化', 'ビジネス', '副業', 'リモート'];
      const hasAIRelatedContent = aiKeywords.some(keyword => content.includes(keyword));
      
      if (!hasAIRelatedContent) {
        // パターンマッチング
        for (const [category, patterns] of Object.entries(deletePatterns)) {
          if (patterns.some(pattern => content.includes(pattern))) {
            shouldDelete = true;
            reason = category;
            break;
          }
        }
        
        // 短すぎる投稿
        if (!shouldDelete && content.length < 50) {
          shouldDelete = true;
          reason = 'tooShort';
        }
      }
      
      if (shouldDelete) {
        postsToDelete.push(post);
        deleteReasons[reason] = (deleteReasons[reason] || 0) + 1;
        console.log(`削除対象: ${content.substring(0, 50)}... (理由: ${reason})`);
      }
    }
    
    console.log(`\n削除対象: ${postsToDelete.length}件`);
    console.log('削除理由の内訳:');
    for (const [reason, count] of Object.entries(deleteReasons)) {
      console.log(`  ${reason}: ${count}件`);
    }
    
    if (postsToDelete.length > 0) {
      console.log('\n削除を実行しています...');
      
      // バッチで削除
      const deleteIds = postsToDelete.map(post => post.id);
      await prisma.buzzPost.deleteMany({
        where: {
          id: { in: deleteIds }
        }
      });
      
      console.log(`✅ ${postsToDelete.length}件の無意味な投稿を削除しました`);
    } else {
      console.log('\n削除対象の投稿はありませんでした');
    }
    
    // 削除後の件数確認
    const remainingCount = await prisma.buzzPost.count();
    console.log(`\n残存投稿数: ${remainingCount}件`);
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupIrrelevantPosts();