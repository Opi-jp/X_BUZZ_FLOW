# Vercelデプロイ時にローカルで成功してもエラーが出る理由（Claude Code向けデバッグ用ドキュメント）

## 概要

このドキュメントは、「ローカルでは正常にビルドできるが、Vercelデプロイ時に大量のエラーが発生する」問題に対して、Claude Codeエージェントが適切に対処するためのチェックリストと推論ガイドです。

## 想定環境
- **フレームワーク**：Next.js / React / TypeScript
- **開発環境**：macOS または Windows（ローカル）
- **本番環境**：Vercel（Linuxベース）

---

## 主要な原因と対策

### ① Node.js バージョンの不一致
- **症状**：ローカルでは通るが、Vercelで文法エラーやimportエラーになる
- **原因**：engines.node または .nvmrc が未指定／ずれている
- **対策**：package.json に以下を明示：

```json
"engines": {
  "node": "18.x"
}
```

または `.nvmrc` に `18` と記載（VercelのBuild SettingsでNodeバージョンを揃える）

---

### ② devDependencies に依存している
- **症状**：ts-node や eslint-plugin-* など開発用パッケージがVercelで消えてエラーになる
- **原因**：Vercelは本番ビルドで devDependencies をインストールしない（NODE_ENV=production）
- **対策**：ビルドや実行に必要なツールは dependencies に移すか、不要なら build スクリプトから外す

---

### ③ ファイル名の大文字小文字問題
- **症状**：Cannot find module './components/button.tsx'（Macでは発生しない）
- **原因**：Macはファイルシステムが大文字小文字非区別、Vercelは区別（Linux）
- **対策**：import文とファイル名の大文字小文字を厳密に一致させる

```bash
git mv Button.tsx tmp && git mv tmp button.tsx
```

などで明示的に変更を反映

---

### ④ 環境変数未定義
- **症状**：process.env.XYZ が undefined になり、ビルド時にクラッシュ
- **原因**：Vercelの環境変数設定が未登録 or .env ファイルが未反映
- **対策**：Vercelダッシュボードの Environment Variables に NEXT_PUBLIC_* や API_KEY など必要項目を登録

---

### ⑤ Vercelのビルドステップがローカルと異なる
- **症状**：vercel-build や postinstall が動作して失敗する
- **原因**：Vercelが npm run build 以外のステップを実行している
- **対策**：vercel.json で build コマンドを明示的に指定

---

## チェックリスト

デプロイ前に以下を確認：

- [ ] Node.jsバージョンが明示されているか（package.json or .nvmrc）
- [ ] ビルドに必要なパッケージが dependencies に含まれているか
- [ ] ファイル名の大文字小文字が import 文と一致しているか
- [ ] 必要な環境変数がすべて Vercel に設定されているか
- [ ] TypeScript の strict 設定での型エラーがないか

---

## 推奨される設定

### package.json
```json
{
  "engines": {
    "node": "18.x"
  },
  "scripts": {
    "build": "next build",
    "vercel-build": "prisma generate && next build"
  }
}
```

### vercel.json
```json
{
  "buildCommand": "npm run vercel-build",
  "framework": "nextjs"
}
```

### 環境変数チェックスクリプト
```typescript
// scripts/check-env.ts
const requiredEnvVars = [
  'DATABASE_URL',
  'OPENAI_API_KEY',
  'NEXTAUTH_URL',
  // 他の必須環境変数
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`❌ Missing environment variable: ${varName}`);
    process.exit(1);
  }
});
console.log('✅ All required environment variables are set');
```