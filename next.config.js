/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['prisma'],
  typescript: {
    // 型チェックエラーでビルドを止めない（Vercelデプロイ用）
    ignoreBuildErrors: true,
  },
  eslint: {
    // ESLintエラーでビルドを止めない（Vercelデプロイ用）
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig