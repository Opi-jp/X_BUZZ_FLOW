const fs = require('fs');
const packageJson = require('../package.json');

// クリーンアップ用のスクリプトを追加
packageJson.scripts = {
  ...packageJson.scripts,
  "clean": "rm -rf .next node_modules",
  "clean:install": "npm run clean && npm install",
  "test:latest": "node test-scripts/$(ls -t test-scripts/*.js | head -1)",
  "archive:old": "bash scripts/night-cleanup.sh",
  "docs:list": "find docs/current -name '*.md' -exec basename {} \\;"
};

fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2) + '\n');
console.log('✅ package.json にクリーンアップコマンドを追加しました');
