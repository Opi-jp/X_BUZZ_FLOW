'use client'

import { TimeSlotPreset, ContentType, calculateEngagementScore } from '@/lib/time-slot-presets'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Clock, Users, Zap, TrendingUp } from 'lucide-react'

interface TimeSlotCardProps {
  preset: TimeSlotPreset
  selected?: boolean
  contentType?: ContentType
  onClick?: () => void
  showPrediction?: boolean
  scheduledDate?: Date
}

export default function TimeSlotCard({
  preset,
  selected = false,
  contentType = 'general',
  onClick,
  showPrediction = true,
  scheduledDate = new Date()
}: TimeSlotCardProps) {
  
  const engagementScore = calculateEngagementScore(preset.id, contentType, scheduledDate)
  const isRecommended = showPrediction && engagementScore >= 0.7
  
  const engagementColor = {
    'high': 'bg-green-100 text-green-800',
    'medium': 'bg-yellow-100 text-yellow-800', 
    'low': 'bg-gray-100 text-gray-800'
  }[preset.engagement]
  
  const competitionColor = {
    'high': 'bg-red-100 text-red-800',
    'medium': 'bg-orange-100 text-orange-800',
    'low': 'bg-green-100 text-green-800'
  }[preset.competition]

  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
        selected 
          ? 'ring-2 ring-blue-500 shadow-lg bg-blue-50' 
          : 'hover:shadow-md hover:bg-gray-50'
      } ${isRecommended ? 'ring-1 ring-green-400' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* ヘッダー */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{preset.icon}</span>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">
                {preset.name}
              </h3>
              <p className="text-xs text-gray-600 mt-1">
                {preset.targetAudience}
              </p>
            </div>
          </div>
          {isRecommended && (
            <Badge className="bg-green-100 text-green-800 text-xs">
              <TrendingUp className="w-3 h-3 mr-1" />
              推奨
            </Badge>
          )}
        </div>

        {/* 時間表示（JST） */}
        <div className="mb-3">
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="font-mono font-medium">平日</span>
              <span className="font-mono text-lg font-bold text-blue-600">
                {preset.weekdayTime}
              </span>
              <span className="text-xs text-gray-500">JST</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="font-mono font-medium">休日</span>
              <span className="font-mono text-lg font-bold text-purple-600">
                {preset.weekendTime}
              </span>
              <span className="text-xs text-gray-500">JST</span>
            </div>
          </div>
        </div>

        {/* 説明 */}
        <p className="text-sm text-gray-700 mb-3 leading-relaxed">
          {preset.description}
        </p>

        {/* 推奨コンテンツ */}
        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-1">推奨コンテンツ</p>
          <p className="text-sm font-medium text-gray-800">
            {preset.contentSuggestion}
          </p>
        </div>

        {/* メトリクス */}
        <div className="flex flex-wrap gap-2 mb-3">
          <Badge className={`text-xs ${engagementColor}`}>
            <Zap className="w-3 h-3 mr-1" />
            反応: {preset.engagement}
          </Badge>
          <Badge className={`text-xs ${competitionColor}`}>
            <Users className="w-3 h-3 mr-1" />
            競合: {preset.competition}
          </Badge>
        </div>

        {/* エンゲージメント予測 */}
        {showPrediction && (
          <div className="border-t pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">予測エンゲージメント</span>
              <span className="text-sm font-semibold text-gray-800">
                {Math.round(engagementScore * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  engagementScore >= 0.7 ? 'bg-green-500' :
                  engagementScore >= 0.5 ? 'bg-yellow-500' : 'bg-gray-400'
                }`}
                style={{ width: `${engagementScore * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* 特徴リスト（選択時のみ表示） */}
        {selected && (
          <div className="mt-4 border-t pt-3">
            <p className="text-xs text-gray-500 mb-2">時間帯の特徴</p>
            <ul className="space-y-1">
              {preset.characteristics.map((characteristic, index) => (
                <li key={index} className="text-xs text-gray-600 flex items-start">
                  <span className="text-blue-500 mr-1">•</span>
                  {characteristic}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}