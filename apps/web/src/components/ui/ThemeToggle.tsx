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
      ? 'relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#B8C5D1] bg-[#D8DFE6] transition-colors duration-200 hover:bg-[#ccd7e0] dark:border-[#263541] dark:bg-[#121F27] dark:hover:bg-[#1a2832]'
      : 'relative p-2 rounded-lg bg-gray-100 transition-colors duration-200 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={buttonClassName}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <div className="relative h-5 w-5">
        <SunIcon 
          className={`absolute inset-0 w-5 h-5 text-yellow-500 transition-all duration-300 ${
            theme === 'light' 
              ? 'opacity-100 rotate-0 scale-100' 
              : 'opacity-0 rotate-90 scale-75'
          }`}
        />
        <MoonIcon 
          className={`absolute inset-0 w-5 h-5 text-blue-400 transition-all duration-300 ${
            theme === 'dark' 
              ? 'opacity-100 rotate-0 scale-100' 
              : 'opacity-0 -rotate-90 scale-75'
          }`}
        />
      </div>
    </button>
  )
}
