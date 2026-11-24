'use client'

import { useThumbnailSize, ThumbnailSize } from '@/contexts/ThumbnailSizeContext'
import { useTranslations } from 'next-intl'
import { 
  Squares2X2Icon, 
  Squares2X2Icon as MediumIcon, 
  Squares2X2Icon as LargeIcon,
  Squares2X2Icon as FullIcon
} from '@heroicons/react/24/outline'

const sizeConfig = {
  small: {
    icon: Squares2X2Icon,
    labelKey: 'thumbnailSize.small',
    descriptionKey: 'thumbnailSize.smallDesc',
    // Mobile should default to 3-across; increase density at key breakpoints where "small" still felt too large.
    gridCols: 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 [@media(min-width:1920px)]:grid-cols-12',
    thumbnailSize: 'w-full aspect-[1.15]', // Fixed 1.15:1 aspect ratio
    gridGap: 'gap-3 sm:gap-4', // Responsive gap that adjusts instead of thumbnail width
    textSize: 'text-xs',
    titleSize: 'text-xs',
    infoSize: 'text-xs',
    tagSize: 'text-xs',
    padding: 'p-1',
    iconSize: 'h-8 w-8',
    fileIconSize: 'h-3 w-3',
    showMinimal: true // Only show thumbnail and filename
  },
  medium: {
    icon: MediumIcon,
    labelKey: 'thumbnailSize.medium',
    descriptionKey: 'thumbnailSize.mediumDesc',
    gridCols: 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 [@media(min-width:1920px)]:grid-cols-10',
    thumbnailSize: 'w-full aspect-[1.15]', // Fixed 1.15:1 aspect ratio
    gridGap: 'gap-4 sm:gap-6',
    textSize: 'text-sm',
    titleSize: 'text-sm',
    infoSize: 'text-xs',
    tagSize: 'text-xs',
    padding: 'p-2',
    iconSize: 'h-12 w-12',
    fileIconSize: 'h-4 w-4',
    showMinimal: true
  },
  large: {
    icon: LargeIcon,
    labelKey: 'thumbnailSize.large',
    descriptionKey: 'thumbnailSize.largeDesc',
    // Same column breakpoints as `full` (6 across at ≥1920px) for larger tiles; thumbnails still use cover crop vs full's contain (AssetGrid).
    gridCols: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 [@media(min-width:1920px)]:grid-cols-6',
    thumbnailSize: 'w-full aspect-[1.15]', // Fixed 1.15:1 aspect ratio
    gridGap: 'gap-4 sm:gap-6 lg:gap-8',
    textSize: 'text-base',
    titleSize: 'text-base',
    infoSize: 'text-sm',
    tagSize: 'text-sm',
    padding: 'p-3',
    iconSize: 'h-16 w-16',
    fileIconSize: 'h-4 w-4',
    showMinimal: false
  },
  full: {
    icon: FullIcon,
    labelKey: 'thumbnailSize.full',
    descriptionKey: 'thumbnailSize.fullDesc',
    gridCols: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 [@media(min-width:1920px)]:grid-cols-6',
    thumbnailSize: 'w-full aspect-[1.15]', // Fixed 1.15:1 aspect ratio
    gridGap: 'gap-4 sm:gap-6 lg:gap-8',
    textSize: 'text-base',
    titleSize: 'text-base',
    infoSize: 'text-sm',
    tagSize: 'text-sm',
    padding: 'p-3',
    iconSize: 'h-16 w-16',
    fileIconSize: 'h-4 w-4',
    showMinimal: false
  }
}

export default function ThumbnailSizeSelector() {
  const { thumbnailSize, setThumbnailSize } = useThumbnailSize()
  const t = useTranslations('assets')

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
        {t('thumbnailSize.label')}
      </span>
      <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
        {Object.entries(sizeConfig).map(([size, config]) => {
          const Icon = config.icon
          const isActive = thumbnailSize === size
          const label = t(config.labelKey)
          const description = t(config.descriptionKey)
          
          return (
            <button
              key={size}
              onClick={() => setThumbnailSize(size as ThumbnailSize)}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
              title={`${label} - ${description}`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Export the size configuration for use in other components
export { sizeConfig }
