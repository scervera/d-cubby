'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { useTranslations } from 'next-intl'
import type { ImageDerivativeRequest } from '@/lib/assetsApi'

interface ImageEditorAsset {
  id: string
  attributes: {
    name: string
    file_url?: string
    preview_url?: string
    thumbnail_url?: string
    image_dimensions?: {
      width: number
      height: number
    }
  }
}

interface ImageEditorModalProps {
  asset: ImageEditorAsset
  isOpen: boolean
  isSaving: boolean
  onClose: () => void
  onSave: (payload: ImageDerivativeRequest) => Promise<void>
}

const MAX_PREVIEW_WIDTH = 920
const MAX_PREVIEW_HEIGHT = 620
const MIN_CROP_SIZE = 1

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

interface CropInteractionState {
  mode: 'move' | 'resize'
  handle?: ResizeHandle
  startClientX: number
  startClientY: number
  startCrop: {
    x: number
    y: number
    width: number
    height: number
  }
}

const HANDLE_STYLES: Record<ResizeHandle, CSSProperties> = {
  nw: { left: 0, top: 0, transform: 'translate(-50%, -50%)' },
  n: { left: '50%', top: 0, transform: 'translate(-50%, -50%)' },
  ne: { right: 0, top: 0, transform: 'translate(50%, -50%)' },
  e: { right: 0, top: '50%', transform: 'translate(50%, -50%)' },
  se: { right: 0, bottom: 0, transform: 'translate(50%, 50%)' },
  s: { left: '50%', bottom: 0, transform: 'translate(-50%, 50%)' },
  sw: { left: 0, bottom: 0, transform: 'translate(-50%, 50%)' },
  w: { left: 0, top: '50%', transform: 'translate(-50%, -50%)' }
}

const HANDLE_CURSORS: Record<ResizeHandle, string> = {
  nw: 'nwse-resize',
  n: 'ns-resize',
  ne: 'nesw-resize',
  e: 'ew-resize',
  se: 'nwse-resize',
  s: 'ns-resize',
  sw: 'nesw-resize',
  w: 'ew-resize'
}

