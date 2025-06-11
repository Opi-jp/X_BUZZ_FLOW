const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

async function createAIPatterns() {
  try {
    const patterns = [
      {
        name: '経験談型',
        description: '自身の経験を元にしたストーリーテリング',
        promptTemplate: `参照投稿: {{content}}

上記の投稿のトピックに関連して、大屋友紀雄の映像制作やクリエイティブ業界での具体的な経験談を交えた投稿を作成してください。

必須要素：
- 実際の経験や事例（23年の経験から）
- 具体的な数字や結果があれば含める
- AIやテクノロジーとの関連性
- 読者への学びや気づき`,
        exampleOutput: 'プロジェクションマッピング制作で学んだことですが、技術は手段であって目的ではない。AIも同じ。クライアントが求めるのは「感動」であって「最新技術」ではないんです。\n\n#AI活用 #クリエイティブ'
      },
      {
        name: '未来予測型',
        description: 'AIと働き方の未来について予測・提言',
        promptTemplate: `参照投稿: {{content}}

このトピックについて、5-10年後の働き方や社会の変化を予測する投稿を作成してください。

必須要素：
- 具体的な未来像
- なぜそう考えるのかの根拠
- 今から準備すべきこと
- クリエイティブ業界の視点`,
        exampleOutput: '2030年、AIがクリエイティブの8割を担当する時代。人間の役割は「感動の設計」に特化する。NAKEDで培った「体験価値」の創造力が、最も求められるスキルになると確信しています。'
      },
      {
        name: '問題提起型',
        description: '現状の課題を指摘し、議論を呼ぶ投稿',
        promptTemplate: `参照投稿: {{content}}

このトピックに関連する問題や課題を提起し、読者に考えさせる投稿を作成してください。

必須要素：
- 具体的な問題点の指摘
- なぜそれが問題なのか
- 建設的な提案や解決策のヒント
- 読者への問いかけ`,
        exampleOutput: 'AI時代の最大の問題は「考えることを放棄する人が増える」こと。便利さの裏で失われる創造性。映像制作の現場でも、AIに頼りすぎて本質を見失う若手が増えています。あなたはどう思いますか？'
      },
      {
        name: '実践ティップス型',
        description: '具体的で実践的なアドバイス',
        promptTemplate: `参照投稿: {{content}}

このトピックについて、すぐに実践できる具体的なティップスやアドバイスを提供する投稿を作成してください。

必須要素：
- 今すぐできる具体的なアクション
- なぜそれが効果的なのか
- 実例や成功事例
- シンプルで覚えやすい表現`,
        exampleOutput: 'ChatGPTを仕事で使うコツ：「5W1H」で指示を出す。映像制作の絵コンテ作成でも同じ。Who（誰が）What（何を）When（いつ）Where（どこで）Why（なぜ）How（どうやって）。これで精度が3倍上がります。'
      },
      {
        name: 'データ引用型',
        description: '具体的な数字やデータを活用',
        promptTemplate: `参照投稿: {{content}}

元の投稿のデータや数字を正確に引用しながら、独自の分析や解釈を加えた投稿を作成してください。

必須要素：
- 元投稿のデータを正確に引用
- そのデータが示す意味の解釈
- クリエイティブ業界での類似例
- 行動を促すメッセージ`,
        exampleOutput: '「AIツール利用者の73%が生産性向上を実感」というデータ。でも映像制作の現場では「質」の向上はまだ27%。量より質の時代に、どうAIを活用すべきか。答えは「人間にしかできないこと」に集中すること。'
      }
    ];

    // 既存のパターンを削除
    await prisma.aiPattern.deleteMany({});
    console.log('既存のAIパターンを削除しました');

    // 新しいパターンを作成
    for (const pattern of patterns) {
      const created = await prisma.aiPattern.create({
        data: pattern
      });
      console.log(`✅ 作成: ${created.name}`);
    }

    console.log('\n✅ AIパターンの作成が完了しました');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAIPatterns();