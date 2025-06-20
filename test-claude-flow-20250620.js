const { PrismaClient } = require('./lib/generated/prisma');

const prisma = new PrismaClient();

async function testClaudeFlow() {
  try {
    console.log('🔍 Claude（キャラクター投稿生成）フローテスト');
    
    // 1. CONCEPTS_GENERATEDのセッションを探す
    console.log('\n1️⃣ CONCEPTS_GENERATEDセッションを検索...');
    const session = await prisma.viral_sessions.findFirst({
      where: {
        status: 'CONCEPTS_GENERATED',
        concepts: { not: null }
      },
      orderBy: { created_at: 'desc' }
    });
    
    if (!session) {
      console.log('❌ 適切なセッションが見つかりません');
      return;
    }
    
    console.log('  ✅ セッション発見:', session.id);
    console.log('  テーマ:', session.theme);
    console.log('  プラットフォーム:', session.platform);
    console.log('  スタイル:', session.style);
    
    // 2. conceptsの構造を確認
    console.log('\n2️⃣ Conceptsデータの確認...');
    const concepts = session.concepts;
    console.log('  型:', typeof concepts);
    console.log('  配列？:', Array.isArray(concepts));
    
    if (Array.isArray(concepts) && concepts.length > 0) {
      console.log('  コンセプト数:', concepts.length);
      console.log('  最初のコンセプト:');
      console.log('    conceptId:', concepts[0].conceptId);
      console.log('    conceptTitle:', concepts[0].conceptTitle);
      console.log('    format:', concepts[0].format);
      console.log('    viralScore:', concepts[0].viralScore);
      console.log('    hashtags:', concepts[0].hashtags);
      
      // 選択するコンセプトIDを準備
      const selectedIds = [concepts[0].conceptId];
      console.log('  選択するコンセプトID:', selectedIds);
      
      // 3. selected_idsフィールドを更新（必要な場合）
      console.log('\n3️⃣ selected_idsを設定...');
      await prisma.viral_sessions.update({
        where: { id: session.id },
        data: { selected_ids: selectedIds }
      });
      console.log('  ✅ selected_ids設定完了');
      
      // 4. 利用可能なキャラクターを確認
      console.log('\n4️⃣ 利用可能なキャラクターを確認...');
      const fs = require('fs').promises;
      const path = require('path');
      const charactersDir = path.join(process.cwd(), 'lib', 'prompts', 'claude', 'character-profiles');
      
      try {
        const files = await fs.readdir(charactersDir);
        const characterFiles = files.filter(f => f.endsWith('.json'));
        console.log('  利用可能なキャラクター:', characterFiles);
        
        // カーディ・ダーレがあるか確認
        const cardiDareExists = characterFiles.includes('cardi-dare.json');
        console.log('  カーディ・ダーレ存在:', cardiDareExists ? '✅' : '❌');
        
        // 5. Claude APIを呼び出し
        console.log('\n5️⃣ Claude character generation APIを呼び出し...');
        const response = await fetch(`http://localhost:3000/api/create/flow/${session.id}/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            selectedConceptIds: selectedIds,
            characterId: 'cardi-dare'
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('  ✅ API成功!');
          console.log('    生成された投稿数:', result.generatedCount);
          
          // 6. 生成されたコンテンツを確認
          console.log('\n6️⃣ 生成されたコンテンツを確認...');
          const updatedSession = await prisma.viral_sessions.findUnique({
            where: { id: session.id }
          });
          
          if (updatedSession.contents && Array.isArray(updatedSession.contents)) {
            console.log('  contents配列の長さ:', updatedSession.contents.length);
            const firstContent = updatedSession.contents[0];
            console.log('  最初のコンテンツ:');
            console.log('    conceptId:', firstContent.conceptId);
            console.log('    characterId:', firstContent.characterId);
            console.log('    format:', firstContent.format);
            
            if (firstContent.format === 'thread') {
              console.log('    posts数:', firstContent.posts ? firstContent.posts.length : 0);
              if (firstContent.posts && firstContent.posts.length > 0) {
                console.log('    最初の投稿:', firstContent.posts[0].substring(0, 100) + '...');
              }
            } else {
              console.log('    content:', firstContent.content ? firstContent.content.substring(0, 100) + '...' : '(なし)');
            }
          }
          
          // 7. 下書きが作成されたか確認
          console.log('\n7️⃣ 作成された下書きを確認...');
          const drafts = await prisma.viral_drafts_v2.findMany({
            where: { sessionId: session.id },
            orderBy: { created_at: 'desc' },
            take: 3
          });
          
          console.log('  下書き数:', drafts.length);
          if (drafts.length > 0) {
            const firstDraft = drafts[0];
            console.log('  最新の下書き:');
            console.log('    ID:', firstDraft.id);
            console.log('    タイトル:', firstDraft.title);
            console.log('    キャラクター:', firstDraft.characterId);
            console.log('    ステータス:', firstDraft.status);
            console.log('    ハッシュタグ:', firstDraft.hashtags);
            
            // contentの構造を確認
            if (typeof firstDraft.content === 'string') {
              try {
                const parsed = JSON.parse(firstDraft.content);
                if (parsed.format === 'thread') {
                  console.log('    フォーマット: thread');
                  console.log('    投稿数:', parsed.posts ? parsed.posts.length : 0);
                } else {
                  console.log('    フォーマット: single');
                }
              } catch (e) {
                console.log('    フォーマット: single (plain text)');
              }
            }
          }
          
        } else {
          console.log('  ❌ API失敗:', response.status);
          const error = await response.text();
          console.log('    エラー:', error);
        }
        
      } catch (error) {
        console.log('  ❌ キャラクターディレクトリ読み込みエラー:', error.message);
      }
      
    } else {
      console.log('  ❌ コンセプトデータが不正です');
    }
    
    console.log('\n📈 総合評価:');
    console.log('  - DBからconceptsデータを取得: ✅');
    console.log('  - キャラクタープロファイルの確認: 実行中...');
    console.log('  - Claude APIの呼び出し: 実行中...');
    console.log('  - contentsフィールドへの保存: 実行中...');
    console.log('  - viral_drafts_v2への下書き作成: 実行中...');
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testClaudeFlow();