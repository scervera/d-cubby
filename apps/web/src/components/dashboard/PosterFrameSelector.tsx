'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
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

  return (
    <Modal
      title={tAssets('posterFrame.title')}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {tCommon('close')}
          </Button>
          <Button onClick={generate} loading={generating} disabled={!isVideoReady}>
            {generating ? tAssets('posterFrame.generating') : tAssets('posterFrame.useCurrentFrame')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="aspect-video w-full overflow-hidden rounded-card border bg-sunken">
          <video
            ref={videoRef}
            controls
            preload="metadata"
            className="h-full w-full object-contain"
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

        <div>
          <p className="font-mono text-sm tabular-nums text-fg">
            {tAssets('posterFrame.selectedFrame', { seconds: timestamp.toFixed(2) })}
          </p>
          <p className="mt-1 text-xs text-subtle">
            {tAssets('posterFrame.instructions', { action: tAssets('posterFrame.useCurrentFrame') })}
          </p>
        </div>
      </div>
    </Modal>
  )
}
