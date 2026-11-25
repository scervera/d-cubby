'use client'

import { MoonIcon, SunIcon } from '@heroicons/react/24/outline'

import { useTheme } from '@/contexts/ThemeContext'

import { IconButton } from './Button'

/** Switches between the light and dark theme; shows the theme it switches to. */
export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const Icon = theme === 'light' ? MoonIcon : SunIcon
  return (
    <IconButton onClick={toggleTheme} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
      <Icon className="h-5 w-5" aria-hidden />
    </IconButton>
  )
}
