const { PrismaClient } = require('../lib/generated/prisma');
const prisma = new PrismaClient();

async function findSuccessfulContent() {
  try {
    // まず、最近のセッションでcontentsがエラーでないものを探す
    const allSessions = await prisma.$queryRaw`
      SELECT id, theme, status, character_profile_id, contents, created_at
      FROM viral_sessions
      WHERE character_profile_id = 'cardi-dare'
      AND contents IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 20
    `;

    console.log('見つかったカーディセッション数:', allSessions.length);

    // contentsの中身を詳しく見る
    for (const session of allSessions) {
      console.log('\n--- セッション:', session.id);
      console.log('ステータス:', session.status);
      
      if (session.contents) {
        console.log('コンテンツタイプ:', typeof session.contents);
        if (Array.isArray(session.contents)) {
          console.log('配列長:', session.contents.length);
          
          // エラーでないコンテンツを探す
          const validContent = session.contents.find(c => c && !c.error && c.content);
          if (validContent) {
            console.log('\n✅ 成功したコンテンツを発見！');
            console.log(JSON.stringify(validContent, null, 2));
            break;
          }
        }
      }
    }

    // 下書きテーブルも確認
    console.log('\n\n=== 下書きテーブルの確認 ===');
    const drafts = await prisma.viralDraftV2.findMany({
      where: {
        characterId: 'cardi-dare'
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    console.log('カーディの下書き数:', drafts.length);
    
    if (drafts.length > 0) {
      const draft = drafts[0];
      console.log('\n【最新の下書き】');
      console.log('ID:', draft.id);
      console.log('タイトル:', draft.title);
      console.log('セッションID:', draft.sessionId);
      console.log('\nコンテンツ:');
      console.log(draft.content);
      console.log('\nキャラクターノート:', draft.characterNote);
      console.log('ハッシュタグ:', draft.hashtags);
    }

  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findSuccessfulContent();