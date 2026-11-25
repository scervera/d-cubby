import type { Metadata } from 'next'
import localFont from 'next/font/local'
import Script from 'next/script'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import type { ReactNode } from 'react'

import AppProviders from '@/components/app/AppProviders'

import './globals.css'

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var theme = localStorage.getItem('theme');
    if (theme !== 'light' && theme !== 'dark') {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.classList.add(theme);
  } catch (e) {}
})();
`

const geistSans = localFont({
  src: '../fonts/geist-variable.woff2',
  weight: '100 900',
  variable: '--font-geist-sans',
  display: 'swap',
})

const geistMono = localFont({
  src: '../fonts/geist-mono-variable.woff2',
  weight: '100 900',
  variable: '--font-geist-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'D-cubby',
  description: 'Your organization’s digital asset library.',
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale} suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen antialiased">
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AppProviders>{children}</AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
