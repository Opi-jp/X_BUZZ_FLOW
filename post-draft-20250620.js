const { PrismaClient } = require('./lib/generated/prisma');
const prisma = new PrismaClient();

async function postDraft() {
  try {
    const draft = await prisma.viral_drafts_v2.findFirst({
      where: { 
        session_id: 'sess_SdN8Je5lJAah',
        status: 'DRAFT'
      }
    });
    
    if (!draft) {
      console.log('❌ 下書きが見つかりません');
      return;
    }
    
    console.log('📋 投稿する下書き:');
    console.log('ID:', draft.id);
    console.log('タイトル:', draft.title);
    console.log('キャラクター:', draft.character_id);
    
    // コンテンツをパース
    const content = JSON.parse(draft.content);
    const firstPost = content.posts[0];
    const hashtags = draft.hashtags || [];
    
    // 投稿テキストを作成
    const tweetText = firstPost + '\n\n' + hashtags.join(' ');
    
    console.log('\n📤 投稿内容:');
    console.log('---');
    console.log(tweetText);
    console.log('---');
    console.log('文字数:', tweetText.length);
    
    // Twitter投稿
    console.log('\n🚀 Twitter投稿実行...');
    const response = await fetch('http://localhost:3000/api/publish/post/now', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: tweetText,
        draftId: draft.id
      })
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('\n✅ 投稿成功!');
      console.log('Tweet ID:', result.id);
      console.log('URL:', result.url);
      
      // 下書きステータスを確認
      const updatedDraft = await prisma.viral_drafts_v2.findUnique({
        where: { id: draft.id }
      });
      console.log('\n下書きステータス:', updatedDraft.status);
      console.log('投稿日時:', updatedDraft.posted_at);
    } else {
      console.log('\n❌ 投稿失敗:', response.status);
      console.log('エラー:', JSON.stringify(result, null, 2));
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 環境変数をロード
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

postDraft();
