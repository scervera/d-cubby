'use client'

import { useTranslations } from 'next-intl'

import { useThumbnailSize, type ThumbnailSize } from '@/contexts/ThumbnailSizeContext'

import SegmentedControl from './SegmentedControl'

/**
 * Grid density per thumbnail size. `detail` is how much is written under a tile: the name,
 * the name and one line of metadata, or everything including tags.
 */
export const sizeConfig: Record<
  ThumbnailSize,
  { gridCols: string; gridGap: string; aspect: string; iconSize: string; detail: 'name' | 'meta' | 'full' }
> = {
  small: {
    gridCols:
      'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 [@media(min-width:1920px)]:grid-cols-12',
    gridGap: 'gap-x-2 gap-y-3',
    aspect: 'aspect-square',
    iconSize: 'h-6 w-6',
    detail: 'name',
  },
  medium: {
    gridCols: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 [@media(min-width:1920px)]:grid-cols-8',
    gridGap: 'gap-x-3 gap-y-4',
    aspect: 'aspect-square',
    iconSize: 'h-8 w-8',
    detail: 'meta',
  },
  large: {
    gridCols: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 [@media(min-width:1920px)]:grid-cols-6',
    gridGap: 'gap-x-4 gap-y-5',
    aspect: 'aspect-[4/3]',
    iconSize: 'h-10 w-10',
    detail: 'full',
  },
  // Same grid as large, but the whole image is shown (contain) instead of cropped (cover).
  full: {
    gridCols: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 [@media(min-width:1920px)]:grid-cols-6',
    gridGap: 'gap-x-4 gap-y-5',
    aspect: 'aspect-[4/3]',
    iconSize: 'h-10 w-10',
    detail: 'full',
  },
}

const SIZES: ThumbnailSize[] = ['small', 'medium', 'large', 'full']

export default function ThumbnailSizeSelector() {
  const { thumbnailSize, setThumbnailSize } = useThumbnailSize()
  const t = useTranslations('assets')

  return (
    <SegmentedControl
      label={t('thumbnailSize.label')}
      value={thumbnailSize}
      onChange={setThumbnailSize}
      segments={SIZES.map((size) => ({
        value: size,
        label: t(`thumbnailSize.${size}`),
        title: `${t(`thumbnailSize.${size}`)} - ${t(`thumbnailSize.${size}Desc`)}`,
      }))}
    />
  )
}
