'use client'

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react'

export type ThumbnailSize = 'small' | 'medium' | 'large' | 'full'

interface ThumbnailSizeContextType {
  thumbnailSize: ThumbnailSize
  setThumbnailSize: (size: ThumbnailSize) => void
}

const ThumbnailSizeContext = createContext<ThumbnailSizeContextType | undefined>(undefined)

export const ThumbnailSizeProvider = ({ children }: { children: ReactNode }) => {
  const [thumbnailSize, setThumbnailSizeState] = useState<ThumbnailSize>('medium')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Check localStorage for thumbnail size preference
    const storedSize = localStorage.getItem('thumbnailSize') as ThumbnailSize | null
    if (storedSize && ['small', 'medium', 'large', 'full'].includes(storedSize)) {
      setThumbnailSizeState(storedSize)
    } else {
      // Set responsive default based on screen size
      const getDefaultSize = (): ThumbnailSize => {
        if (typeof window !== 'undefined') {
          const width = window.innerWidth
          // Mobile and tablet (up to 1024px) get 'small' default
          if (width < 1024) {
            return 'small'
          }
          // Desktop (1024px and above) get 'medium' default
          return 'medium'
        }
        // Server-side default
        return 'medium'
      }
      
      const defaultSize = getDefaultSize()
      setThumbnailSizeState(defaultSize)
    }
    setMounted(true)
  }, [])

  // Handle window resize to update default size if no preference is stored
  useEffect(() => {
    const handleResize = () => {
      const storedSize = localStorage.getItem('thumbnailSize') as ThumbnailSize | null
      // Only auto-adjust if user hasn't set a preference
      if (!storedSize || !['small', 'medium', 'large', 'full'].includes(storedSize)) {
        const width = window.innerWidth
        const newDefaultSize: ThumbnailSize = width < 1024 ? 'small' : 'medium'
        setThumbnailSizeState(newDefaultSize)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const setThumbnailSize = (size: ThumbnailSize) => {
    setThumbnailSizeState(size)
    localStorage.setItem('thumbnailSize', size)
  }

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return null
  }

  return (
    <ThumbnailSizeContext.Provider value={{ thumbnailSize, setThumbnailSize }}>
      {children}
    </ThumbnailSizeContext.Provider>
  )
}

const FALLBACK: ThumbnailSizeContextType = { thumbnailSize: 'medium', setThumbnailSize: () => {} }

/** The chosen thumbnail size. Outside a ThumbnailSizeProvider: fixed "medium". */
export const useThumbnailSize = () => useContext(ThumbnailSizeContext) ?? FALLBACK
