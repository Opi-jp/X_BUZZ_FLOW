import { Badge } from '@/components/ui/badge'
import { Circle } from 'lucide-react'
import { useEffect, useState } from 'react'

interface SystemHealth {
  api: 'operational' | 'degraded' | 'down'
  database: 'operational' | 'degraded' | 'down'
  scheduler: 'operational' | 'degraded' | 'down'
}

export function SystemStatus() {
  const [health, setHealth] = useState<SystemHealth>({
    api: 'operational',
    database: 'operational',
    scheduler: 'operational'
  })

  useEffect(() => {
    // TODO: 実際のヘルスチェックAPIを実装
    checkSystemHealth()
  }, [])

  const checkSystemHealth = async () => {
    // 簡易的な実装
    try {
      const response = await fetch('/api/health')
      if (response.ok) {
        setHealth({
          api: 'operational',
          database: 'operational',
          scheduler: 'operational'
        })
      }
    } catch (error) {
      console.error('Health check failed:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'text-green-500'
      case 'degraded': return 'text-yellow-500'
      case 'down': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  const allOperational = Object.values(health).every(s => s === 'operational')

  return (
    <div className="flex items-center gap-2">
      <Badge variant={allOperational ? 'default' : 'destructive'} className="flex items-center gap-1">
        <Circle className={`w-2 h-2 fill-current ${allOperational ? 'text-green-400' : 'text-red-400'}`} />
        {allOperational ? 'All Systems Operational' : 'System Issues'}
      </Badge>
    </div>
  )
}