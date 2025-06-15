import SessionStatus from '@/app/components/cot/SessionStatus'

interface Props {
  params: Promise<{ sessionId: string }>
}

export default async function CoTSessionPage({ params }: Props) {
  const { sessionId } = await params

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Chain of Thought セッション
        </h1>
        <p className="text-gray-600">
          AIによるバイラルコンテンツ生成プロセスをリアルタイムで確認できます
        </p>
      </div>

      <SessionStatus 
        sessionId={sessionId}
        onComplete={() => {
          // 完了時の処理（必要に応じて）
          console.log('CoT processing completed')
        }}
      />
    </div>
  )
}