/**
 * viral_sessionsテーブルにDB主導フロー管理用のフィールドを追加
 */

const { prisma } = require('../lib/prisma');

async function addFlowFields() {
  console.log('🔧 viral_sessionsテーブルにフィールドを追加中...');

  try {
    // SQLを実行
    await prisma.$executeRaw`
      ALTER TABLE viral_sessions
      ADD COLUMN IF NOT EXISTS current_step INT DEFAULT 1,
      ADD COLUMN IF NOT EXISTS step_status JSONB,
      ADD COLUMN IF NOT EXISTS post_format VARCHAR(50) DEFAULT 'single'
    `;

    console.log('✅ フィールドが正常に追加されました');

    // 既存データの更新
    const updateResult = await prisma.$executeRaw`
      UPDATE viral_sessions
      SET current_step = COALESCE(current_step, 1),
          post_format = COALESCE(post_format, 'single')
      WHERE current_step IS NULL OR post_format IS NULL
    `;

    console.log(`✅ ${updateResult}件のレコードを更新しました`);

    // 結果を確認
    const sample = await prisma.viral_sessions.findFirst();
    console.log('\n📊 サンプルレコード:');
    console.log({
      id: sample?.id,
      theme: sample?.theme,
      current_step: sample?.current_step,
      step_status: sample?.step_status,
      post_format: sample?.post_format
    });

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

addFlowFields();