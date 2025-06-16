'use client'

import { useState, useRef, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  MediaFile, 
  MEDIA_CONFIGS, 
  validateMediaFile,
  optimizeForTwitter,
  getImageMetadata,
  checkOptimalImageSize
} from '@/lib/media-upload'
import { 
  Upload, 
  X, 
  Image as ImageIcon, 
  Video, 
  FileText,
  CheckCircle,
  AlertCircle,
  Zap
} from 'lucide-react'

interface MediaUploaderProps {
  maxFiles?: number
  acceptedTypes?: ('image' | 'video' | 'gif')[]
  onFilesChange: (files: MediaFile[]) => void
  className?: string
}

export default function MediaUploader({
  maxFiles = 4,
  acceptedTypes = ['image', 'video', 'gif'],
  onFilesChange,
  className = ''
}: MediaUploaderProps) {
  
  const [files, setFiles] = useState<MediaFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const allowedMimeTypes = acceptedTypes.flatMap(type => MEDIA_CONFIGS[type].allowedTypes)
  const maxFileSize = Math.max(...acceptedTypes.map(type => MEDIA_CONFIGS[type].maxFileSize))

  const handleFileSelect = useCallback(async (selectedFiles: FileList) => {
    if (files.length >= maxFiles) {
      alert(`最大${maxFiles}ファイルまでアップロード可能です`)
      return
    }

    setUploading(true)
    setUploadProgress(0)

    const newFiles: MediaFile[] = []
    const totalFiles = selectedFiles.length

    for (let i = 0; i < selectedFiles.length && files.length + newFiles.length < maxFiles; i++) {
      const file = selectedFiles[i]
      setUploadProgress((i / totalFiles) * 100)

      // ファイル検証
      const mediaType = file.type.startsWith('image/') 
        ? file.type === 'image/gif' ? 'gif' : 'image'
        : file.type.startsWith('video/') ? 'video' : 'other'

      if (mediaType === 'other' || !acceptedTypes.includes(mediaType as any)) {
        alert(`${file.name}: 対応していないファイル形式です`)
        continue
      }

      const config = MEDIA_CONFIGS[mediaType]
      const validation = validateMediaFile(file, config)

      if (!validation.isValid) {
        alert(`${file.name}: ${validation.errors.join(', ')}`)
        continue
      }

      try {
        // 最適化処理
        const optimized = await optimizeForTwitter(file)
        
        // メタデータ取得
        let metadata = {}
        if (mediaType === 'image' || mediaType === 'gif') {
          const imageData = await getImageMetadata(optimized.file)
          metadata = {
            width: imageData.width,
            height: imageData.height,
            aspectRatio: imageData.aspectRatio
          }
        }

        // ファイル情報作成
        const mediaFile: MediaFile = {
          id: `${Date.now()}_${i}`,
          type: mediaType as 'image' | 'video' | 'gif',
          url: URL.createObjectURL(optimized.file),
          filename: file.name,
          size: optimized.file.size,
          uploadedAt: new Date(),
          ...metadata
        }

        newFiles.push(mediaFile)
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error)
        alert(`${file.name}: 処理中にエラーが発生しました`)
      }
    }

    const updatedFiles = [...files, ...newFiles]
    setFiles(updatedFiles)
    onFilesChange(updatedFiles)
    
    setUploading(false)
    setUploadProgress(0)
  }, [files, maxFiles, acceptedTypes, onFilesChange])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const droppedFiles = e.dataTransfer.files
    if (droppedFiles.length > 0) {
      handleFileSelect(droppedFiles)
    }
  }, [handleFileSelect])

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (selectedFiles) {
      handleFileSelect(selectedFiles)
    }
    // input値をリセット（同じファイルを再選択可能にする）
    e.target.value = ''
  }

  const removeFile = (fileId: string) => {
    const updatedFiles = files.filter(f => f.id !== fileId)
    setFiles(updatedFiles)
    onFilesChange(updatedFiles)
  }

  const updateAltText = (fileId: string, altText: string) => {
    const updatedFiles = files.map(f => 
      f.id === fileId ? { ...f, altText } : f
    )
    setFiles(updatedFiles)
    onFilesChange(updatedFiles)
  }

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image':
      case 'gif':
        return <ImageIcon className="w-4 h-4" />
      case 'video':
        return <Video className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  const getFileTypeColor = (type: string) => {
    switch (type) {
      case 'image':
        return 'bg-blue-100 text-blue-800'
      case 'video':
        return 'bg-purple-100 text-purple-800'
      case 'gif':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* アップロードエリア */}
      <Card
        className={`border-2 border-dashed transition-colors ${
          dragOver 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        } ${files.length >= maxFiles ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => {
          if (files.length < maxFiles && !uploading) {
            fileInputRef.current?.click()
          }
        }}
      >
        <CardContent className="p-8 text-center">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={allowedMimeTypes.join(',')}
            onChange={handleFileInputChange}
            className="hidden"
            disabled={files.length >= maxFiles || uploading}
          />
          
          {uploading ? (
            <div className="space-y-3">
              <Zap className="w-8 h-8 mx-auto text-blue-500 animate-pulse" />
              <div>
                <p className="text-sm font-medium text-gray-700">
                  ファイルを処理中...
                </p>
                <Progress value={uploadProgress} className="mt-2" />
              </div>
            </div>
          ) : files.length >= maxFiles ? (
            <div className="space-y-2">
              <CheckCircle className="w-8 h-8 mx-auto text-green-500" />
              <p className="text-sm text-gray-600">
                最大ファイル数に達しました ({files.length}/{maxFiles})
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <Upload className="w-8 h-8 mx-auto text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-700">
                  ファイルをドロップまたはクリックして選択
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {acceptedTypes.join('・')} • 最大{maxFiles}ファイル • {formatFileSize(maxFileSize)}以下
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* アップロード済みファイル一覧 */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">
              アップロード済みファイル ({files.length}/{maxFiles})
            </h4>
            {files.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFiles([])
                  onFilesChange([])
                }}
              >
                すべて削除
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {files.map((file) => (
              <Card key={file.id} className="relative">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    {/* プレビュー画像 */}
                    <div className="flex-shrink-0">
                      {file.type === 'image' || file.type === 'gif' ? (
                        <img
                          src={file.url}
                          alt={file.filename}
                          className="w-16 h-16 object-cover rounded border"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-100 rounded border flex items-center justify-center">
                          {getFileIcon(file.type)}
                        </div>
                      )}
                    </div>

                    {/* ファイル情報 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {file.filename}
                        </p>
                        <Badge className={`text-xs ${getFileTypeColor(file.type)}`}>
                          {file.type.toUpperCase()}
                        </Badge>
                      </div>

                      <div className="flex items-center space-x-4 text-xs text-gray-500 mb-2">
                        <span>{formatFileSize(file.size)}</span>
                        {file.width && file.height && (
                          <span>{file.width}×{file.height}</span>
                        )}
                      </div>

                      {/* 最適化情報 */}
                      {file.type === 'image' && file.width && file.height && (
                        <div className="mb-3">
                          {(() => {
                            const sizeCheck = checkOptimalImageSize({
                              width: file.width,
                              height: file.height,
                              aspectRatio: file.width / file.height,
                              size: file.size,
                              type: 'image/jpeg'
                            })
                            
                            return sizeCheck.isOptimal ? (
                              <div className="flex items-center space-x-1">
                                <CheckCircle className="w-3 h-3 text-green-500" />
                                <span className="text-xs text-green-600">Twitter最適サイズ</span>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-1">
                                <AlertCircle className="w-3 h-3 text-yellow-500" />
                                <span className="text-xs text-yellow-600">
                                  {sizeCheck.recommendations[0]}
                                </span>
                              </div>
                            )
                          })()}
                        </div>
                      )}

                      {/* Alt text入力 */}
                      {(file.type === 'image' || file.type === 'gif') && (
                        <div className="mt-2">
                          <Label htmlFor={`alt-${file.id}`} className="text-xs text-gray-600">
                            代替テキスト（アクセシビリティ向上のため推奨）
                          </Label>
                          <Input
                            id={`alt-${file.id}`}
                            placeholder="画像の説明を入力..."
                            value={file.altText || ''}
                            onChange={(e) => updateAltText(file.id, e.target.value)}
                            className="mt-1 text-sm"
                            maxLength={1000}
                          />
                        </div>
                      )}
                    </div>

                    {/* 削除ボタン */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}