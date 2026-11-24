'use client'

import type { ReactNode } from 'react'

import { AppToaster } from '@/components/ui/AppToaster'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { AppConfigProvider } from '@/hooks/useAppConfig'
import { AuthProvider } from '@/hooks/useAuth'

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AppConfigProvider>
        <AuthProvider>
          {children}
          <AppToaster />
        </AuthProvider>
      </AppConfigProvider>
    </ThemeProvider>
  )
}
