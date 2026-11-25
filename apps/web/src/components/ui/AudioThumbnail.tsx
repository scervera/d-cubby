import React from 'react';

interface AudioThumbnailProps {
  className?: string;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
}

const AudioThumbnail: React.FC<AudioThumbnailProps> = ({ className = '', size = 'medium' }) => {
  const waveformSizes = {
    small: { barWidth: 1, barHeight: 12, gap: 1 },
    medium: { barWidth: 2, barHeight: 24, gap: 2 },
    large: { barWidth: 3, barHeight: 40, gap: 3 },
    xlarge: { barWidth: 4, barHeight: 64, gap: 4 }
  };

  const config = waveformSizes[size];
  
  // Waveform pattern - heights for each bar (percentage of max height)
  const waveformPattern = [0.3, 0.6, 0.9, 0.7, 0.4, 0.8, 1.0, 0.5, 0.7, 0.9, 0.6, 0.4, 0.8, 0.7, 0.5];

  return (
    <div className={`relative w-full h-full flex items-center justify-center bg-accent ${className}`}>
      {/* Waveform visualization */}
      <div className="flex items-center justify-center gap-px" style={{ gap: `${config.gap}px` }}>
        {waveformPattern.map((height, index) => (
          <div
            key={index}
            className="bg-surface bg-opacity-90 rounded-full"
            style={{
              width: `${config.barWidth}px`,
              height: `${config.barHeight * height}px`,
              minHeight: `${config.barWidth}px`
            }}
          />
        ))}
      </div>
      
      {/* Optional: Add a subtle overlay pattern for texture */}
      <div className="absolute inset-0 bg-accent pointer-events-none" />
    </div>
  );
};

export default AudioThumbnail;

