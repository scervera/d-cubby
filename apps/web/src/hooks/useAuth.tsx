'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { api, getToken, setToken } from '@/lib/api'
import { API_ENDPOINTS } from '@/lib/config'
import { LOCALE_COOKIE } from '@/i18n/config'
import { setCookie } from '@/lib/cookies'

export type Role = 'owner' | 'admin' | 'editor' | 'viewer'

/** The signed-in user, as returned by /api/v1/users/me (UserPresenter on the API). */
export interface User {
  id: number
  name: string
  email: string
  role: Role
  locale: string | null
  password_change_required: boolean
  permissions: {
    admin: boolean
    owner: boolean
    write: boolean
    assignable_roles: Role[]
  }
}

interface AuthContextValue {
  user: User | null
  loading: boolean
  /** Store a token from login, setup, password reset or invitation, and load the user. */
  signIn: (token: string, user?: User) => Promise<User | null>
  login: (email: string, password: string) => Promise<User>
  logout: () => Promise<void>
  refresh: () => Promise<User | null>
  setUser: (user: User) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function applyLocale(user: User | null) {
  if (user?.locale) setCookie(LOCALE_COOKIE, user.locale)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const setUser = useCallback((next: User) => {
    setUserState(next)
    applyLocale(next)
  }, [])

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUserState(null)
      return null
    }
    try {
      const { data } = await api.get(API_ENDPOINTS.USERS.ME)
      setUser(data.user)
      return data.user as User
    } catch {
      setToken(null)
      setUserState(null)
      return null
    }
  }, [setUser])

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [refresh])

  const signIn = useCallback(
    async (token: string, signedInUser?: User) => {
      setToken(token)
      if (signedInUser) {
        setUser(signedInUser)
        return signedInUser
      }
      return refresh()
    },
    [refresh, setUser],
  )

  const login = useCallback(
    async (email: string, password: string) => {
      const { data } = await api.post(API_ENDPOINTS.AUTH.LOGIN, { email, password })
      await signIn(data.token, data.user)
      return data.user as User
    },
    [signIn],
  )

  const logout = useCallback(async () => {
    try {
      await api.delete(API_ENDPOINTS.AUTH.LOGOUT)
    } catch {
      // The token is dropped locally either way.
    }
    setToken(null)
    setUserState(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, signIn, login, logout, refresh, setUser }),
    [user, loading, signIn, login, logout, refresh, setUser],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
