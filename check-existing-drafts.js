// 既存の下書き確認スクリプト
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkExistingDrafts() {
  console.log('=== 既存下書き確認 ===\n');
  
  try {
    // 完了済みセッション確認
    console.log('📋 1. 完了済みCoTセッション確認');
    const sessions = await prisma.cotSession.findMany({
      where: {
        status: 'COMPLETED'
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });
    
    console.log(`✅ 完了済みセッション: ${sessions.length}件`);
    
    if (sessions.length === 0) {
      console.log('❌ 完了済みセッションがありません。');
      console.log('CoT生成を先に実行する必要があります。');
      return;
    }
    
    sessions.forEach((session, index) => {
      console.log(`   ${index + 1}. ${session.id.substring(0, 8)}... (${session.expertise})`);
      console.log(`      作成: ${session.createdAt.toLocaleString('ja-JP')}`);
      console.log(`      ステータス: ${session.status}`);
    });
    
    // 各セッションの下書き確認
    console.log('\n📝 2. 各セッションの下書き確認');
    
    for (const session of sessions) {
      console.log(`\n--- セッション: ${session.id.substring(0, 8)}... ---`);
      
      const drafts = await prisma.cotDraft.findMany({
        where: {
          sessionId: session.id
        },
        include: {
          performance: true
        },
        orderBy: {
          createdAt: 'asc'
        }
      });
      
      console.log(`下書き数: ${drafts.length}件`);
      
      if (drafts.length > 0) {
        drafts.forEach((draft, index) => {
          console.log(`   ${index + 1}. ${draft.title}`);
          console.log(`      ID: ${draft.id}`);
          console.log(`      ステータス: ${draft.status}`);
          console.log(`      投稿ID: ${draft.postId || 'なし'}`);
          console.log(`      文字数: ${draft.content.length}文字`);
          console.log(`      ハッシュタグ: ${draft.hashtags.join(', ')}`);
          
          if (draft.performance) {
            console.log(`      パフォーマンス追跡: あり`);
          }
          
          console.log(`      作成: ${draft.createdAt.toLocaleString('ja-JP')}`);
          console.log('');
        });
      } else {
        console.log('   下書きなし');
      }
    }
    
    // 投稿可能な下書き確認
    console.log('\n🎯 3. 投稿可能な下書き確認');
    
    const availableDrafts = await prisma.cotDraft.findMany({
      where: {
        status: {
          in: ['DRAFT', 'EDITED']
        }
      },
      include: {
        session: {
          select: {
            expertise: true,
            platform: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });
    
    console.log(`✅ 投稿可能な下書き: ${availableDrafts.length}件`);
    
    if (availableDrafts.length > 0) {
      console.log('\n🚀 投稿テスト候補:');
      availableDrafts.forEach((draft, index) => {
        console.log(`   ${index + 1}. ${draft.title}`);
        console.log(`      ID: ${draft.id}`);
        console.log(`      専門分野: ${draft.session.expertise}`);
        console.log(`      プラットフォーム: ${draft.session.platform}`);
        console.log(`      コンテンツ例: ${draft.content.substring(0, 80)}...`);
        console.log('');
      });
      
      // 最初の下書きでテスト実行を提案
      const testDraft = availableDrafts[0];
      console.log(`\n💡 推奨テスト手順:`);
      console.log(`1. 下書きID: ${testDraft.id}`);
      console.log(`2. コマンド: curl -X POST "http://localhost:3000/api/viral/cot-draft/${testDraft.id}" -H "Content-Type: application/json" -d '{"action":"post"}'`);
      console.log(`3. 投稿成功後の確認`);
      
    } else {
      console.log('❌ 投稿可能な下書きがありません。');
      console.log('新しいCoT生成を実行してください。');
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkExistingDrafts().catch(console.error);