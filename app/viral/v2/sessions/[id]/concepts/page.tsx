'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { FileText, MessageSquare, Images, ChevronLeft, ExternalLink } from 'lucide-react'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

const formatIcons = {
  single: <FileText className="w-4 h-4" />,
  thread: <MessageSquare className="w-4 h-4" />,
  carousel: <Images className="w-4 h-4" />
}

export default function ConceptsPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [selectedConcepts, setSelectedConcepts] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchSession()
  }, [id])

  const fetchSession = async () => {
    try {
      const response = await fetch(`/api/viral/v2/sessions/${id}`)
      const data = await response.json()
      setSession(data.session)
      
      // コンセプトがまだない場合は自動的に生成を開始
      if (data.session && data.session.status === 'TOPICS_COLLECTED') {
        handleGenerateConcepts()
      }
    } catch (error) {
      console.error('Error fetching session:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateConcepts = async () => {
    setGenerating(true)
    try {
      const response = await fetch(`/api/viral/v2/sessions/${id}/generate-concepts`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        throw new Error('Failed to generate concepts')
      }
      
      await fetchSession()
    } catch (error) {
      console.error('Error generating concepts:', error)
      alert('コンセプトの生成に失敗しました')
    } finally {
      setGenerating(false)
    }
  }

  const toggleConcept = (conceptId: string) => {
    const newSelected = new Set(selectedConcepts)
    if (newSelected.has(conceptId)) {
      newSelected.delete(conceptId)
    } else {
      newSelected.add(conceptId)
    }
    setSelectedConcepts(newSelected)
  }

  const handleContinue = async () => {
    if (selectedConcepts.size === 0) {
      alert('少なくとも1つのコンセプトを選択してください')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`/api/viral/v2/sessions/${id}/generate-contents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedIds: Array.from(selectedConcepts)
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to generate contents')
      }
      
      router.push(`/viral/v2/sessions/${id}/results`)
    } catch (error) {
      console.error('Error generating contents:', error)
      alert('コンテンツの生成に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="container max-w-6xl mx-auto py-8">
        <div className="text-center">読み込み中...</div>
      </div>
    )
  }

  const concepts = session?.concepts || []
  const topics = session?.topics?.parsed || []

  // トピックごとにコンセプトをグループ化
  const conceptsByTopic = topics.map((topic: any, topicIndex: number) => ({
    topic,
    concepts: concepts.filter((c: any) => 
      c.conceptId.startsWith(`topic${topicIndex + 1}_`)
    )
  }))

  return (
    <div className="container max-w-6xl mx-auto py-8">
      <div className="mb-8">
        <Button 
          variant="ghost" 
          onClick={() => router.push(`/viral/v2/sessions/${id}/topics`)}
          className="mb-4"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Step 1に戻る
        </Button>
        <h1 className="text-3xl font-bold mb-2">Step 2: コンセプト選択</h1>
        <p className="text-muted-foreground">
          各トピックから生成された9つのコンセプトから、実際にコンテンツ化したいものを選択してください
        </p>
      </div>

      {generating && (
        <Card className="mb-8">
          <CardContent className="py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>コンセプトを生成中...</p>
              <p className="text-sm text-muted-foreground mt-2">
                約20秒かかります
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {concepts.length > 0 && (
        <>
          <div className="space-y-8 mb-8">
            {conceptsByTopic.map(({ topic, concepts: topicConcepts }, topicIndex) => (
              <div key={topicIndex}>
                <div className="mb-4">
                  <h2 className="text-xl font-semibold">{topic.TOPIC}</h2>
                  <div className="flex items-center gap-4 mt-1">
                    <p className="text-sm text-muted-foreground">3つの異なるアプローチ</p>
                    <a 
                      href={topic.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      ソース記事
                    </a>
                  </div>
                  {topic.summary && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{topic.summary}</p>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {topicConcepts.map((concept: any) => (
                    <Card 
                      key={concept.conceptId}
                      className={selectedConcepts.has(concept.conceptId) ? 'ring-2 ring-primary' : ''}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <Checkbox
                            checked={selectedConcepts.has(concept.conceptId)}
                            onCheckedChange={() => toggleConcept(concept.conceptId)}
                          />
                          <Badge variant="outline" className="ml-2">
                            {formatIcons[concept.format as keyof typeof formatIcons]}
                            <span className="ml-1">{concept.format}</span>
                          </Badge>
                        </div>
                        <CardTitle className="text-base mt-2 line-clamp-2">
                          {concept.structure?.openingHook || concept.hook}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3 text-sm">
                          <div>
                            <p className="font-semibold">フックタイプ</p>
                            <p className="text-muted-foreground">{concept.hookType || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="font-semibold">角度</p>
                            <p className="text-muted-foreground">{concept.angle}</p>
                          </div>
                          {concept.structure && (
                            <div>
                              <p className="font-semibold">投稿構造</p>
                              <p className="text-muted-foreground text-xs line-clamp-3">
                                {concept.structure.openingHook}
                              </p>
                            </div>
                          )}
                          {concept.hashtags && (
                            <div>
                              <p className="font-semibold">ハッシュタグ</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {concept.hashtags.slice(0, 3).map((tag: string, i: number) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <Card>
            <CardContent className="py-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">
                    {selectedConcepts.size}個のコンセプトを選択中
                  </p>
                  <p className="text-sm text-muted-foreground">
                    選択したコンセプトから実際の投稿コンテンツを生成します
                  </p>
                </div>
                <Button 
                  onClick={handleContinue}
                  disabled={selectedConcepts.size === 0 || submitting}
                >
                  {submitting ? 'コンテンツ生成中...' : 'コンテンツ生成へ進む'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}