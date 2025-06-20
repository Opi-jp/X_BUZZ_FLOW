/**
 * メディアアップロード管理
 * 画像・動画の最適化とTwitter API連携
 */

export interface MediaFile {
  id: string
  type: 'image' | 'video' | 'gif'
  url: string
  thumbnailUrl?: string
  filename: string
  size: number
  width?: number
  height?: number
  duration?: number // 動画の場合
  altText?: string
  uploadedAt: Date
  twitterMediaId?: string // Twitter API上のメディアID
}

export interface MediaUploadConfig {
  maxFileSize: number // バイト
  allowedTypes: string[]
  maxFiles: number
  requireAltText: boolean
  autoOptimize: boolean
}

/**
 * コンテンツタイプ別のメディア設定
 */
export const MEDIA_CONFIGS: Record<string, MediaUploadConfig> = {
  'image': {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    maxFiles: 4, // Twitter標準
    requireAltText: true,
    autoOptimize: true
  },
  'video': {
    maxFileSize: 512 * 1024 * 1024, // 512MB
    allowedTypes: ['video/mp4', 'video/mov', 'video/avi'],
    maxFiles: 1, // 動画は1つのみ
    requireAltText: false,
    autoOptimize: true
  },
  'gif': {
    maxFileSize: 15 * 1024 * 1024, // 15MB
    allowedTypes: ['image/gif'],
    maxFiles: 1, // GIFは1つのみ
    requireAltText: false,
    autoOptimize: false // GIFは最適化しない
  }
}

/**
 * ファイル検証
 */
export function validateMediaFile(file: File, config: MediaUploadConfig): ValidationResult {
  const errors: string[] = []

  // ファイルサイズチェック
  if (file.size > config.maxFileSize) {
    errors.push(`ファイルサイズが制限を超えています（${formatBytes(config.maxFileSize)}以下）`)
  }

  // ファイルタイプチェック
  if (!config.allowedTypes.includes(file.type)) {
    errors.push(`対応していないファイル形式です（${config.allowedTypes.join(', ')}）`)
  }

  // ファイル名チェック
  if (file.name.length > 100) {
    errors.push('ファイル名が長すぎます（100文字以下）')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

/**
 * Twitter投稿時のメディア最適化
 */
export async function optimizeForTwitter(file: File): Promise<OptimizedMedia> {
  const mediaType = getMediaType(file.type)
  
  switch (mediaType) {
    case 'image':
      return optimizeImage(file)
    case 'video':
      return optimizeVideo(file)
    default:
      return { file, optimized: false }
  }
}

interface OptimizedMedia {
  file: File
  optimized: boolean
  originalSize: number
  compressedSize: number
  compressionRatio?: number
}

/**
 * 画像最適化
 */
async function optimizeImage(file: File): Promise<OptimizedMedia> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      // Twitter推奨サイズに調整
      const maxWidth = 1200
      const maxHeight = 675
      
      let { width, height } = img
      
      // アスペクト比を維持しながらリサイズ
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width *= ratio
        height *= ratio
      }
      
      canvas.width = width
      canvas.height = height
      
      ctx?.drawImage(img, 0, 0, width, height)
      
      canvas.toBlob((blob) => {
        if (blob) {
          const optimizedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now()
          })
          
          resolve({
            file: optimizedFile,
            optimized: true,
            originalSize: file.size,
            compressedSize: optimizedFile.size,
            compressionRatio: (1 - optimizedFile.size / file.size) * 100
          })
        } else {
          resolve({ file, optimized: false, originalSize: file.size, compressedSize: file.size })
        }
      }, 'image/jpeg', 0.85) // 85%品質
    }
    
    img.src = URL.createObjectURL(file)
  })
}

/**
 * 動画最適化（基本的な情報取得のみ）
 */
async function optimizeVideo(file: File): Promise<OptimizedMedia> {
  // 動画は基本的にそのまま使用（ffmpeg等が必要な場合は別途実装）
  return { file, optimized: false, originalSize: file.size, compressedSize: file.size }
}

/**
 * メディアタイプ判定
 */
function getMediaType(mimeType: string): 'image' | 'video' | 'gif' | 'other' {
  if (mimeType.startsWith('image/')) {
    return mimeType === 'image/gif' ? 'gif' : 'image'
  }
  if (mimeType.startsWith('video/')) {
    return 'video'
  }
  return 'other'
}

/**
 * ファイルサイズフォーマット
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 画像のメタデータ取得
 */
export async function getImageMetadata(file: File): Promise<ImageMetadata> {
  return new Promise((resolve) => {
    const img = new Image()
    
    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height,
        aspectRatio: img.width / img.height,
        size: file.size,
        type: file.type
      })
    }
    
    img.onerror = () => {
      resolve({
        width: 0,
        height: 0,
        aspectRatio: 1,
        size: file.size,
        type: file.type
      })
    }
    
    img.src = URL.createObjectURL(file)
  })
}

export interface ImageMetadata {
  width: number
  height: number
  aspectRatio: number
  size: number
  type: string
}

/**
 * Twitter投稿に最適な画像サイズかチェック
 */
export function checkOptimalImageSize(metadata: ImageMetadata): SizeRecommendation {
  const { width, height, aspectRatio } = metadata
  
  // Twitter推奨アスペクト比
  const optimalRatios = {
    'single': { min: 1.91, max: 1.91, name: '1.91:1（推奨）' },
    'card': { min: 1.5, max: 1.5, name: '1.5:1（カード）' },
    'square': { min: 1, max: 1, name: '1:1（正方形）' }
  }
  
  const recommendations: string[] = []
  let isOptimal = false
  
  // サイズチェック
  if (width >= 1200 && height >= 675) {
    isOptimal = true
  } else {
    recommendations.push('1200x675px以上が推奨されます')
  }
  
  // アスペクト比チェック
  const ratio = Math.abs(aspectRatio - 1.91)
  if (ratio < 0.1) {
    isOptimal = true
  } else {
    recommendations.push('アスペクト比1.91:1が最も効果的です')
  }
  
  return {
    isOptimal,
    recommendations,
    currentRatio: aspectRatio.toFixed(2),
    optimalRatios
  }
}

export interface SizeRecommendation {
  isOptimal: boolean
  recommendations: string[]
  currentRatio: string
  optimalRatios: Record<string, any>
}