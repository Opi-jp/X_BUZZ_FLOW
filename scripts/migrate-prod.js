// 本番環境でマイグレーションを実行するスクリプト
const { execSync } = require('child_process');

console.log('Running production migration...');

try {
  // 本番環境のDATABASE_URLを使用してマイグレーションを実行
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL
    }
  });
  
  console.log('Migration completed successfully!');
} catch (error) {
  console.error('Migration failed:', error.message);
  process.exit(1);
}