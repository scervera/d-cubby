interface AudioThumbnailProps {
  className?: string
  size?: 'small' | 'medium' | 'large' | 'xlarge'
}

const WAVEFORM_SIZES = {
  small: { barWidth: 1, barHeight: 12, gap: 1 },
  medium: { barWidth: 2, barHeight: 24, gap: 2 },
  large: { barWidth: 3, barHeight: 40, gap: 3 },
  xlarge: { barWidth: 4, barHeight: 64, gap: 4 },
}

// Bar heights as a fraction of the tallest bar.
const WAVEFORM = [0.3, 0.6, 0.9, 0.7, 0.4, 0.8, 1.0, 0.5, 0.7, 0.9, 0.6, 0.4, 0.8, 0.7, 0.5]

/** Stand-in thumbnail for audio files: a neutral waveform. */
export default function AudioThumbnail({ className = '', size = 'medium' }: AudioThumbnailProps) {
  const config = WAVEFORM_SIZES[size]
  return (
    <div className={`flex h-full w-full items-center justify-center bg-sunken ${className}`}>
      <div className="flex items-center justify-center" style={{ gap: `${config.gap}px` }}>
        {WAVEFORM.map((height, index) => (
          <div
            key={index}
            className="rounded-full bg-subtle"
            style={{ width: `${config.barWidth}px`, height: `${config.barHeight * height}px`, minHeight: `${config.barWidth}px` }}
          />
        ))}
      </div>
    </div>
  )
}
