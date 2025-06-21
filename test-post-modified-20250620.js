const { PrismaClient } = require('./lib/generated/prisma');

const prisma = new PrismaClient();

async function testModifiedPost() {
  try {
    console.log('🔍 下書き投稿テスト（修正版）');
    
    // 最新の下書きを取得
    const draft = await prisma.viral_drafts.findFirst({
      where: { status: 'DRAFT' },
      orderBy: { created_at: 'desc' }
    });
    
    if (\!draft) {
      console.log('❌ 下書きが見つかりません');
      return;
    }
    
    console.log('✅ 下書き発見:', draft.id);
    console.log('  タイトル:', draft.title);
    
    // コンテンツを少し変更（タイムスタンプ追加）
    const timestamp = new Date().toLocaleTimeString('ja-JP');
    let modifiedContent = '';
    
    try {
      const parsed = JSON.parse(draft.content);
      if (parsed.format === 'thread' && parsed.posts) {
        modifiedContent = parsed.posts[0] + `\n\n[${timestamp}]`;
      }
    } catch (e) {
      modifiedContent = draft.content + `\n\n[${timestamp}]`;
    }
    
    const hashtags = draft.hashtags || ['AI時代'];
    const fullText = modifiedContent + '\n\n' + hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ');
    
    console.log('\n📤 投稿内容:');
    console.log('---');
    console.log(fullText);
    console.log('---');
    console.log('文字数:', fullText.length);
    
    // Twitter投稿
    console.log('\n🚀 Twitter投稿実行...');
    const response = await fetch('http://localhost:3000/api/publish/post/now', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: fullText,
        draftId: draft.id
      })
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ 投稿成功\!');
      console.log('  Tweet ID:', result.id);
      console.log('  URL:', result.url);
    } else {
      console.log('❌ 投稿失敗:', response.status);
      console.log('  エラー:', JSON.stringify(result, null, 2));
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

testModifiedPost();
