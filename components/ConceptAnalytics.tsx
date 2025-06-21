'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart, TrendingUp, Target, Sparkles } from 'lucide-react'

interface ConceptAnalyticsProps {
  sessionId: string
}

export function ConceptAnalytics({ sessionId }: ConceptAnalyticsProps) {
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetchAnalytics()
  }, [sessionId])
  
  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/api/viral/v2/sessions/${sessionId}/analyze-concepts`)
      const data = await response.json()
      setAnalytics(data)
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }
  
  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">読み込み中...</div>
        </CardContent>
      </Card>
    )
  }
  
  if (!analytics) return null
  
  const { stats, topPerformers } = analytics
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart className="w-5 h-5" />
          コンセプト分析
        </CardTitle>
        <CardDescription>
          AIによる多角的な評価とスコアリング
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">概要</TabsTrigger>
            <TabsTrigger value="top">トップ5</TabsTrigger>
            <TabsTrigger value="distribution">分布</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">平均スコア</span>
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold mt-1">{stats.averageScore}</p>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">高評価数</span>
                  <Target className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold mt-1">
                  {stats.highScoringConcepts}/{stats.totalConcepts}
                </p>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold mb-2">角度の使用頻度</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.angleDistribution)
                  .sort((a, b) => (b[1] as number) - (a[1] as number))
                  .slice(0, 5)
                  .map(([angle, count]) => (
                    <Badge key={angle as string} variant="secondary">
                      {angle as string} ({count as number})
                    </Badge>
                  ))}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="top" className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              最も効果的なコンセプト
            </h4>
            {topPerformers.map((concept: any, index: number) => (
              <div key={concept.conceptId} className="border rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="outline">#{index + 1}</Badge>
                  <Badge variant={concept.score >= 85 ? "default" : "secondary"}>
                    {concept.score}点
                  </Badge>
                </div>
                <p className="text-sm font-medium">{concept.angle}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {concept.recommendation}
                </p>
              </div>
            ))}
          </TabsContent>
          
          <TabsContent value="distribution" className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold mb-2">フォーマット分布</h4>
              <div className="space-y-2">
                {Object.entries(stats.formatDistribution).map(([format, count]) => (
                  <div key={format} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{format}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full"
                          style={{ 
                            width: `${((count as number) / stats.totalConcepts) * 100}%` 
                          }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-8 text-right">
                        {count as number}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}