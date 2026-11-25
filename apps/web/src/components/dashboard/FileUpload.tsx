'use client'

import React, { useState, useRef } from 'react'
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
import Modal from '@/components/ui/Modal'
import { Button, IconButton } from '@/components/ui/Button'

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
  const { extractExifData, extracting } = useExifExtraction()
  const { config } = useAppConfig()
  const maxSizeGB = config?.max_file_size_gb ?? null
  const maxSizeLabel = formatDamMaxFileSizeLabel(maxSizeGB)
  
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
      return <PhotoIcon className="h-8 w-8 text-subtle" />
    } else if (file.type.startsWith('video/')) {
      return <VideoCameraIcon className="h-8 w-8 text-subtle" />
    } else if (file.type.startsWith('audio/')) {
      return <MusicalNoteIcon className="h-8 w-8 text-subtle" />
    } else {
      return <DocumentIcon className="h-8 w-8 text-subtle" />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <Modal
      title={tAssets('upload.modalTitle')}
      onClose={onClose}
      size="lg"
      dismissable={!uploading}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={uploading}>
            {tCommon('cancel')}
          </Button>
          <Button onClick={handleUpload} disabled={files.length === 0 || extracting} loading={uploading}>
            {uploading
              ? tAssets('upload.uploading')
              : extracting
                ? tAssets('upload.processing')
                : tAssets('upload.uploadButton', { count: files.length })}
          </Button>
        </>
      }
    >
      <div className="mb-5">
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
        className={`cursor-pointer rounded-card border-2 border-dashed p-8 text-center transition-colors ${
          dragOver ? 'border-accent bg-accent-subtle' : 'border-line-strong bg-sunken hover:bg-hover'
        }`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CloudArrowUpIcon className={`mx-auto mb-3 h-10 w-10 ${dragOver ? 'text-accent-text' : 'text-subtle'}`} aria-hidden />
        <p className={`mb-1 text-sm font-medium ${dragOver ? 'text-accent-text' : 'text-fg'}`}>
          {dragOver ? tAssets('upload.dropFilesHere') : tAssets('upload.clickToUpload')}
        </p>
        <p className="mb-2 text-sm text-muted">{tAssets('upload.dragAndDropHint')}</p>
        <p className="text-xs text-subtle">
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
        <div className="mt-5">
          <h3 className="mb-2 text-sm font-semibold text-fg">{tAssets('upload.selectedFiles', { count: files.length })}</h3>
          <ul className="max-h-56 space-y-2 overflow-y-auto">
            {files.map((file, index) => (
              <li key={index} className="flex items-center gap-3 rounded-control bg-sunken p-2.5">
                {file.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local blob preview
                  <img src={file.preview} alt={file.name} className="h-12 w-12 shrink-0 rounded-thumb object-cover" />
                ) : (
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center">{getFileIcon(file)}</span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-fg">{(file as FileWithPreview).originalFilename || file.name}</p>
                  <p className="text-meta">{formatFileSize(file.size)}</p>
                  {uploading && uploadProgress[index] !== undefined && (
                    <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-line">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${uploadProgress[index]}%` }} />
                    </div>
                  )}
                </div>
                <IconButton aria-label={tCommon('remove')} size="sm" onClick={() => removeFile(index)} disabled={uploading}>
                  <XMarkIcon className="h-4 w-4" aria-hidden />
                </IconButton>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  )
}
