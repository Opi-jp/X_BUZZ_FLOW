const { PrismaClient } = require('../lib/generated/prisma');
const prisma = new PrismaClient();

async function analyzeCardiContent() {
  try {
    // 最新のカーディセッションを1つ取得
    const session = await prisma.viralSession.findFirst({
      where: {
        characterProfileId: 'cardi-dare',
        contents: { not: null }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!session) {
      console.log('カーディ・ダーレのセッションが見つかりません');
      return;
    }

    console.log('\n=== セッション詳細 ===');
    console.log('ID:', session.id);
    console.log('テーマ:', session.theme);
    console.log('ステータス:', session.status);
    console.log('\nコンテンツ構造:');
    console.log(JSON.stringify(session.contents, null, 2));

    // 下書きも確認
    const drafts = await prisma.viralDraftV2.findMany({
      where: {
        sessionId: session.id
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    console.log('\n\n=== 関連する下書き ===');
    console.log('下書き数:', drafts.length);
    
    drafts.forEach((draft, idx) => {
      console.log(`\n【下書き ${idx + 1}】`);
      console.log('タイトル:', draft.title);
      console.log('キャラクターID:', draft.characterId);
      console.log('キャラクターノート:', draft.characterNote);
      console.log('\nコンテンツ（最初の300文字）:');
      console.log(draft.content.substring(0, 300) + '...');
      console.log('\nハッシュタグ:', draft.hashtags.join(', '));
      console.log('---');
    });

    // キャラクタープロファイルも確認
    const profile = await prisma.characterProfile.findUnique({
      where: { id: 'cardi-dare' }
    });

    if (profile) {
      console.log('\n\n=== キャラクタープロファイル ===');
      console.log('名前:', profile.name);
      console.log('キャッチフレーズ:', profile.catchphrase);
      console.log('トーン:', profile.tone.substring(0, 200) + '...');
    }

  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeCardiContent();