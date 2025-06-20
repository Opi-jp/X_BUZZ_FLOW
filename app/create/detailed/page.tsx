'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Brain, Loader2, AlertCircle, ArrowRight, Check, ChevronDown, ChevronUp, Edit2, Send, Calendar } from 'lucide-react'

interface SessionData {
  sessionId: string
  theme: string
  platform: string
  style: string
  topics?: any[]
  rawTopics?: string
  concepts?: any[]
  contents?: any[]
  drafts?: any[]
}

export default function DetailedCreatePage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [editingDraft, setEditingDraft] = useState<string | null>(null)
  const [editedContent, setEditedContent] = useState<string>('')
  
  const [theme, setTheme] = useState('')
  const [style, setStyle] = useState('エンターテイメント')
  const [selectedConcepts, setSelectedConcepts] = useState<string[]>([])

  // Step 1: セッション作成
  const createSession = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/create/flow/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          theme,
          platform: 'Twitter',
          style
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) throw new Error(data.error || 'セッション作成に失敗')
      
      const newSession: SessionData = {
        sessionId: data.session?.id || data.sessionId,
        theme,
        platform: 'Twitter',
        style
      }
      
      setSessionData(newSession)
      setCurrentStep(2)
      
      // Perplexityでトピック収集を開始
      collectTopics(newSession.sessionId)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
      setLoading(false)
    }
  }

  // Step 2: Perplexityでトピック収集
  const collectTopics = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/create/flow/list/${sessionId}/collect`, {
        method: 'POST'
      })
      
      if (!response.ok) throw new Error('トピック収集に失敗')
      
      // ポーリングでステータス確認
      const checkStatus = setInterval(async () => {
        const statusResponse = await fetch(`/api/create/flow/list/${sessionId}`)
        const statusData = await statusResponse.json()
        
        if (statusData.session?.status === 'TOPICS_COLLECTED') {
          clearInterval(checkStatus)
          // Perplexityのレスポンスは生のMarkdown形式で保存されている
          // パースはバックエンドで行われるため、ここでは生データを保存
          const topicsData = statusData.session.topics
          
          // 簡易的な表示用データを作成
          const displayTopics = [{
            title: 'トピック収集完了',
            summary: `${typeof topicsData === 'string' ? topicsData.length : 0}文字のデータを収集しました`,
            keyPoints: ['詳細はGPTコンセプト生成後に確認できます']
          }]
          
          setSessionData(prev => ({ ...prev!, topics: displayTopics, rawTopics: topicsData }))
          setCurrentStep(3)
          setLoading(false)
          
          // 自動的にGPTコンセプト生成へ
          generateConcepts(sessionId)
        }
      }, 2000)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'トピック収集エラー')
      setLoading(false)
    }
  }

  // Step 3: GPTでコンセプト生成
  const generateConcepts = async (sessionId: string) => {
    setLoading(true)
    
    try {
      const response = await fetch(`/api/create/flow/list/${sessionId}/generate-concepts`, {
        method: 'POST'
      })
      
      if (!response.ok) throw new Error('コンセプト生成に失敗')
      
      // ポーリングでステータス確認
      const checkStatus = setInterval(async () => {
        const statusResponse = await fetch(`/api/create/flow/list/${sessionId}`)
        const statusData = await statusResponse.json()
        
        if (statusData.session?.status === 'CONCEPTS_GENERATED') {
          clearInterval(checkStatus)
          const concepts = typeof statusData.session.concepts === 'string' 
            ? JSON.parse(statusData.session.concepts) 
            : statusData.session.concepts
          
          setSessionData(prev => ({ ...prev!, concepts }))
          setCurrentStep(4)
          setLoading(false)
        }
      }, 2000)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'コンセプト生成エラー')
      setLoading(false)
    }
  }

  // Step 4: Claudeでコンテンツ生成
  const generateContents = async () => {
    if (!sessionData || selectedConcepts.length === 0) {
      setError('コンセプトを選択してください')
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      // 選択されたコンセプトIDを送信
      const response = await fetch(`/api/create/flow/list/${sessionData.sessionId}/select-concepts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conceptIds: selectedConcepts
        })
      })
      
      if (!response.ok) throw new Error('コンセプト選択に失敗')
      
      // Claudeでコンテンツ生成
      const generateResponse = await fetch(`/api/create/flow/list/${sessionData.sessionId}/claude-generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          characterId: 'cardi-dare'
        })
      })
      
      if (!generateResponse.ok) throw new Error('コンテンツ生成に失敗')
      
      // 結果を取得
      const sessionResponse = await fetch(`/api/create/flow/list/${sessionData.sessionId}`)
      const sessionResult = await sessionResponse.json()
      
      const contents = typeof sessionResult.session.contents === 'string' 
        ? JSON.parse(sessionResult.session.contents) 
        : sessionResult.session.contents
        
      // 下書きを作成
      const drafts = []
      for (const content of contents) {
        const draftResponse = await fetch('/api/create/draft/list', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: sessionData.sessionId,
            conceptId: content.conceptId,
            title: content.conceptTitle,
            content: content.content,
            hashtags: ['AI時代', 'カーディダーレ'],
            status: 'DRAFT',
            characterId: content.characterId
          })
        })
        
        if (draftResponse.ok) {
          const draft = await draftResponse.json()
          drafts.push(draft)
        }
      }
      
      setSessionData(prev => ({ ...prev!, contents, drafts }))
      setCurrentStep(5)
      setLoading(false)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'コンテンツ生成エラー')
      setLoading(false)
    }
  }

  // 投稿実行
  const handlePost = async (draft: any) => {
    try {
      const content = editingDraft === draft.id ? editedContent : draft.content
      const hashtags = draft.hashtags.map((tag: string) => `#${tag.replace(/^#/, '')}`).join(' ')
      const tweetText = `${content}\n\n${hashtags}`
      
      const response = await fetch('/api/publish/post/now/post/now/post/now', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: tweetText })
      })
      
      const result = await response.json()
      
      if (response.ok && result.success) {
        alert(`投稿成功！\nURL: ${result.url}`)
        
        // 下書きステータス更新
        await fetch(`/api/create/draft/list/${draft.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'POSTED',
            tweetId: result.id
          })
        })
      } else {
        throw new Error(result.error || '投稿失敗')
      }
    } catch (err) {
      alert('投稿エラー: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  // セクションの展開/折りたたみ
  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Brain className="w-8 h-8 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                詳細コンテンツ生成
              </h1>
              <p className="text-gray-600">
                各ステップの結果を確認しながら進めます
              </p>
            </div>
          </div>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <p className="ml-3 text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Step 1: テーマ入力 */}
        {currentStep === 1 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Step 1: テーマとスタイル設定</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  投稿テーマ
                </label>
                <input
                  type="text"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  placeholder="例: AIと働き方の未来"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  投稿スタイル
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {['エンターテイメント', '教育・解説', '感動・共感', 'ニュース・情報'].map((s) => (
                    <label
                      key={s}
                      className={`p-3 border-2 rounded-lg cursor-pointer ${
                        style === s ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <input
                        type="radio"
                        value={s}
                        checked={style === s}
                        onChange={(e) => setStyle(e.target.value)}
                        className="sr-only"
                      />
                      <span className="text-sm font-medium">{s}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <button
                onClick={createSession}
                disabled={!theme || loading}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    処理中...
                  </span>
                ) : (
                  '開始'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 2-5: 結果表示 */}
        {currentStep > 1 && sessionData && (
          <div className="space-y-6">
            {/* Step 2: Perplexityトピック */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <button
                onClick={() => toggleSection('topics')}
                className="w-full p-6 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      currentStep > 2 ? 'bg-green-500 text-white' : 
                      currentStep === 2 && loading ? 'bg-blue-500 text-white' : 
                      'bg-gray-300 text-gray-600'
                    }`}>
                      {currentStep > 2 ? <Check className="w-5 h-5" /> : '1'}
                    </div>
                    <div>
                      <h3 className="font-semibold">Perplexity: トピック収集</h3>
                      <p className="text-sm text-gray-600">
                        {currentStep === 2 && loading ? '収集中...' : 
                         sessionData.topics ? `${sessionData.topics.length}個のトピックを収集` : '待機中'}
                      </p>
                    </div>
                  </div>
                  {sessionData.topics && (
                    expandedSection === 'topics' ? 
                    <ChevronUp className="w-5 h-5 text-gray-400" /> : 
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>
              
              {expandedSection === 'topics' && sessionData.topics && (
                <div className="px-6 pb-6 space-y-4">
                  {sessionData.topics.map((topic: any, idx: number) => (
                    <div key={idx} className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium mb-2">{topic.title}</h4>
                      <p className="text-sm text-gray-600">{topic.summary}</p>
                      {topic.keyPoints && (
                        <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
                          {topic.keyPoints.map((point: string, i: number) => (
                            <li key={i}>{point}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Step 3: GPTコンセプト */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <button
                onClick={() => toggleSection('concepts')}
                className="w-full p-6 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      currentStep > 3 ? 'bg-green-500 text-white' : 
                      currentStep === 3 && loading ? 'bg-blue-500 text-white' : 
                      'bg-gray-300 text-gray-600'
                    }`}>
                      {currentStep > 3 ? <Check className="w-5 h-5" /> : '2'}
                    </div>
                    <div>
                      <h3 className="font-semibold">GPT: コンセプト生成</h3>
                      <p className="text-sm text-gray-600">
                        {currentStep === 3 && loading ? '生成中...' : 
                         sessionData.concepts ? `${sessionData.concepts.length}個のコンセプト` : '待機中'}
                      </p>
                    </div>
                  </div>
                  {sessionData.concepts && (
                    expandedSection === 'concepts' ? 
                    <ChevronUp className="w-5 h-5 text-gray-400" /> : 
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>
              
              {expandedSection === 'concepts' && sessionData.concepts && (
                <div className="px-6 pb-6 space-y-4">
                  {sessionData.concepts.map((concept: any) => (
                    <div key={concept.conceptId} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{concept.conceptTitle}</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            フック: {concept.hookType} / 角度: {concept.angle}
                          </p>
                          <p className="text-sm text-gray-600 mt-2">
                            スコア: {concept.viralScore}
                          </p>
                        </div>
                        {currentStep === 4 && (
                          <input
                            type="checkbox"
                            checked={selectedConcepts.includes(concept.conceptId)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedConcepts([...selectedConcepts, concept.conceptId])
                              } else {
                                setSelectedConcepts(selectedConcepts.filter(id => id !== concept.conceptId))
                              }
                            }}
                            className="ml-4 h-5 w-5 text-blue-600 rounded"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {currentStep === 4 && (
                    <button
                      onClick={generateContents}
                      disabled={selectedConcepts.length === 0 || loading}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      選択したコンセプトで生成 ({selectedConcepts.length}個)
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Step 4: Claude生成結果 */}
            {sessionData.contents && (
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center">
                      <Check className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Claude: 投稿生成完了</h3>
                      <p className="text-sm text-gray-600">
                        {sessionData.contents.length}個の投稿を生成しました
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {sessionData.drafts?.map((draft: any) => {
                      const isEditing = editingDraft === draft.id
                      const content = isEditing ? editedContent : draft.content
                      const hashtags = draft.hashtags.map((tag: string) => `#${tag.replace(/^#/, '')}`).join(' ')
                      const tweetText = `${content}\n\n${hashtags}`
                      
                      return (
                        <div key={draft.id} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <h4 className="font-medium">{draft.title}</h4>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  if (isEditing) {
                                    setEditingDraft(null)
                                    setEditedContent('')
                                  } else {
                                    setEditingDraft(draft.id)
                                    setEditedContent(draft.content)
                                  }
                                }}
                                className="p-2 text-gray-600 hover:bg-gray-200 rounded"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handlePost(draft)}
                                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                              >
                                <Send className="w-4 h-4" />
                                投稿
                              </button>
                            </div>
                          </div>
                          
                          {isEditing ? (
                            <textarea
                              value={editedContent}
                              onChange={(e) => setEditedContent(e.target.value)}
                              className="w-full p-3 border border-gray-300 rounded-lg"
                              rows={4}
                            />
                          ) : (
                            <p className="text-gray-800 whitespace-pre-wrap">{draft.content}</p>
                          )}
                          
                          <div className="mt-3 flex items-center justify-between">
                            <div className="flex gap-2">
                              {draft.hashtags.map((tag: string, idx: number) => (
                                <span key={idx} className="text-sm text-blue-600">
                                  #{tag.replace(/^#/, '')}
                                </span>
                              ))}
                            </div>
                            <span className={`text-sm ${
                              tweetText.length > 280 ? 'text-red-600 font-semibold' : 'text-gray-600'
                            }`}>
                              {tweetText.length}/280
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}