export default function ImageEditorModal({ asset, isOpen, isSaving, onClose, onSave }: ImageEditorModalProps) {
  const tAssets = useTranslations('assets')
  const sourceUrl = asset.attributes.file_url || asset.attributes.preview_url || asset.attributes.thumbnail_url
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const cropStageRef = useRef<HTMLDivElement | null>(null)
  const cropImageRef = useRef<HTMLImageElement | null>(null)
  const cropInteractionRef = useRef<CropInteractionState | null>(null)
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null)
  const [imageDisplayRect, setImageDisplayRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [copyTags, setCopyTags] = useState(true)
  const [cropX, setCropX] = useState(0)
  const [cropY, setCropY] = useState(0)
  const [cropWidth, setCropWidth] = useState(1)
  const [cropHeight, setCropHeight] = useState(1)
  const [resizeWidth, setResizeWidth] = useState(1)
  const [resizeHeight, setResizeHeight] = useState(1)
  const [resizeMode, setResizeMode] = useState<'exact' | 'limit' | 'fill'>('exact')
  const [autoSyncResizeToCrop, setAutoSyncResizeToCrop] = useState(true)
  const [lockAspect, setLockAspect] = useState(true)
  const [rotationDegrees, setRotationDegrees] = useState(0)
  const [outputFormat, setOutputFormat] = useState<'keep' | 'jpg' | 'png' | 'webp'>('keep')
  const [outputQuality, setOutputQuality] = useState(90)

  const sourceDimensions = useMemo(() => {
    const fallback = asset.attributes.image_dimensions || { width: 1, height: 1 }
    return {
      width: sourceImage?.naturalWidth || fallback.width,
      height: sourceImage?.naturalHeight || fallback.height
    }
  }, [asset.attributes.image_dimensions, sourceImage])

  const effectiveCrop = useMemo(() => {
    const width = clamp(cropWidth, 1, sourceDimensions.width)
    const height = clamp(cropHeight, 1, sourceDimensions.height)
    const x = clamp(cropX, 0, sourceDimensions.width - 1)
    const y = clamp(cropY, 0, sourceDimensions.height - 1)

    return {
      x,
      y,
      width: Math.min(width, sourceDimensions.width - x),
      height: Math.min(height, sourceDimensions.height - y)
    }
  }, [cropX, cropY, cropWidth, cropHeight, sourceDimensions.height, sourceDimensions.width])

  const effectiveResize = useMemo(() => {
    return {
      width: clamp(resizeWidth, 1, 12000),
      height: clamp(resizeHeight, 1, 12000)
    }
  }, [resizeHeight, resizeWidth])

  const displayCropRect = useMemo(() => {
    if (!imageDisplayRect) {
      return null
    }

    const scaleX = imageDisplayRect.width / sourceDimensions.width
    const scaleY = imageDisplayRect.height / sourceDimensions.height

    return {
      left: imageDisplayRect.left + effectiveCrop.x * scaleX,
      top: imageDisplayRect.top + effectiveCrop.y * scaleY,
      width: Math.max(1, effectiveCrop.width * scaleX),
      height: Math.max(1, effectiveCrop.height * scaleY)
    }
  }, [effectiveCrop.height, effectiveCrop.width, effectiveCrop.x, effectiveCrop.y, imageDisplayRect, sourceDimensions.height, sourceDimensions.width])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const initialName = `${asset.attributes.name.replace(/\.[^/.]+$/, '')}-edited`
    setName(initialName)
    setDescription('')
    setCopyTags(true)
    setRotationDegrees(0)
    setResizeMode('exact')
    setAutoSyncResizeToCrop(true)
    setLockAspect(true)
    setOutputFormat('keep')
    setOutputQuality(90)

    const width = sourceDimensions.width
    const height = sourceDimensions.height
    setCropX(0)
    setCropY(0)
    setCropWidth(width)
    setCropHeight(height)
    setResizeWidth(width)
    setResizeHeight(height)
  }, [asset.attributes.name, isOpen, sourceDimensions.height, sourceDimensions.width])

  useEffect(() => {
    if (!isOpen || !sourceUrl) {
      setSourceImage(null)
      return
    }

    const image = new Image()
    image.onload = () => setSourceImage(image)
    image.onerror = () => setSourceImage(null)
    image.src = sourceUrl
  }, [isOpen, sourceUrl])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const updateDisplayRect = () => {
      if (!cropStageRef.current || !cropImageRef.current) {
        return
      }

      const stageRect = cropStageRef.current.getBoundingClientRect()
      const imageRect = cropImageRef.current.getBoundingClientRect()

      setImageDisplayRect({
        left: imageRect.left - stageRect.left,
        top: imageRect.top - stageRect.top,
        width: imageRect.width,
        height: imageRect.height
      })
    }

    updateDisplayRect()
    window.addEventListener('resize', updateDisplayRect)
    return () => {
      window.removeEventListener('resize', updateDisplayRect)
    }
  }, [isOpen, sourceDimensions.height, sourceDimensions.width, sourceUrl])

  useEffect(() => {
    if (!autoSyncResizeToCrop) {
      return
    }

    if (resizeWidth !== effectiveCrop.width) {
      setResizeWidth(effectiveCrop.width)
    }

    if (resizeHeight !== effectiveCrop.height) {
      setResizeHeight(effectiveCrop.height)
    }
  }, [autoSyncResizeToCrop, effectiveCrop.height, effectiveCrop.width, resizeHeight, resizeWidth])

  useEffect(() => {
    if (!isOpen || !sourceImage || !canvasRef.current) {
      return
    }

    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    if (!context) {
      return
    }

    const radians = (rotationDegrees * Math.PI) / 180
    const baseWidth = effectiveResize.width
    const baseHeight = effectiveResize.height
    const rotatedWidth = Math.abs(baseWidth * Math.cos(radians)) + Math.abs(baseHeight * Math.sin(radians))
    const rotatedHeight = Math.abs(baseWidth * Math.sin(radians)) + Math.abs(baseHeight * Math.cos(radians))

    const scale = Math.min(
      MAX_PREVIEW_WIDTH / Math.max(rotatedWidth, 1),
      MAX_PREVIEW_HEIGHT / Math.max(rotatedHeight, 1),
      1
    )

    canvas.width = Math.max(1, Math.round(rotatedWidth * scale))
    canvas.height = Math.max(1, Math.round(rotatedHeight * scale))

    context.clearRect(0, 0, canvas.width, canvas.height)
    context.save()
    context.translate(canvas.width / 2, canvas.height / 2)
    context.rotate(radians)

    context.drawImage(
      sourceImage,
      effectiveCrop.x,
      effectiveCrop.y,
      effectiveCrop.width,
      effectiveCrop.height,
      (-baseWidth * scale) / 2,
      (-baseHeight * scale) / 2,
      baseWidth * scale,
      baseHeight * scale
    )

    context.restore()
  }, [effectiveCrop, effectiveResize, isOpen, rotationDegrees, sourceImage])

  const cropAspect = useMemo(() => {
    if (effectiveCrop.height <= 0) {
      return 1
    }
    return effectiveCrop.width / effectiveCrop.height
  }, [effectiveCrop.height, effectiveCrop.width])

  const onResizeWidthChange = (value: number) => {
    setAutoSyncResizeToCrop(false)
    const safeWidth = clamp(Math.round(value || 1), 1, 12000)
    setResizeWidth(safeWidth)

    if (lockAspect) {
      setResizeHeight(clamp(Math.round(safeWidth / cropAspect), 1, 12000))
    }
  }

  const onResizeHeightChange = (value: number) => {
    setAutoSyncResizeToCrop(false)
    const safeHeight = clamp(Math.round(value || 1), 1, 12000)
    setResizeHeight(safeHeight)

    if (lockAspect) {
      setResizeWidth(clamp(Math.round(safeHeight * cropAspect), 1, 12000))
    }
  }

  const updateCropFromInteraction = (event: PointerEvent) => {
    const interaction = cropInteractionRef.current
    if (!interaction) {
      return
    }
    if (!imageDisplayRect) {
      return
    }

    const scaleX = sourceDimensions.width / imageDisplayRect.width
    const scaleY = sourceDimensions.height / imageDisplayRect.height
    const deltaX = (event.clientX - interaction.startClientX) * scaleX
    const deltaY = (event.clientY - interaction.startClientY) * scaleY

    let left = interaction.startCrop.x
    let top = interaction.startCrop.y
    let right = interaction.startCrop.x + interaction.startCrop.width
    let bottom = interaction.startCrop.y + interaction.startCrop.height

    if (interaction.mode === 'move') {
      const width = interaction.startCrop.width
      const height = interaction.startCrop.height
      const nextX = clamp(Math.round(interaction.startCrop.x + deltaX), 0, sourceDimensions.width - width)
      const nextY = clamp(Math.round(interaction.startCrop.y + deltaY), 0, sourceDimensions.height - height)
      setCropX(nextX)
      setCropY(nextY)
      return
    }

    if (!interaction.handle) {
      return
    }

    if (interaction.handle.includes('w')) {
      left = clamp(left + deltaX, 0, right - MIN_CROP_SIZE)
    }
    if (interaction.handle.includes('e')) {
      right = clamp(right + deltaX, left + MIN_CROP_SIZE, sourceDimensions.width)
    }
    if (interaction.handle.includes('n')) {
      top = clamp(top + deltaY, 0, bottom - MIN_CROP_SIZE)
    }
    if (interaction.handle.includes('s')) {
      bottom = clamp(bottom + deltaY, top + MIN_CROP_SIZE, sourceDimensions.height)
    }

    const nextX = clamp(Math.round(left), 0, sourceDimensions.width - 1)
    const nextY = clamp(Math.round(top), 0, sourceDimensions.height - 1)
    const nextWidth = clamp(Math.round(right - left), MIN_CROP_SIZE, sourceDimensions.width - nextX)
    const nextHeight = clamp(Math.round(bottom - top), MIN_CROP_SIZE, sourceDimensions.height - nextY)

    setCropX(nextX)
    setCropY(nextY)
    setCropWidth(nextWidth)
    setCropHeight(nextHeight)
  }

  const beginCropInteraction = (
    interaction: Omit<CropInteractionState, 'startClientX' | 'startClientY' | 'startCrop'>,
    clientX: number,
    clientY: number
  ) => {
    cropInteractionRef.current = {
      ...interaction,
      startClientX: clientX,
      startClientY: clientY,
      startCrop: {
        x: effectiveCrop.x,
        y: effectiveCrop.y,
        width: effectiveCrop.width,
        height: effectiveCrop.height
      }
    }

    const onPointerMove = (pointerEvent: PointerEvent) => {
      pointerEvent.preventDefault()
      updateCropFromInteraction(pointerEvent)
    }

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      cropInteractionRef.current = null
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }

  const handleSubmit = async () => {
    const payload: ImageDerivativeRequest = {
      name: name.trim() || undefined,
      description: description.trim() || undefined,
      copy_tags: copyTags,
      derivative_kind: 'edit',
      operations: {
        crop: {
          x: effectiveCrop.x,
          y: effectiveCrop.y,
          width: effectiveCrop.width,
          height: effectiveCrop.height
        },
        resize: {
          width: effectiveResize.width,
          height: effectiveResize.height,
          mode: resizeMode
        },
        rotate: {
          degrees: rotationDegrees
        }
      },
      output: {
        format: outputFormat,
        quality: outputQuality
      }
    }

    await onSave(payload)
  }

  if (!isOpen) {
    return null
  }

  if (typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="glass-panel w-full max-h-[94vh] max-w-[1320px] overflow-y-auto border border-white/25 px-4 py-4 dark:border-white/10"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-[#E3E1CE]">{tAssets('editor.title')}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">{asset.attributes.name}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-white/30 bg-white/20 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-white/40 dark:border-white/10 dark:bg-slate-800/60 dark:text-slate-200"
          >
            {tAssets('editor.actions.cancel')}
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.9fr)_320px]">
          <div className="rounded-2xl border border-white/20 bg-white/20 p-3 backdrop-blur dark:border-white/10 dark:bg-slate-800/50">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
              {tAssets('editor.preview')}
            </p>
            <div className="space-y-3">
              <div
                ref={cropStageRef}
                className="relative flex min-h-[420px] items-center justify-center overflow-hidden rounded-xl border border-white/20 bg-slate-100/80 p-2 dark:border-white/10 dark:bg-slate-900/60"
              >
                {sourceUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element -- measured for cropping */}
                    <img
                      ref={cropImageRef}
                      src={sourceUrl}
                      alt={asset.attributes.name}
                      className="max-h-[410px] max-w-full select-none rounded border border-white/20 shadow"
                      onLoad={() => {
                        if (!cropStageRef.current || !cropImageRef.current) {
                          return
                        }
                        const stageRect = cropStageRef.current.getBoundingClientRect()
                        const imageRect = cropImageRef.current.getBoundingClientRect()
                        setImageDisplayRect({
                          left: imageRect.left - stageRect.left,
                          top: imageRect.top - stageRect.top,
                          width: imageRect.width,
                          height: imageRect.height
                        })
                      }}
                      draggable={false}
                    />

                    {displayCropRect && (
                      <div
                        className="absolute border-2 border-indigo-400 bg-indigo-400/10"
                        style={{
                          left: displayCropRect.left,
                          top: displayCropRect.top,
                          width: displayCropRect.width,
                          height: displayCropRect.height,
                          cursor: 'move'
                        }}
                        onPointerDown={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          beginCropInteraction({ mode: 'move' }, event.clientX, event.clientY)
                        }}
                      >
                        {(['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as ResizeHandle[]).map((handle) => (
                          <button
                            key={handle}
                            type="button"
                            className="absolute h-3 w-3 rounded-full border border-white bg-indigo-500 shadow"
                            style={{
                              ...HANDLE_STYLES[handle],
                              cursor: HANDLE_CURSORS[handle]
                            }}
                            onPointerDown={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              beginCropInteraction({ mode: 'resize', handle }, event.clientX, event.clientY)
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-300">{tAssets('editor.previewUnavailable')}</p>
                )}
              </div>

              <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-white/20 bg-slate-100/80 p-2 dark:border-white/10 dark:bg-slate-900/60">
                {sourceImage ? (
                  <canvas ref={canvasRef} className="max-h-full max-w-full rounded border border-white/20 shadow" />
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-300">{tAssets('editor.previewUnavailable')}</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-white/20 bg-white/20 p-3 backdrop-blur dark:border-white/10 dark:bg-slate-800/50">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                {tAssets('editor.output')}
              </p>
              <div className="space-y-2.5">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-200">
                  {tAssets('editor.fields.name')}
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/30 bg-white/75 px-2.5 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-100"
                  />
                </label>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-200">
                  {tAssets('editor.fields.description')}
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={1}
                    className="mt-1 w-full rounded-lg border border-white/30 bg-white/75 px-2.5 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-100"
                  />
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={copyTags}
                    onChange={(event) => setCopyTags(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-500"
                  />
                  {tAssets('editor.fields.copyTags')}
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-white/20 bg-white/20 p-3 backdrop-blur dark:border-white/10 dark:bg-slate-800/50">
              <div className="space-y-3">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                    {tAssets('editor.crop')}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs text-slate-700 dark:text-slate-200">
                      X
                      <input type="number" value={cropX} onChange={(event) => setCropX(Number(event.target.value || 0))} className="mt-1 w-full rounded-lg border border-white/30 bg-white/75 px-2 py-1.5 text-sm dark:border-white/10 dark:bg-slate-900/60" />
                    </label>
                    <label className="text-xs text-slate-700 dark:text-slate-200">
                      Y
                      <input type="number" value={cropY} onChange={(event) => setCropY(Number(event.target.value || 0))} className="mt-1 w-full rounded-lg border border-white/30 bg-white/75 px-2 py-1.5 text-sm dark:border-white/10 dark:bg-slate-900/60" />
                    </label>
                    <label className="text-xs text-slate-700 dark:text-slate-200">
                      {tAssets('editor.fields.width')}
                      <input
                        type="number"
                        value={cropWidth}
                        onChange={(event) => {
                          const next = Number(event.target.value || 1)
                          setCropWidth(next)
                          if (lockAspect) {
                            setCropHeight(clamp(Math.round(next / cropAspect), 1, sourceDimensions.height))
                          }
                        }}
                        className="mt-1 w-full rounded-lg border border-white/30 bg-white/75 px-2 py-1.5 text-sm dark:border-white/10 dark:bg-slate-900/60"
                      />
                    </label>
                    <label className="text-xs text-slate-700 dark:text-slate-200">
                      {tAssets('editor.fields.height')}
                      <input
                        type="number"
                        value={cropHeight}
                        onChange={(event) => {
                          const next = Number(event.target.value || 1)
                          setCropHeight(next)
                          if (lockAspect) {
                            setCropWidth(clamp(Math.round(next * cropAspect), 1, sourceDimensions.width))
                          }
                        }}
                        className="mt-1 w-full rounded-lg border border-white/30 bg-white/75 px-2 py-1.5 text-sm dark:border-white/10 dark:bg-slate-900/60"
                      />
                    </label>
                  </div>
                </div>

                <div className="border-t border-white/20 pt-3 dark:border-white/10">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                    {tAssets('editor.resize')}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs text-slate-700 dark:text-slate-200">
                      {tAssets('editor.fields.width')}
                      <input
                        type="number"
                        value={resizeWidth}
                        onChange={(event) => onResizeWidthChange(Number(event.target.value || 1))}
                        className="mt-1 w-full rounded-lg border border-white/30 bg-white/75 px-2 py-1.5 text-sm dark:border-white/10 dark:bg-slate-900/60"
                      />
                    </label>
                    <label className="text-xs text-slate-700 dark:text-slate-200">
                      {tAssets('editor.fields.height')}
                      <input
                        type="number"
                        value={resizeHeight}
                        onChange={(event) => onResizeHeightChange(Number(event.target.value || 1))}
                        className="mt-1 w-full rounded-lg border border-white/30 bg-white/75 px-2 py-1.5 text-sm dark:border-white/10 dark:bg-slate-900/60"
                      />
                    </label>
                  </div>

                  <div className="mt-2 space-y-2">
                    <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
                      <input
                        type="checkbox"
                        checked={autoSyncResizeToCrop}
                        onChange={(event) => setAutoSyncResizeToCrop(event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-500"
                      />
                      Auto-match resize to crop
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
                      <input
                        type="checkbox"
                        checked={lockAspect}
                        onChange={(event) => setLockAspect(event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-500"
                      />
                      {tAssets('editor.fields.lockAspectRatio')}
                    </label>
                    <label className="block text-xs text-slate-700 dark:text-slate-200">
                      {tAssets('editor.fields.resizeMode')}
                      <select
                        value={resizeMode}
                        onChange={(event) => setResizeMode(event.target.value as 'exact' | 'limit' | 'fill')}
                        className="mt-1 w-full rounded-lg border border-white/30 bg-white/75 px-2 py-1.5 text-sm dark:border-white/10 dark:bg-slate-900/60"
                      >
                        <option value="exact">{tAssets('editor.resizeModes.exact')}</option>
                        <option value="limit">{tAssets('editor.resizeModes.limit')}</option>
                        <option value="fill">{tAssets('editor.resizeModes.fill')}</option>
                      </select>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 border-t border-white/20 pt-3 dark:border-white/10">
                  <label className="text-xs text-slate-700 dark:text-slate-200">
                    {tAssets('editor.fields.degrees')}
                    <input
                      type="number"
                      step="0.1"
                      value={rotationDegrees}
                      onChange={(event) => setRotationDegrees(Number(event.target.value || 0))}
                      className="mt-1 w-full rounded-lg border border-white/30 bg-white/75 px-2 py-1.5 text-sm dark:border-white/10 dark:bg-slate-900/60"
                    />
                  </label>
                  <label className="text-xs text-slate-700 dark:text-slate-200">
                    {tAssets('editor.fields.outputFormat')}
                    <select
                      value={outputFormat}
                      onChange={(event) => setOutputFormat(event.target.value as 'keep' | 'jpg' | 'png' | 'webp')}
                      className="mt-1 w-full rounded-lg border border-white/30 bg-white/75 px-2 py-1.5 text-sm dark:border-white/10 dark:bg-slate-900/60"
                    >
                      <option value="keep">{tAssets('editor.formats.keep')}</option>
                      <option value="jpg">JPEG</option>
                      <option value="png">PNG</option>
                      <option value="webp">WebP</option>
                    </select>
                  </label>
                  <label className="text-xs text-slate-700 dark:text-slate-200 col-span-2">
                    {tAssets('editor.fields.quality')}
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={outputQuality}
                      onChange={(event) => setOutputQuality(clamp(Number(event.target.value || 90), 1, 100))}
                      className="mt-1 w-full rounded-lg border border-white/30 bg-white/75 px-2 py-1.5 text-sm dark:border-white/10 dark:bg-slate-900/60"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-white/30 bg-white/20 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-white/40 dark:border-white/10 dark:bg-slate-800/60 dark:text-slate-200"
            disabled={isSaving}
          >
            {tAssets('editor.actions.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving || !sourceUrl}
            className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? tAssets('editor.actions.saving') : tAssets('editor.actions.saveAsNew')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
