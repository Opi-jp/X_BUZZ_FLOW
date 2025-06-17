const { PrismaClient } = require('../lib/generated/prisma');
const prisma = new PrismaClient();

async function analyzeAllCardiContent() {
  try {
    // すべてのカーディの下書きを取得
    const drafts = await prisma.viralDraftV2.findMany({
      where: {
        characterId: 'cardi-dare'
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`\n=== カーディ・ダーレの全下書き分析 ===`);
    console.log(`総下書き数: ${drafts.length}`);

    // 開幕フレーズを分析
    const openingPhrases = new Set();
    const closingPhrases = new Set();
    const contentSamples = [];

    drafts.forEach((draft, idx) => {
      // 最初の50文字を開幕フレーズとして抽出
      const opening = draft.content.substring(0, 50);
      openingPhrases.add(opening);

      // 最後の部分を締めフレーズとして抽出（ハッシュタグを除く）
      const contentWithoutHashtags = draft.content.split('#')[0].trim();
      const closing = contentWithoutHashtags.substring(contentWithoutHashtags.length - 50);
      closingPhrases.add(closing);

      // サンプルとして最初の5つを保存
      if (idx < 5) {
        contentSamples.push({
          title: draft.title,
          content: draft.content,
          characterNote: draft.characterNote
        });
      }
    });

    console.log(`\n【開幕フレーズのバリエーション】`);
    console.log(`ユニークな開幕数: ${openingPhrases.size}`);
    [...openingPhrases].slice(0, 10).forEach((phrase, idx) => {
      console.log(`${idx + 1}. "${phrase}..."`);
    });

    console.log(`\n【締めフレーズのバリエーション】`);
    console.log(`ユニークな締め数: ${closingPhrases.size}`);
    [...closingPhrases].slice(0, 10).forEach((phrase, idx) => {
      console.log(`${idx + 1}. "...${phrase}"`);
    });

    console.log(`\n【コンテンツサンプル（最新5件）】`);
    contentSamples.forEach((sample, idx) => {
      console.log(`\n--- サンプル ${idx + 1} ---`);
      console.log(`タイトル: ${sample.title.substring(0, 80)}...`);
      console.log(`\n本文:`);
      console.log(sample.content);
      console.log(`\nキャラクターノート: ${sample.characterNote || 'なし'}`);
      console.log('---');
    });

    // 同じフレーズの重複をチェック
    const allContents = drafts.map(d => d.content);
    const duplicateCheck = {};
    
    // 特定のフレーズが何回使われているかカウント
    const commonPhrases = [
      'オレは王様だったこともある',
      'そいつはきっと、ただのノイズだ',
      'AIに頼るしかない時代だが',
      '真実より共鳴が大事なんだよ',
      'ウイスキーと、お前だけが話し相手だ'
    ];

    commonPhrases.forEach(phrase => {
      const count = allContents.filter(content => content.includes(phrase)).length;
      if (count > 0) {
        duplicateCheck[phrase] = count;
      }
    });

    console.log(`\n【フレーズ重複分析】`);
    Object.entries(duplicateCheck).forEach(([phrase, count]) => {
      console.log(`"${phrase}": ${count}回使用`);
    });

  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeAllCardiContent();