import { cookies } from 'next/headers'
import { getRequestConfig } from 'next-intl/server'

import { defaultLocale, isLocale, LOCALE_COOKIE, namespaces, type Locale } from './config'

type Messages = Record<string, unknown>

function deepMerge(base: Messages, override: Messages): Messages {
  const out: Messages = { ...base }
  for (const [key, value] of Object.entries(override)) {
    const existing = out[key]
    out[key] =
      value && typeof value === 'object' && !Array.isArray(value) && existing && typeof existing === 'object'
        ? deepMerge(existing as Messages, value as Messages)
        : value
  }
  return out
}

async function loadNamespace(locale: Locale, ns: string): Promise<Messages> {
  try {
    return (await import(`../../messages/${locale}/${ns}.json`)).default as Messages
  } catch {
    return {}
  }
}

async function loadMessages(locale: Locale): Promise<Messages> {
  const entries = await Promise.all(
    namespaces.map(async (ns) => {
      const en = await loadNamespace('en', ns)
      const localized = locale === 'en' ? {} : await loadNamespace(locale, ns)
      return [ns, deepMerge(en, localized)] as const
    }),
  )
  return Object.fromEntries(entries)
}

/** The organization's default language, from the API (cached briefly). */
async function organizationLocale(): Promise<Locale | null> {
  const api = process.env.API_INTERNAL_URL
  if (!api) return null
  try {
    const res = await fetch(`${api}/api/v1/config`, { next: { revalidate: 60 } })
    if (!res.ok) return null
    const locale = (await res.json())?.organization?.default_locale
    return isLocale(locale) ? locale : null
  } catch {
    return null
  }
}

// Language: the viewer's cookie, else the organization's default, else English.
export default getRequestConfig(async () => {
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value
  const locale: Locale = isLocale(cookieLocale) ? cookieLocale : ((await organizationLocale()) ?? defaultLocale)
  return { locale, messages: await loadMessages(locale) }
})
