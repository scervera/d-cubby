'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

import { api } from '@/lib/api'
import { API_ENDPOINTS } from '@/lib/config'

/** GET /api/v1/config. Feature flags are present only when signed in. */
export interface AppConfig {
  app_version: string
  setup_needed: boolean
  organization: { name: string; default_locale: string; logo_url: string | null } | null
  password_reset_by_email: boolean
  max_file_size_gb?: number | null
  ai_tagging_enabled?: boolean
  ai_provider?: string | null
  face_detection_enabled?: boolean
  smtp_enabled?: boolean
}

interface ConfigContextValue {
  config: AppConfig | null
  loading: boolean
  reload: () => Promise<AppConfig | null>
}

const ConfigContext = createContext<ConfigContextValue | undefined>(undefined)

export function AppConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    try {
      const { data } = await api.get<AppConfig>(API_ENDPOINTS.CONFIG)
      setConfig(data)
      return data
    } catch {
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return <ConfigContext.Provider value={{ config, loading, reload }}>{children}</ConfigContext.Provider>
}

export function useAppConfig() {
  const ctx = useContext(ConfigContext)
  if (!ctx) throw new Error('useAppConfig must be used within AppConfigProvider')
  return ctx
}
