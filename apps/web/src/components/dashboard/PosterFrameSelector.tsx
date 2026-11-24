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
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-900/60 px-4 backdrop-blur" onClick={onClose}>
      <div
        className="glass-panel max-h-[90vh] w-full max-w-4xl overflow-y-auto border border-white/25 px-6 py-6 dark:border-white/10"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={tAssets('posterFrame.title')}
      >
        <div className="mb-4 flex items-start justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-[#E3E1CE]">{tAssets('posterFrame.title')}</h3>
          <button
            onClick={onClose}
            className="rounded-full border border-white/30 bg-white/20 px-3 py-1 text-lg text-slate-500 transition-colors hover:border-white/60 hover:text-slate-800 dark:border-white/10 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:border-white/30"
            title={tCommon('close')}
            aria-label={tCommon('close')}
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
            <div className="absolute inset-0 overflow-hidden rounded-2xl border border-white/20 bg-white/20 backdrop-blur dark:border-white/10 dark:bg-slate-800/50">
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

          <div className="rounded-2xl border border-purple-200/60 bg-purple-500/10 p-4 backdrop-blur-sm dark:border-purple-500/30 dark:bg-purple-500/15">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="mb-1 text-sm font-semibold text-slate-900 dark:text-[#E3E1CE]">
                  {tAssets('posterFrame.selectedFrame', { seconds: timestamp.toFixed(2) })}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {tAssets('posterFrame.instructions', { action: tAssets('posterFrame.useCurrentFrame') })}
                </p>
              </div>
              <button
                onClick={generate}
                disabled={generating || !isVideoReady}
                className="ml-4 whitespace-nowrap rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {generating ? tAssets('posterFrame.generating') : tAssets('posterFrame.useCurrentFrame')}
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={onClose}
              className="rounded-xl border border-white/30 bg-white/25 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-white/60 hover:bg-white/40 dark:border-white/10 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:border-white/30"
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
