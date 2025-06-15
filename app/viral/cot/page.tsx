import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { redirect } from 'next/navigation'
import CoTCreationForm from './CoTCreationForm'

export default async function CoTPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Chain of Thought コンテンツ生成
        </h1>
        <p className="text-gray-600">
          AIを活用してバイラルコンテンツを5段階で生成します
        </p>
      </div>

      <CoTCreationForm />
    </div>
  )
}