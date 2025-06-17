'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useViralSession } from '@/hooks/useViralSession'
import { SessionStatus } from '@/types/viral-v2'

export default function SessionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.id as string
  
  const { session, loading, error, refetch } = useViralSession(sessionId, {
    autoRedirectOnError: false
  })

  const getStatusBadge = (status: SessionStatus | string) => {
    const statusMap: Record<SessionStatus | string, { label: string; color: string }> = {
      [SessionStatus.CREATED]: { label: '作成済み', color: 'bg-gray-100 text-gray-800' },
      [SessionStatus.COLLECTING]: { label: '収集中', color: 'bg-yellow-100 text-yellow-800' },
      [SessionStatus.TOPICS_COLLECTED]: { label: 'トピック収集完了', color: 'bg-blue-100 text-blue-800' },
      [SessionStatus.CONCEPTS_GENERATED]: { label: 'コンセプト生成完了', color: 'bg-purple-100 text-purple-800' },
      [SessionStatus.CONTENTS_GENERATED]: { label: 'コンテンツ生成完了', color: 'bg-green-100 text-green-800' },
      [SessionStatus.COMPLETED]: { label: '完了', color: 'bg-green-100 text-green-800' }
    }
    
    const status_info = statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800' }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status_info.color}`}>
        {status_info.label}
      </span>
    )
  }

  const checkAndResume = async () => {
    try {
      const response = await fetch(`/api/viral/v2/sessions/${sessionId}/resume`)
      const data = await response.json()
      
      if (data.canResume) {
        const confirmMessage = `
現在の状態: ${data.message}
次のステップ: ${data.nextStep}

推奨事項:
${data.recommendations.join('\n')}

続行しますか？
        `.trim()
        
        if (confirm(confirmMessage)) {
          const resumeResponse = await fetch(`/api/viral/v2/sessions/${sessionId}/resume`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              reuseTopics: true,
              reuseConcepts: true
            })
          })
          
          const resumeData = await resumeResponse.json()
          if (resumeData.success) {
            alert(`${resumeData.step}を${resumeData.reused ? '再利用' : '新規取得'}しました`)
            refetch() // リロード
          } else {
            alert(`手動実行が必要です: ${resumeData.message}`)
          }
        }
      } else {
        alert(data.message)
      }
    } catch (error) {
      console.error('Resume check failed:', error)
      alert('診断中にエラーが発生しました')
    }
  }

  const getNextAction = () => {
    if (!session) return null

    switch (session.status) {
      case SessionStatus.CREATED:
        return (
          <Link href={`/viral/v2/sessions/${sessionId}/topics`}>
            <button className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
              トピックを収集
            </button>
          </Link>
        )
      case SessionStatus.TOPICS_COLLECTED:
        return (
          <Link href={`/viral/v2/sessions/${sessionId}/concepts`}>
            <button className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
              コンセプトを生成
            </button>
          </Link>
        )
      case SessionStatus.CONCEPTS_GENERATED:
        return (
          <Link href={`/viral/v2/sessions/${sessionId}/results`}>
            <button className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
              キャラクターコンテンツを生成
            </button>
          </Link>
        )
      case SessionStatus.CONTENTS_GENERATED:
        return (
          <Link href={`/viral/v2/sessions/${sessionId}/character-contents`}>
            <button className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
              生成結果を見る
            </button>
          </Link>
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          エラー: {error || 'セッションが見つかりません'}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Link href="/viral/v2/sessions" className="text-indigo-600 hover:text-indigo-800">
          ← セッション一覧に戻る
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-2">{session.theme}</h1>
      
      <div className="mb-6 flex items-center gap-4">
        {getStatusBadge(session.status)}
        <span className="text-gray-600">
          作成日: {new Date(session.createdAt).toLocaleString('ja-JP')}
        </span>
      </div>

      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">セッション情報</h2>
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">プラットフォーム</dt>
            <dd className="mt-1 text-sm text-gray-900">{session.platform}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">スタイル</dt>
            <dd className="mt-1 text-sm text-gray-900">{session.style}</dd>
          </div>
          {session.characterProfileId && (
            <div>
              <dt className="text-sm font-medium text-gray-500">キャラクター</dt>
              <dd className="mt-1 text-sm text-gray-900">{session.characterProfileId}</dd>
            </div>
          )}
          {session._count?.drafts !== undefined && (
            <div>
              <dt className="text-sm font-medium text-gray-500">下書き数</dt>
              <dd className="mt-1 text-sm text-gray-900">{session._count.drafts}件</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="space-y-4">
        {session.topics && (
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-2">収集済みトピック</h3>
            <p className="text-sm text-gray-600">
              {(session.topics as any).parsed?.length || 0}件のトピックを収集済み
            </p>
          </div>
        )}

        {session.concepts && (
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-2">生成済みコンセプト</h3>
            <p className="text-sm text-gray-600">
              {(session.concepts as any[]).length}件のコンセプトを生成済み
            </p>
          </div>
        )}

        {session.selectedIds.length > 0 && (
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-2">選択済みコンセプト</h3>
            <p className="text-sm text-gray-600">
              {session.selectedIds.length}件のコンセプトを選択済み
            </p>
          </div>
        )}
      </div>

      <div className="mt-8 space-y-4">
        {getNextAction()}
        
        {/* 再開・修復オプション */}
        {session.status !== SessionStatus.COMPLETED && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">トラブルシューティング</h3>
            <div className="space-y-2">
              <button
                onClick={() => checkAndResume()}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 text-sm"
              >
                セッション状態を診断
              </button>
              <p className="text-xs text-gray-600">
                エラーで中断した場合、前のフェーズの結果を再利用して続きから再開できます
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}