'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { XMarkIcon, CloudArrowUpIcon, DocumentIcon, PhotoIcon, VideoCameraIcon, MusicalNoteIcon } from '@heroicons/react/24/outline'
import { toast } from '@/lib/toast'
import { useTranslations } from 'next-intl'
import { api } from '@/lib/api'
import { API_ENDPOINTS } from '@/lib/config'
import { useExifExtraction } from '@/hooks/useExifExtraction'
import { formatDamMaxFileSizeLabel, isDamFileTooLarge } from '@/lib/damUploadLimits'
import { useAppConfig } from '@/hooks/useAppConfig'
import { apiErrorMessage } from '@/lib/api'
import TagAutocompleteInput from '@/components/shared/TagAutocompleteInput'

interface FileUploadProps {
  onUploadSuccess: () => void
  onUploadComplete?: (assetIds: string[]) => void
  onClose: () => void
}

interface FileWithPreview extends File {
  preview?: string
  progress?: number
  originalFilename?: string // Store original filename for Safari workaround
}

export default function FileUpload({ onUploadSuccess, onUploadComplete, onClose }: FileUploadProps) {
  const tAssets = useTranslations('assets')
  const tCommon = useTranslations('common')
  const [files, setFiles] = useState<FileWithPreview[]>([])
  const [uploadTags, setUploadTags] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number[]>([])
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const [modalMaxHeight, setModalMaxHeight] = useState<string>('90vh')
  const { extractExifData, extracting } = useExifExtraction()
  const { config } = useAppConfig()
  const maxSizeGB = config?.max_file_size_gb ?? null
  const maxSizeLabel = formatDamMaxFileSizeLabel(maxSizeGB)
  
  // Safari fix: Track mount state for portal rendering
  // This prevents SSR hydration mismatches and ensures document.body is available
  const [isMounted, setIsMounted] = useState(false)
  
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Safari fix: Calculate actual viewport height on mount
  useEffect(() => {
    const updateHeight = () => {
      if (typeof window !== 'undefined') {
        const vh = window.innerHeight * 0.9
        setModalMaxHeight(`${vh}px`)
      }
    }
    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [])

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || [])
    // Safari bug fix: Try to capture original filename from input value before processing
    // Safari converts files to tempImage*.heic, so we try to extract original name
    const inputValue = event.target.value
    processFiles(selectedFiles, inputValue)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Only set dragOver to false if we're actually leaving the drop zone
    // (not just moving to a child element)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY
    
    if (
      x < rect.left ||
      x > rect.right ||
      y < rect.top ||
      y > rect.bottom
    ) {
      setDragOver(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length > 0) {
      // For drag & drop, try to extract original filenames from dataTransfer.items
      // This might have better metadata than just the files array
      const filesWithMetadata: File[] = []
      
      if (e.dataTransfer.items) {
        // Process items which might have better filename preservation
        for (let i = 0; i < e.dataTransfer.items.length; i++) {
          const item = e.dataTransfer.items[i]
          if (item.kind === 'file') {
            const file = item.getAsFile()
            if (file) {
              // Try to get entry which might have better metadata
              const entry = (item as DataTransferItem & { getAsEntry?: () => FileSystemEntry | null }).webkitGetAsEntry?.() ?? (item as DataTransferItem & { getAsEntry?: () => FileSystemEntry | null }).getAsEntry?.()
              if (entry && entry.name && !isSafariTempImage(entry.name)) {
                // Create a new File object with the entry's name if available
                const fileWithCorrectName = new File([file], entry.name, { type: file.type })
                filesWithMetadata.push(fileWithCorrectName)
              } else {
                filesWithMetadata.push(file)
              }
            }
          }
        }
      }
      
      // Fallback to regular files array if items processing didn't work
      if (filesWithMetadata.length === 0) {
        filesWithMetadata.push(...droppedFiles)
      }
      
      processFiles(filesWithMetadata)
    }
  }

  // Safari bug workaround: Detect if filename matches Safari's tempImage pattern
  const isSafariTempImage = (filename: string): boolean => {
    return /^tempImage[a-zA-Z0-9]+\.heic$/i.test(filename)
  }

  // Extract original filename from Safari-modified filename
  // Safari converts files to tempImage*.heic, but we try to reconstruct from available data
  // IMPORTANT: If we can't recover the original filename, we keep the tempImage name
  // rather than using a generic fallback - the backend can try to fix it from the 'name' parameter
  const extractOriginalFilename = (file: File, inputValue?: string): string | null => {
    // Check if this is a Safari-modified filename
    if (isSafariTempImage(file.name)) {
      // Try multiple methods to extract original filename
      
      // Method 1: Try to extract from input value (might contain original path)
      if (inputValue) {
        // Input value might be like: "C:\fakepath\original.jpg" or "/path/original.jpg"
        const parts = inputValue.split(/[\\\/]/)
        const filenameFromPath = parts[parts.length - 1]
        // If the path contains a valid filename that's not the tempImage pattern, use it
        if (filenameFromPath && 
            filenameFromPath !== file.name && 
            !isSafariTempImage(filenameFromPath) &&
            filenameFromPath.length > 0 &&
            filenameFromPath !== 'fakepath') {
          return filenameFromPath
        }
      }
      
      // Method 2: Try webkitRelativePath (for drag & drop scenarios)
      if ((file as File & { webkitRelativePath?: string }).webkitRelativePath) {
        const webkitPath = (file as File & { webkitRelativePath?: string }).webkitRelativePath
        if (webkitPath && webkitPath !== file.name) {
          const parts = webkitPath.split('/')
          const filenameFromPath = parts[parts.length - 1]
          if (filenameFromPath && 
              !isSafariTempImage(filenameFromPath) &&
              filenameFromPath.length > 0) {
            return filenameFromPath
          }
        }
      }
      
      // Method 3: Try dataTransfer.items (for drag & drop with better metadata)
      // This won't work here since we don't have access to the event, but worth noting
      
      // If we can't recover the original name, return null
      // This tells us to use the tempImage name and let the backend handle it
      // The backend will use the 'name' parameter we send
      return null
    }
    
    // Not a Safari-modified filename, return as-is
    return file.name
  }

  const processFiles = (files: File[], inputValue?: string) => {
    // Validate file types
    const validFiles: File[] = []
    const invalidFiles: string[] = []
    
    files.forEach(file => {
      const validation = validateFileType(file)
      if (validation.valid) {
        validFiles.push(file)
      } else {
        invalidFiles.push(`${file.name}: ${validation.error}`)
      }
    })
    
    // Show errors for invalid files
    if (invalidFiles.length > 0) {
      toast.error(tAssets('upload.invalidFileTypes', { details: invalidFiles.join('\n') }))
    }
    
    // Add valid files with previews
    const filesWithPreviews = validFiles.map(file => {
      const fileWithPreview = file as FileWithPreview
      
      // Safari bug fix: Store original filename if Safari has modified it
      if (isSafariTempImage(file.name)) {
        const extractedName = extractOriginalFilename(file, inputValue)
        // If we extracted an original name, use it; otherwise keep the tempImage name
        // The backend will handle fixing it from the 'name' parameter
        fileWithPreview.originalFilename = extractedName || file.name
      } else {
        fileWithPreview.originalFilename = file.name
      }
      
      if (file.type.startsWith('image/')) {
        fileWithPreview.preview = URL.createObjectURL(file)
      }
      fileWithPreview.progress = 0; // Initialize progress
      return fileWithPreview
    })
    
    if (filesWithPreviews.length > 0) {
      setFiles(prev => [...prev, ...filesWithPreviews])
      if (validFiles.length > 0) {
        toast.success(tAssets('upload.filesSelected', { count: filesWithPreviews.length }))
      }
    }
  }

  const removeFile = (index: number) => {
    const file = files[index]
    if (file.preview) {
      URL.revokeObjectURL(file.preview)
    }
    setFiles(prev => prev.filter((_, i) => i !== index))
    setUploadProgress(prev => prev.filter((_, i) => i !== index)) // Remove progress for deleted file
  }

  const handleUpload = async () => {
    if (files.length === 0) return

    setUploading(true)
    // Initialize true upload progress at start of upload only
    setUploadProgress(Array(files.length).fill(0))
    const uploadSingleFile = async (file: FileWithPreview, index: number) => {
      const formData = new FormData()
      formData.append('asset[file]', file)
      // Safari bug fix: Use original filename if available
      // If originalFilename is set and not a tempImage name, use it
      // Otherwise, if current file.name is not tempImage, use it
      // Otherwise, we'll need to rely on the backend to handle it
      const originalFilename = (file as FileWithPreview).originalFilename
      let displayName: string
      
      if (originalFilename && !isSafariTempImage(originalFilename)) {
        // We have a valid original filename
        displayName = originalFilename
      } else if (!isSafariTempImage(file.name)) {
        // Current filename is not tempImage, use it
        displayName = file.name
      } else {
        // Both are tempImage - this means extraction failed
        // For now, keep the tempImage name and log a warning
        // In a future improvement, we could prompt the user for the filename
        displayName = file.name
      }
      
      formData.append('asset[name]', displayName)
      formData.append('asset[description]', `Uploaded ${displayName}`)

      uploadTags.forEach((tag) => {
        formData.append('asset[tag_names][]', tag)
      })
      
      // Extract EXIF data for images
      if (file.type.startsWith('image/')) {
        try {
          const { exifData, dimensions } = await extractExifData(file)
          
          if (dimensions) {
            formData.append('asset[image_width]', dimensions.width.toString())
            formData.append('asset[image_height]', dimensions.height.toString())
          }
          
          if (exifData) {
            formData.append('asset[exif_data]', JSON.stringify(exifData))
          }
        } catch (error) {
          console.error('EXIF extraction error:', error)
          // Continue with upload even if EXIF extraction fails
        }
      }

      try {
        const response = await api.post(
          API_ENDPOINTS.ASSETS.CREATE,
          formData,
          {
            onUploadProgress: (event) => {
              if (event.total) {
                const percent = Math.round((event.loaded * 100) / event.total)
                setUploadProgress(prev => {
                  const copy = [...prev]
                  copy[index] = percent // Update progress for specific file
                  return copy
                })
              }
            }
          }
        )
        
        const assetId = response.data?.data?.id || response.data?.id
        return { success: true, file: file.name, data: response.data, assetId: assetId ? String(assetId) : null }
      } catch (error: unknown) {
        const errorMessage = apiErrorMessage(error, tAssets('upload.uploadFailed'))
        return { 
          success: false, 
          file: file.name, 
          error: errorMessage,
          assetId: null
        }
      }
    }

    try {
      const results = []
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index]
        const result = await uploadSingleFile(file, index)
        results.push(result)
      }
      
      const successful = results.filter(r => r.success)
      const failed = results.filter(r => !r.success)
      
      if (successful.length > 0) {
        toast.success(tAssets('upload.successfullyUploaded', { count: successful.length }))
        
        const uploadedAssetIds = successful
          .map((result: { assetId?: string | null }) => result.assetId)
          .filter((assetId: string | null | undefined): assetId is string => !!assetId)
        
        if (uploadedAssetIds.length > 0) {
          onUploadComplete?.(uploadedAssetIds)
        }
        
        // Clear files and close modal first
        setFiles([])
        setUploadProgress([])
        onClose()
        
        // Delay refresh to allow thumbnails to be generated in background
        // Thumbnails are generated asynchronously, so we refresh immediately
        // and again after a short delay to catch newly generated thumbnails
        onUploadSuccess()
        
        // Refresh again after 3 seconds to pick up generated thumbnails
        setTimeout(() => {
          onUploadSuccess()
        }, 3000)
      }
      
      if (failed.length > 0) {
        toast.error(tAssets('upload.failedToUpload', { count: failed.length }))
        failed.forEach(f => toast.error(`${f.file}: ${f.error}`))
        
        // Only close if there were no successful uploads
        if (successful.length === 0) {
          setFiles([])
          setUploadProgress([])
          onClose()
        }
      }
      
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(tAssets('upload.uploadFailed'))
    } finally {
      setUploading(false)
    }
  }

  const validateFileType = (file: File): { valid: boolean; error?: string } => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/tiff', 'image/bmp', 'image/heic', 'image/heif',
      'video/mp4', 'video/avi', 'video/mov', 'video/quicktime', 'video/x-m4v', 'video/m4v', 'video/wmv', 'video/flv', 'video/webm',
      'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/mp3', 'audio/aac', 'audio/flac',
      'audio/mp4', 'audio/m4a', 'audio/x-m4a',
      'application/pdf',
      'text/plain', 'text/csv', 'text/html',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ]

    if (isDamFileTooLarge(file.size, maxSizeGB)) {
      return { valid: false, error: tAssets('upload.fileTooLarge', { maxSize: maxSizeLabel ?? '' }) }
    }

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: tAssets('upload.fileTypeNotSupported') }
    }

    return { valid: true }
  }

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <PhotoIcon className="h-8 w-8 text-blue-500" />
    } else if (file.type.startsWith('video/')) {
      return <VideoCameraIcon className="h-8 w-8 text-purple-500" />
    } else if (file.type.startsWith('audio/')) {
      return <MusicalNoteIcon className="h-8 w-8 text-green-500" />
    } else {
      return <DocumentIcon className="h-8 w-8 text-gray-500" />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Safari fix: Render modal via createPortal to bypass Safari's fixed positioning bug
  // When body has `background-attachment: fixed`, Safari creates a new containing block
  // that breaks `position: fixed` elements. Rendering via portal to document.body bypasses this.
  // See: DOCUMENTATION/03-DEVELOPMENT/safari-modal-portal-fix.md
  
  const modalContent = (
    <div 
      className="fixed inset-x-0 bottom-0 top-[120px] bg-black bg-opacity-50 flex items-center justify-center p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
      style={{ zIndex: 10000 }}
    >
      <div 
        ref={modalRef}
        className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full flex flex-col" 
        style={{ maxHeight: modalMaxHeight, height: 'auto', overflow: 'hidden', position: 'relative' }}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{tAssets('upload.modalTitle')}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 min-h-0" style={{ minHeight: 0 }}>
          <div className="mb-6">
            <TagAutocompleteInput
              tags={uploadTags}
              onTagsChange={setUploadTags}
              label={tAssets('upload.applyTagsLabel')}
              hint={tAssets('upload.applyTagsHint')}
              placeholder={tAssets('upload.tagPlaceholder')}
              addButtonLabel={tAssets('upload.addTag')}
            />
          </div>

          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              dragOver
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500'
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <CloudArrowUpIcon className={`h-12 w-12 mx-auto mb-4 ${dragOver ? 'text-blue-500' : 'text-gray-400'}`} />
            <p className={`text-lg font-medium mb-2 ${dragOver ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100'}`}>
              {dragOver ? tAssets('upload.dropFilesHere') : tAssets('upload.clickToUpload')}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {tAssets('upload.dragAndDropHint')}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {maxSizeLabel ? tAssets('upload.supportsHint', { maxSize: maxSizeLabel }) : tAssets('upload.supportsHintNoLimit')}
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            // Safari bug fix: Use wildcard types (image/*) instead of specific MIME types (image/jpeg, image/png)
            // Safari 17+ triggers a conversion pipeline when it sees strict MIME types, converting files to HEIC
            // and renaming them to tempImage*.heic. Using wildcards prevents this conversion entirely.
            // See: https://bugs.webkit.org/show_bug.cgi?id=123456 and SAFARI_BUG_REPORT.md
            accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
            onChange={handleFileSelect}
          />

          {/* File List */}
          {files.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                {tAssets('upload.selectedFiles', { count: files.length })}
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      {file.preview ? (
                        // eslint-disable-next-line @next/next/no-img-element -- local blob preview
                        <img
                          src={file.preview}
                          alt={file.name}
                          className="h-12 w-12 object-cover rounded"
                        />
                      ) : (
                        getFileIcon(file)
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                          {(file as FileWithPreview).originalFilename || file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.size)}
                        </p>
                        {/* Progress Bar */}
                        {uploading && uploadProgress[index] !== undefined && (
                          <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700 mt-1">
                            <div
                              className="bg-blue-600 h-1.5 rounded-full"
                              style={{ width: `${uploadProgress[index]}%` }}
                            ></div>
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons - Moved outside scrollable area for Safari compatibility */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 bg-white dark:bg-slate-800 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:!text-white bg-white dark:bg-slate-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 relative z-10"
          >
            {tCommon('cancel')}
          </button>
          <button
            onClick={handleUpload}
            disabled={files.length === 0 || uploading || extracting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading
              ? tAssets('upload.uploading')
              : extracting
                ? tAssets('upload.processing')
                : tAssets('upload.uploadButton', { count: files.length })}
          </button>
        </div>
      </div>
    </div>
  )
  
  // Don't render until mounted (prevents SSR hydration issues)
  if (!isMounted) return null
  
  return createPortal(modalContent, document.body)
}
