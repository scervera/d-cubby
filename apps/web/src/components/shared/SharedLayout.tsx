'use client'

import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'

import AppHeader from '@/components/layout/AppHeader'
import SharedSidebar, { type SidebarPage } from './SharedSidebar'

interface SharedLayoutProps {
  children: ReactNode
  currentPage?: SidebarPage
  /** On the assets page: the selected category ("all", "image", ..., or "smart_folder_<id>"). */
  selectedCategory?: string
  onCategoryChange?: (category: string) => void
  showAssetCategories?: boolean
}

/**
 * App shell for signed-in pages: fixed header, sidebar (fixed on desktop; a drawer on
 * mobile, opened from the header button or a swipe from the left edge) and content.
 */
export default function SharedLayout({
  children,
  currentPage = 'assets',
  selectedCategory,
  onCategoryChange,
  showAssetCategories = true,
}: SharedLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const toggle = () => setSidebarOpen((open) => !open)
    const close = () => setSidebarOpen(false)
    window.addEventListener('toggleSidebar', toggle)
    window.addEventListener('closeSidebar', close)
    return () => {
      window.removeEventListener('toggleSidebar', toggle)
      window.removeEventListener('closeSidebar', close)
    }
  }, [])

  useEffect(() => setSidebarOpen(false), [currentPage, selectedCategory, pathname])

  // Swipe from the left edge to open, swipe left to close (mobile).
  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
    const onMove = (e: TouchEvent) => {
      const start = touchStart.current
      if (!start) return
      const dx = e.touches[0].clientX - start.x
      const dy = e.touches[0].clientY - start.y
      if (Math.abs(dx) <= Math.abs(dy) || Math.abs(dx) < 30) return
      if (start.x < 20 && dx > 50 && !sidebarOpen) {
        setSidebarOpen(true)
        touchStart.current = null
      } else if (sidebarOpen && dx < -50) {
        setSidebarOpen(false)
        touchStart.current = null
      }
    }
    const onEnd = () => {
      touchStart.current = null
    }
    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchmove', onMove, { passive: true })
    document.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
    }
  }, [sidebarOpen])

  return (
    <>
      <AppHeader />
      {sidebarOpen && <div className="fixed inset-0 top-14 z-drawer bg-backdrop lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside
        id="sidebar"
        className={`fixed top-14 bottom-0 left-0 z-drawer w-64 overflow-y-auto border-r bg-surface p-3 transition-transform duration-200 ease-out lg:z-auto lg:w-60 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Suspense fallback={null}>
          <SharedSidebar
            currentPage={currentPage}
            selectedCategory={selectedCategory}
            onCategoryChange={onCategoryChange}
            showAssetCategories={showAssetCategories}
          />
        </Suspense>
      </aside>

      <main className="min-w-0 px-4 pt-20 pb-16 sm:px-6 lg:pr-8 lg:pl-[17rem]">
        <div className="mx-auto max-w-[1600px] space-y-5">{children}</div>
      </main>
    </>
  )
}
