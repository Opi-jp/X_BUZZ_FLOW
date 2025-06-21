'use client'

import { useState } from 'react'
import { Copy, Edit3, Check, Twitter, Hash, MessageCircle } from 'lucide-react'
import { formatPresets } from '@/lib/utils/date-jst'

interface Content {
  content: string
  hashtags?: string[]
  characterNote?: string
  conceptId?: string
  postNumber?: number
}

interface ContentDisplayStepProps {
  contents: Content[] | Content | string
  postFormat: 'single' | 'thread'
  characterName?: string
  onConfirm: (editedContents?: Content[]) => void
  onEdit?: (index: number, newContent: string) => void
  isLoading?: boolean
}

export function ContentDisplayStep({ 
  contents, 
  postFormat,
  characterName = 'Cardi Dare',
  onConfirm, 
  onEdit,
  isLoading 
}: ContentDisplayStepProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editContent, setEditContent] = useState('')

  // contentsを配列形式に正規化
  const contentList: Content[] = Array.isArray(contents) 
    ? contents 
    : typeof contents === 'string'
    ? [{ content: contents }]
    : [contents]

  const handleCopy = (content: string, index: number) => {
    navigator.clipboard.writeText(content)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const handleEdit = (index: number) => {
    setEditingIndex(index)
    setEditContent(contentList[index].content)
  }

  const handleSaveEdit = (index: number) => {
    if (onEdit) {
      onEdit(index, editContent)
    }
    setEditingIndex(null)
    setEditContent('')
  }

  const getTotalLength = () => {
    return contentList.reduce((sum, content) => sum + content.content.length, 0)
  }

  const getHashtagsString = (hashtags?: string[]) => {
    if (!hashtags || hashtags.length === 0) return ''
    return hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ')
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="bg-purple-50 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Twitter className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-gray-900">
              {characterName}が生成した投稿文
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {postFormat === 'thread' 
                ? `スレッド形式（${contentList.length}投稿）` 
                : 'シングル投稿'}
              ・合計{getTotalLength()}文字
            </p>
          </div>
        </div>
      </div>

      {/* コンテンツリスト */}
      <div className="space-y-4">
        {contentList.map((content, index) => (
          <div
            key={index}
            className="bg-white rounded-lg border border-gray-200 overflow-hidden"
          >
            {/* コンテンツヘッダー */}
            {postFormat === 'thread' && (
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">
                    投稿 {index + 1}/{contentList.length}
                  </span>
                </div>
                <span className="text-sm text-gray-500">
                  {content.content.length}文字
                </span>
              </div>
            )}

            {/* コンテンツ本文 */}
            <div className="p-4">
              {editingIndex === index ? (
                <div className="space-y-3">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows={5}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditingIndex(null)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={() => handleSaveEdit(index)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      保存
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-gray-900 whitespace-pre-wrap">
                    {content.content}
                  </p>
                  
                  {/* ハッシュタグ */}
                  {content.hashtags && content.hashtags.length > 0 && (
                    <div className="mt-3 flex items-center gap-2">
                      <Hash className="w-4 h-4 text-blue-500" />
                      <p className="text-sm text-blue-600">
                        {getHashtagsString(content.hashtags)}
                      </p>
                    </div>
                  )}

                  {/* キャラクターノート */}
                  {content.characterNote && (
                    <div className="mt-3 p-3 bg-purple-50 rounded-lg">
                      <p className="text-sm text-purple-700 italic">
                        {content.characterNote}
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* アクションボタン */}
              {editingIndex !== index && (
                <div className="flex items-center gap-3 mt-4">
                  <button
                    onClick={() => handleCopy(content.content, index)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    {copiedIndex === index ? (
                      <>
                        <Check className="w-4 h-4" />
                        コピー済み
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        コピー
                      </>
                    )}
                  </button>
                  
                  {onEdit && (
                    <button
                      onClick={() => handleEdit(index)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      <Edit3 className="w-4 h-4" />
                      編集
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 投稿プレビュー */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">投稿プレビュー</h4>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
              {characterName[0]}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold">{characterName}</span>
                <span className="text-gray-500 text-sm">@cardi_dare · {formatPresets.time(new Date())}</span>
              </div>
              <div className="space-y-3">
                {contentList.map((content, index) => (
                  <div key={index}>
                    <p className="text-gray-900">{content.content}</p>
                    {content.hashtags && content.hashtags.length > 0 && (
                      <p className="text-blue-600 text-sm mt-1">
                        {getHashtagsString(content.hashtags)}
                      </p>
                    )}
                    {postFormat === 'thread' && index < contentList.length - 1 && (
                      <div className="mt-2 text-gray-400">↓</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 確認ボタン */}
      <div className="flex justify-end">
        <button
          onClick={() => onConfirm()}
          disabled={isLoading}
          className={`
            px-6 py-3 rounded-lg font-medium transition-all
            ${!isLoading
              ? 'bg-purple-600 text-white hover:bg-purple-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          {isLoading ? '処理中...' : '下書きを作成'}
        </button>
      </div>
    </div>
  )
}