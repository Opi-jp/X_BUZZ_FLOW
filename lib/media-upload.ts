// メディアアップロード用ユーティリティ

export interface MediaFile {
  id: string
  file: File
  type: 'image' | 'video' | 'gif'
  url: string
  filename?: string
  size: number
  duration?: number // 動画の場合
  width?: number
  height?: number
  optimized?: boolean
  uploadedAt?: Date
  altText?: string
  metadata?: {
    aspectRatio?: number
    format?: string
    quality?: number
  }
}

export interface MediaConfig {
  maxSize: number // bytes
  maxWidth?: number
  maxHeight?: number
  allowedFormats: string[]
  quality?: number
}

export const MEDIA_CONFIGS: Record<string, MediaConfig> = {
  image: {
    maxSize: 5 * 1024 * 1024, // 5MB
    maxWidth: 1920,
    maxHeight: 1080,
    allowedFormats: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    quality: 0.85
  },
  video: {
    maxSize: 512 * 1024 * 1024, // 512MB
    maxWidth: 1920,
    maxHeight: 1080,
    allowedFormats: ['video/mp4', 'video/mov', 'video/avi']
  },
  gif: {
    maxSize: 15 * 1024 * 1024, // 15MB
    allowedFormats: ['image/gif']
  }
}

export function validateMediaFile(file: File, type: 'image' | 'video' | 'gif'): {
  valid: boolean
  error?: string
} {
  const config = MEDIA_CONFIGS[type]
  
  if (!config.allowedFormats.includes(file.type)) {
    return {
      valid: false,
      error: `サポートされていないファイル形式です。対応形式: ${config.allowedFormats.join(', ')}`
    }
  }
  
  if (file.size > config.maxSize) {
    const maxSizeMB = Math.round(config.maxSize / (1024 * 1024))
    return {
      valid: false,
      error: `ファイルサイズが大きすぎます。最大${maxSizeMB}MBまでです。`
    }
  }
  
  return { valid: true }
}

export async function getImageMetadata(file: File): Promise<{
  width: number
  height: number
  aspectRatio: number
}> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
        aspectRatio: img.naturalWidth / img.naturalHeight
      })
    }
    
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('画像の読み込みに失敗しました'))
    }
    
    img.src = url
  })
}

export function checkOptimalImageSize(width: number, height: number): {
  isOptimal: boolean
  recommendation?: string
} {
  // Twitter最適サイズの推奨値
  const optimalRatios = [
    { ratio: 16/9, name: '16:9 (横長)' },
    { ratio: 4/5, name: '4:5 (縦長)' },
    { ratio: 1/1, name: '1:1 (正方形)' }
  ]
  
  const currentRatio = width / height
  const tolerance = 0.1
  
  for (const optimal of optimalRatios) {
    if (Math.abs(currentRatio - optimal.ratio) < tolerance) {
      return {
        isOptimal: true
      }
    }
  }
  
  // 最も近い推奨比率を見つける
  const closest = optimalRatios.reduce((prev, curr) => 
    Math.abs(currentRatio - curr.ratio) < Math.abs(currentRatio - prev.ratio) ? curr : prev
  )
  
  return {
    isOptimal: false,
    recommendation: `Twitter向けには${closest.name}の比率が推奨されます`
  }
}

export async function optimizeForTwitter(file: File): Promise<MediaFile> {
  const type = file.type.startsWith('image/') ? 'image' : 
               file.type.startsWith('video/') ? 'video' : 'gif'
  
  const mediaFile: MediaFile = {
    id: `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    file,
    type,
    url: URL.createObjectURL(file),
    size: file.size
  }
  
  if (type === 'image') {
    try {
      const metadata = await getImageMetadata(file)
      mediaFile.width = metadata.width
      mediaFile.height = metadata.height
      mediaFile.metadata = {
        aspectRatio: metadata.aspectRatio,
        format: file.type
      }
      
      const sizeCheck = checkOptimalImageSize(metadata.width, metadata.height)
      mediaFile.optimized = sizeCheck.isOptimal
    } catch (error) {
      console.warn('画像メタデータの取得に失敗:', error)
    }
  }
  
  return mediaFile
}

export function formatFileSize(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB']
  if (bytes === 0) return '0 B'
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const size = bytes / Math.pow(1024, i)
  
  return `${size.toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`
}

export function getMediaIcon(type: 'image' | 'video' | 'gif') {
  switch (type) {
    case 'image':
      return 'ImageIcon'
    case 'video':
      return 'Video'
    case 'gif':
      return 'Zap'
    default:
      return 'FileText'
  }
}