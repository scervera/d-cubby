'use client'

import { useTheme } from '@/contexts/ThemeContext'
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline'

export type ThemeToggleVariant = 'compact' | 'toolbar'

type ThemeToggleProps = {
  /** `toolbar`: fixed h-10 to align with navbar pills. `compact`: legacy smaller control for sidebar/mobile panels. */
  variant?: ThemeToggleVariant
}

export default function ThemeToggle({ variant = 'compact' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme()

  const buttonClassName =
    variant === 'toolbar'
      ? 'relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-control border border-line bg-raised transition-colors duration-200 hover:bg-hover'
      : 'relative p-2 rounded-control bg-sunken transition-colors duration-200 hover:bg-hover'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={buttonClassName}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <div className="relative h-5 w-5">
        <SunIcon 
          className={`absolute inset-0 w-5 h-5 text-warning-text transition-all duration-300 ${
            theme === 'light' 
              ? 'opacity-100 rotate-0 scale-100' 
              : 'opacity-0 rotate-90 scale-75'
          }`}
        />
        <MoonIcon 
          className={`absolute inset-0 w-5 h-5 text-accent-text transition-all duration-300 ${
            theme === 'dark' 
              ? 'opacity-100 rotate-0 scale-100' 
              : 'opacity-0 -rotate-90 scale-75'
          }`}
        />
      </div>
    </button>
  )
}
