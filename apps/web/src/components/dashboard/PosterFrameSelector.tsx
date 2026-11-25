'use client'

import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslations } from 'next-intl'

import { api, apiErrorMessage } from '@/lib/api'
import { API_ENDPOINTS } from '@/lib/config'
import type { Asset } from '@/lib/dam/types'
import toast from '@/lib/toast'

import { withStreamToken } from './assetUtils'

interface PosterFrameSelectorProps {
  asset: Asset
  onClose: () => void
  /** Called with the API response after the poster frame is generated. */
  onGenerated: (payload: unknown) => void
}

/** Pick a frame of a video to use as its poster image and thumbnail. */
export default function PosterFrameSelector({ asset, onClose, onGenerated }: PosterFrameSelectorProps) {
  const tAssets = useTranslations('assets')
  const tCommon = useTranslations('common')
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [timestamp, setTimestamp] = useState(0)
  const [isVideoReady, setIsVideoReady] = useState(false)
  const [generating, setGenerating] = useState(false)
  const attrs = asset.attributes

  const generate = async () => {
    const video = videoRef.current
    if (!video || generating) return
    video.pause()
    const at = video.currentTime >= 0 ? video.currentTime : 0
    setTimestamp(at)
    setGenerating(true)
    try {
      const response = await api.post(API_ENDPOINTS.ASSETS.POSTER_FRAME(asset.id), { timestamp: at })
      toast.success(tAssets('posterFrame.generatedAt', { seconds: at.toFixed(1) }))
      onGenerated(response.data)
    } catch (error) {
      toast.error(apiErrorMessage(error, tAssets('posterFrame.generateFailed')))
    } finally {
      setGenerating(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-modal flex items-center justify-center bg-backdrop px-4" onClick={onClose}>
      <div
        className="rounded-card border bg-surface max-h-[90vh] w-full max-w-4xl overflow-y-auto border border-line px-6 py-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={tAssets('posterFrame.title')}
      >
        <div className="mb-4 flex items-start justify-between">
          <h3 className="text-lg font-semibold text-fg">{tAssets('posterFrame.title')}</h3>
          <button
            onClick={onClose}
            className="rounded-full border border-line bg-surface px-3 py-1 text-lg text-subtle transition-colors hover:border-line-strong hover:text-fg"
            title={tCommon('close')}
            aria-label={tCommon('close')}
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
            <div className="absolute inset-0 overflow-hidden rounded-card border border-line bg-surface">
              <video
                ref={videoRef}
                controls
                preload="metadata"
                className="absolute inset-0 h-full w-full object-contain"
                src={withStreamToken(attrs.file_url || attrs.download_url)}
                onLoadedMetadata={() => {
                  if (videoRef.current) videoRef.current.currentTime = 0
                  setTimestamp(0)
                }}
                onCanPlay={() => setIsVideoReady(true)}
                onSeeked={() => videoRef.current && setTimestamp(videoRef.current.currentTime)}
                onPause={() => videoRef.current && setTimestamp(videoRef.current.currentTime)}
                onError={(e) => {
                  const video = e.currentTarget
                  const stream = withStreamToken(attrs.download_url)
                  if (stream && !video.dataset.fallback) {
                    video.dataset.fallback = 'true'
                    video.src = stream
                    video.load()
                  } else {
                    toast.error(tAssets('viewer.videoLoadFailed'))
                  }
                }}
              >
                {tAssets('viewer.videoNotSupported')}
              </video>
            </div>
          </div>

          <div className="rounded-card border border-accent bg-accent-subtle p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="mb-1 text-sm font-semibold text-fg">
                  {tAssets('posterFrame.selectedFrame', { seconds: timestamp.toFixed(2) })}
                </p>
                <p className="text-xs text-muted">
                  {tAssets('posterFrame.instructions', { action: tAssets('posterFrame.useCurrentFrame') })}
                </p>
              </div>
              <button
                onClick={generate}
                disabled={generating || !isVideoReady}
                className="ml-4 whitespace-nowrap rounded-control bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-transform disabled:cursor-not-allowed disabled:opacity-50"
              >
                {generating ? tAssets('posterFrame.generating') : tAssets('posterFrame.useCurrentFrame')}
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={onClose}
              className="rounded-control border border-line bg-surface px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-line-strong hover:bg-hover"
            >
              {tCommon('close')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
