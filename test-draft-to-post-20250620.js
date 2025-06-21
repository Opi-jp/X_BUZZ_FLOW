const { PrismaClient } = require('./lib/generated/prisma');

const prisma = new PrismaClient();

async function testDraftToPost() {
  try {
    console.log('🔍 下書き→Twitter投稿フローテスト');
    
    // 1. 最新の下書きを確認
    console.log('\n1️⃣ 最新の下書きを検索...');
    const drafts = await prisma.viral_drafts.findMany({
      where: {
        status: 'DRAFT',
        session_id: 'sess_j2aTllyraxSi'  // 先ほど成功したセッション
      },
      orderBy: { created_at: 'desc' },
      take: 1
    });
    
    if (drafts.length === 0) {
      console.log('❌ 下書きが見つかりません');
      return;
    }
    
    const draft = drafts[0];
    console.log('  ✅ 下書き発見:', draft.id);
    console.log('  タイトル:', draft.title);
    console.log('  キャラクター:', draft.character_id);
    console.log('  ハッシュタグ:', draft.hashtags);
    console.log('  ステータス:', draft.status);
    
    // 2. コンテンツの構造を確認
    console.log('\n2️⃣ コンテンツ構造の確認...');
    let postContent = '';
    try {
      const parsed = JSON.parse(draft.content);
      console.log('  フォーマット:', parsed.format);
      if (parsed.format === 'thread' && parsed.posts) {
        console.log('  投稿数:', parsed.posts.length);
        console.log('  最初の投稿:', parsed.posts[0].substring(0, 100) + '...');
        postContent = parsed.posts[0]; // 最初の投稿をテスト
      }
    } catch (e) {
      console.log('  単一投稿形式');
      postContent = draft.content;
    }
    
    // 3. 投稿テキストの準備
    console.log('\n3️⃣ 投稿テキストの準備...');
    const hashtags = draft.hashtags || [];
    const hashtagText = hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ');
    const fullText = postContent + '\n\n' + hashtagText;
    
    console.log('  投稿内容:');
    console.log('  ---');
    console.log(fullText);
    console.log('  ---');
    console.log('  文字数:', fullText.length);
    
    // 4. 環境変数の確認
    console.log('\n4️⃣ Twitter API環境変数の確認...');
    console.log('  TWITTER_API_KEY:', !!process.env.TWITTER_API_KEY);
    console.log('  TWITTER_API_SECRET:', !!process.env.TWITTER_API_SECRET);
    console.log('  TWITTER_ACCESS_TOKEN:', !!process.env.TWITTER_ACCESS_TOKEN);
    console.log('  TWITTER_ACCESS_SECRET:', !!process.env.TWITTER_ACCESS_SECRET);
    console.log('  USE_MOCK_POSTING:', process.env.USE_MOCK_POSTING || 'false');
    
    // 5. Twitter投稿APIを呼び出し
    console.log('\n5️⃣ Twitter投稿APIを呼び出し...');
    const response = await fetch('http://localhost:3000/api/publish/post/now', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: fullText,
        draftId: draft.id
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('  ✅ 投稿成功!');
      console.log('    ツイートID:', result.tweetId);
      console.log('    ツイートURL:', result.tweetUrl);
      
      // 6. 下書きのステータス確認
      console.log('\n6️⃣ 下書きステータスの更新確認...');
      const updatedDraft = await prisma.viral_drafts.findUnique({
        where: { id: draft.id }
      });
      
      console.log('  新しいステータス:', updatedDraft.status);
      console.log('  投稿日時:', updatedDraft.posted_at);
      console.log('  ツイートID:', updatedDraft.tweet_id);
      
    } else {
      console.log('  ❌ 投稿失敗:', response.status);
      const error = await response.text();
      console.log('    エラー:', error);
    }
    
    // 7. DBManagerによる整合性チェック
    console.log('\n7️⃣ DB整合性チェック...');
    const sessionPosts = await prisma.viral_drafts.count({
      where: { session_id: 'sess_j2aTllyraxSi' }
    });
    console.log('  このセッションの総下書き数:', sessionPosts);
    
    const postedCount = await prisma.viral_drafts.count({
      where: { 
        session_id: 'sess_j2aTllyraxSi',
        status: 'POSTED'
      }
    });
    console.log('  投稿済み数:', postedCount);
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 環境変数をロード
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

testDraftToPost();