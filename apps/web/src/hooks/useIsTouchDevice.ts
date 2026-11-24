import { useState, useEffect } from 'react'

/**
 * Hook to detect if the current device is a touch device (mobile/tablet)
 * Uses modern pointer media query with fallback to touch event detection
 */
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false)

  useEffect(() => {
    // SSR safety check
    if (typeof window === 'undefined') {
      return
    }

    // Modern approach: pointer media query (most reliable)
    // 'pointer: coarse' indicates touch input (finger/stylus)
    const mediaQuery = window.matchMedia('(pointer: coarse)')
    
    if (mediaQuery.matches) {
      setIsTouch(true)
      return
    }

    // Fallback: check for touch support
    // Some devices may not match the media query but still support touch
    const hasTouchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    setIsTouch(hasTouchSupport)
  }, [])

  return isTouch
}

