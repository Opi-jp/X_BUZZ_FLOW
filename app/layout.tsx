import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import DebuggerInjector from './components/DebuggerInjector'

// Google Fontsのメタデータ
const googleFontsLink = [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=M+PLUS+1p:wght@300;400;500;700;900&family=Noto+Sans+JP:wght@300;400;500;700;900&family=M+PLUS+1+Code:wght@400;500;700&display=swap',
  },
]

export const metadata: Metadata = {
  title: 'Cardi-SYSTEM - AI駆動型バイラルコンテンツ生成プラットフォーム',
  description: '元詐欺師Cardi Dareの哲学とAIを融合した、人間味あるバイラルコンテンツ生成システム',
  keywords: 'AI, Twitter, X, バイラル, Cardi Dare, コンテンツ生成, 自動化',
  authors: [{ name: 'Cardi-SYSTEM Team' }],
  creator: 'Cardi-SYSTEM',
  publisher: 'Cardi-SYSTEM',
  icons: {
    icon: '/icon.svg',
    shortcut: '/favicon.ico',
    apple: '/icon.svg'
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      noarchive: true,
      nosnippet: true,
      'max-image-preview': 'none',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    title: 'Cardi-SYSTEM - AI駆動型バイラルコンテンツ生成プラットフォーム',
    description: '元詐欺師Cardi Dareの哲学とAIを融合した、人間味あるバイラルコンテンツ生成システム',
    locale: 'ja_JP',
    type: 'website',
  },
  // links プロパティは存在しないため削除（Google FontsはHTML headで読み込み）
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          rel="stylesheet" 
          href="https://fonts.googleapis.com/css2?family=M+PLUS+1p:wght@300;400;500;700;900&family=Noto+Sans+JP:wght@300;400;500;700;900&family=M+PLUS+1+Code:wght@400;500;700&display=swap"
        />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <Providers>
          <DebuggerInjector />
          <div className="min-h-screen bg-gray-100">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  )
}