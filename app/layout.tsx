import type { Metadata } from 'next'
import { Noto_Sans_JP } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const notoSansJP = Noto_Sans_JP({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-noto-sans-jp',
})

export const metadata: Metadata = {
  title: 'BuzzFlow - AI活用型SNS運用支援システム',
  description: 'AIを活用したX(Twitter)バズ投稿管理・分析・自動化システム',
  keywords: 'AI, Twitter, X, バズ, 投稿管理, SNS運用, 自動化',
  authors: [{ name: 'BuzzFlow Team' }],
  creator: 'BuzzFlow',
  publisher: 'BuzzFlow',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      'max-image-preview': 'none',
    },
  },
  openGraph: {
    title: 'BuzzFlow - AI活用型SNS運用支援システム',
    description: 'AIを活用したX(Twitter)バズ投稿管理・分析・自動化システム',
    locale: 'ja_JP',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={`${notoSansJP.variable} font-sans antialiased`}>
        <Providers>
          <div className="min-h-screen bg-gray-100">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  )
}