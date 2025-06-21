'use client'

import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'
import { formatPresets } from '@/lib/utils/date-jst'

export function JSTClock() {
  const [time, setTime] = useState<string>('')
  
  useEffect(() => {
    // 初期表示
    setTime(formatPresets.full(new Date()))
    
    // 1秒ごとに更新
    const timer = setInterval(() => {
      setTime(formatPresets.full(new Date()))
    }, 1000)
    
    return () => clearInterval(timer)
  }, [])
  
  if (!time) return null
  
  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <Clock className="w-4 h-4" />
      <span className="font-mono">{time}</span>
    </div>
  )
}