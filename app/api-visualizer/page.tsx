'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertCircle, Search, RefreshCw, GitBranch, Database, FileCode } from 'lucide-react'

interface APIDependencies {
  statistics: {
    totalApis: number
    usedApis: number
    unusedApis: number
  }
  unusedApis: string[]
  duplicates: Record<string, string[]>
  dependencies: {
    frontendToApi: Record<string, string[]>
    apiToDb: Record<string, string[]>
    apiToApi: Record<string, string[]>
  }
}

export default function APIVisualizerPage() {
  const [dependencies, setDependencies] = useState<APIDependencies | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedApi, setSelectedApi] = useState<string | null>(null)

  const loadDependencies = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/tools/scan-dependencies')
      const data = await response.json()
      setDependencies(data)
    } catch (error) {
      console.error('Failed to load dependencies:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDependencies()
  }, [])

  const filterAPIs = (apis: string[]) => {
    if (!searchTerm) return apis
    return apis.filter(api => api.toLowerCase().includes(searchTerm.toLowerCase()))
  }

  const getAPIUsage = (api: string) => {
    if (!dependencies) return { frontend: [], apis: [] }
    
    const frontend = Object.entries(dependencies.dependencies.frontendToApi)
      .filter(([_, apis]) => apis.includes(api))
      .map(([page]) => page)
    
    const apis = Object.entries(dependencies.dependencies.apiToApi)
      .filter(([_, apis]) => apis.includes(api))
      .map(([api]) => api)
    
    return { frontend, apis }
  }

  if (!dependencies) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <RefreshCw className="animate-spin h-8 w-8 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    )
  }

  const { statistics, unusedApis, duplicates } = dependencies

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">API依存関係ビジュアライザー</h1>
        <Button onClick={loadDependencies} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          再スキャン
        </Button>
      </div>

      {/* 統計情報 */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">総API数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalApis}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">使用中</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{statistics.usedApis}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">未使用</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{statistics.unusedApis}</div>
          </CardContent>
        </Card>
      </div>

      {/* 検索 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="APIエンドポイントを検索..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* 重複エンドポイント */}
      {Object.keys(duplicates).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              重複している可能性があるエンドポイント
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(duplicates).map(([funcName, apis]) => (
              <div key={funcName} className="border rounded-lg p-3">
                <div className="font-medium mb-2">{funcName}</div>
                <div className="space-y-1">
                  {apis.map(api => (
                    <div key={api} className="text-sm text-muted-foreground">
                      {api}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* API依存関係マップ */}
      <Card>
        <CardHeader>
          <CardTitle>API依存関係マップ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* フロントエンド → API */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <FileCode className="h-4 w-4" />
                フロントエンド → API
              </h3>
              <div className="space-y-2">
                {Object.entries(dependencies.dependencies.frontendToApi)
                  .filter(([page]) => page.toLowerCase().includes(searchTerm.toLowerCase()))
                  .slice(0, 10)
                  .map(([page, apis]) => (
                    <div key={page} className="border rounded-lg p-3">
                      <div className="font-mono text-sm mb-2">{page.replace('app/', '')}</div>
                      <div className="space-y-1">
                        {apis.map(api => (
                          <Badge
                            key={api}
                            variant="outline"
                            className="cursor-pointer"
                            onClick={() => setSelectedApi(api)}
                          >
                            {api}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* API → DB */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Database className="h-4 w-4" />
                API → データベース
              </h3>
              <div className="space-y-2">
                {Object.entries(dependencies.dependencies.apiToDb)
                  .filter(([api]) => api.toLowerCase().includes(searchTerm.toLowerCase()))
                  .slice(0, 10)
                  .map(([api, tables]) => (
                    <div key={api} className="border rounded-lg p-3">
                      <div className="font-mono text-sm mb-2">{api}</div>
                      <div className="space-y-1">
                        {tables.map(table => (
                          <Badge key={table} variant="secondary">
                            {table}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 未使用API */}
      {unusedApis.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">未使用のAPIエンドポイント</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {filterAPIs(unusedApis).map(api => (
                <div key={api} className="font-mono text-sm text-muted-foreground">
                  {api}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 選択されたAPIの詳細 */}
      {selectedApi && (
        <Card>
          <CardHeader>
            <CardTitle>APIの詳細: {selectedApi}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">このAPIを使用しているページ:</h4>
                {getAPIUsage(selectedApi).frontend.length > 0 ? (
                  <div className="space-y-1">
                    {getAPIUsage(selectedApi).frontend.map(page => (
                      <div key={page} className="text-sm font-mono">{page}</div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">使用されていません</div>
                )}
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">データベーステーブル:</h4>
                {dependencies.dependencies.apiToDb[selectedApi] ? (
                  <div className="space-x-2">
                    {dependencies.dependencies.apiToDb[selectedApi].map(table => (
                      <Badge key={table} variant="secondary">{table}</Badge>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">DBアクセスなし</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}