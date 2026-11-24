import axios from 'axios'

export const TOKEN_KEY = 'dcubby.auth_token'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Storage blocked (private mode); the session lasts for this page only.
  }
}

/**
 * The API client. The base URL is relative: Caddy (production) or the Next.js dev server
 * routes /api to Rails, so the browser only ever talks to one origin.
 */
export const api = axios.create({
  baseURL: '/api/v1',
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  // Let the browser set the multipart boundary.
  if (config.data instanceof FormData) delete config.headers['Content-Type']
  return config
})

// Pages that work signed out; a 401 there is shown to the user, not redirected.
const PUBLIC_PATHS = ['/login', '/setup', '/forgot-password', '/reset-password', '/accept-invite']

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const path = window.location.pathname
      if (!PUBLIC_PATHS.some((p) => path.startsWith(p))) {
        setToken(null)
        window.location.href = `/login?next=${encodeURIComponent(path + window.location.search)}`
      }
    }
    return Promise.reject(error)
  },
)

/** The API's error message, or a fallback. */
export function apiErrorMessage(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: { error?: string; message?: string; errors?: string[] } } })?.response?.data
  return data?.error || data?.message || data?.errors?.join(', ') || fallback
}
