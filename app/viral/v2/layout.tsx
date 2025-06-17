'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { User, LogOut } from 'lucide-react'

export default function V2Layout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()

  const handleSignIn = () => {
    signIn('twitter', { callbackUrl: '/viral/v2/create' })
  }

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 
              className="text-xl font-bold cursor-pointer" 
              onClick={() => router.push('/viral/v2/create')}
            >
              BuzzFlow V2
            </h1>
            <nav className="flex gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.push('/viral/v2/sessions')}
              >
                セッション一覧
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.push('/viral/v2/drafts')}
              >
                下書き一覧
              </Button>
            </nav>
          </div>
          
          <div className="flex items-center gap-2">
            {status === 'loading' ? (
              <div className="text-sm text-muted-foreground">読み込み中...</div>
            ) : session ? (
              <>
                <div className="flex items-center gap-2 mr-4">
                  <User className="w-4 h-4" />
                  <span className="text-sm">{session.user?.name || session.user?.email}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-1" />
                  ログアウト
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={handleSignIn}>
                Twitterでログイン
              </Button>
            )}
          </div>
        </div>
      </header>
      
      <main className="min-h-[calc(100vh-65px)]">
        {children}
      </main>
    </div>
  )
}