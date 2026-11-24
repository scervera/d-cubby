export const locales = ['en', 'es', 'pt', 'ht', 'fr', 'de'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'en'

/** Cookie holding the viewer's chosen language (read by src/i18n/request.ts on the server). */
export const LOCALE_COOKIE = 'NEXT_LOCALE'

export const localeNames: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  pt: 'Português',
  ht: 'Kreyòl ayisyen',
  fr: 'Français',
  de: 'Deutsch',
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (locales as readonly string[]).includes(value)
}

/**
 * Message namespaces, one JSON file each in messages/<locale>/. Every file must exist in
 * messages/en; other locales may omit files or keys and fall back to English.
 */
export const namespaces = [
  'common',
  'nav',
  'auth',
  'setup',
  'settings',
  'dashboard',
  'assets',
  'recycleBin',
  'smartFolders',
  'dropZones',
  'groups',
  'tags',
] as const
