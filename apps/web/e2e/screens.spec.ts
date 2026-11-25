import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import AxeBuilder from '@axe-core/playwright'
import { test, type Page } from '@playwright/test'

/**
 * Photographs every screen. Output: screenshots/<label>/<theme>-<width>/<name>.png, plus
 * contrast.json listing any text that fails WCAG AA contrast on that screen.
 *
 *   SHOTS_LABEL   folder name for this run (default "current"), e.g. "before"
 *   SHOTS_ONLY    only screens whose name contains this text
 */

const LABEL = process.env.SHOTS_LABEL || 'current'
const ONLY = process.env.SHOTS_ONLY || ''
const OUT = path.join(__dirname, '..', 'screenshots', LABEL)

const THEMES = ['dark', 'light'] as const
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'phone', width: 390, height: 844 },
] as const

interface Screen {
  name: string
  path: string
  /** Signed-out screens are loaded without a token. */
  signedOut?: boolean
  /** Brings the screen into the state to photograph. Failures are reported, not fatal. */
  prepare?: (page: Page, viewport: (typeof VIEWPORTS)[number]) => Promise<void>
  desktopOnly?: boolean
  phoneOnly?: boolean
}

const firstTile = (page: Page) => page.locator('.asset-thumbnail').first()

const openAsset = async (page: Page) => {
  await firstTile(page).dblclick()
  await page.getByRole('dialog').first().waitFor()
}

const SCREENS: Screen[] = [
  { name: 'login', path: '/login', signedOut: true },
  { name: 'forgot-password', path: '/forgot-password', signedOut: true },
  { name: 'reset-password', path: '/reset-password?token=example', signedOut: true },
  { name: 'accept-invite', path: '/accept-invite?token=example', signedOut: true },
  { name: 'setup', path: '/setup', signedOut: true },
  { name: 'library', path: '/assets' },
  {
    name: 'library-list',
    path: '/assets',
    prepare: async (page) => {
      await page.getByRole('button', { name: /list/i }).first().click()
    },
  },
  {
    name: 'library-asset-menu',
    path: '/assets',
    prepare: async (page) => {
      await firstTile(page).hover()
      await page.getByRole('button', { name: /actions|menu|options/i }).first().click()
    },
  },
  {
    name: 'library-bulk-delete',
    path: '/assets',
    prepare: async (page) => {
      await page.getByRole('button', { name: /delete/i }).first().click()
      await firstTile(page).click()
    },
  },
  { name: 'asset-detail', path: '/assets', prepare: openAsset },
  {
    name: 'asset-viewer',
    path: '/assets',
    desktopOnly: true,
    prepare: async (page) => {
      await openAsset(page)
      await page.keyboard.press('f')
    },
  },
  {
    name: 'asset-editor',
    path: '/assets',
    prepare: async (page) => {
      await openAsset(page)
      await page.getByRole('button', { name: /edit image/i }).first().click()
    },
  },
  {
    name: 'asset-delete-confirm',
    path: '/assets',
    prepare: async (page) => {
      await openAsset(page)
      await page.getByRole('dialog').getByRole('button', { name: /delete/i }).first().click()
      await page.getByRole('alertdialog').waitFor()
    },
  },
  {
    name: 'upload',
    path: '/assets',
    prepare: async (page) => {
      await page.getByRole('button', { name: /upload/i }).first().click()
    },
  },
  {
    name: 'drawer',
    path: '/assets',
    phoneOnly: true,
    prepare: async (page) => {
      await page.getByRole('button', { name: /menu/i }).first().click()
    },
  },
  { name: 'recycle-bin', path: '/assets/recycle-bin' },
  { name: 'smart-folders', path: '/smart-folders' },
  {
    name: 'smart-folder-form',
    path: '/smart-folders',
    prepare: async (page) => {
      await page.getByRole('button', { name: /new|create/i }).first().click()
    },
  },
  { name: 'tags', path: '/tags' },
  { name: 'groups', path: '/groups' },
  {
    name: 'group-form',
    path: '/groups',
    prepare: async (page) => {
      await page.getByRole('button', { name: /new|create/i }).first().click()
    },
  },
  { name: 'drop-zones', path: '/drop-zones' },
  {
    name: 'drop-zone-form',
    path: '/drop-zones',
    prepare: async (page) => {
      await page.getByRole('button', { name: /new|create/i }).first().click()
    },
  },
  { name: 'drop-zone', path: `/drop-zones/${process.env.SHOTS_DROP_ZONE_ID || '1'}` },
  { name: 'account', path: '/account' },
  { name: 'settings', path: '/settings' },
  { name: 'settings-users', path: '/settings/users' },
  { name: 'settings-organization', path: '/settings/organization' },
  { name: 'settings-system', path: '/settings/system' },
  { name: 'watched-folders', path: '/settings/watched-folders' },
  {
    name: 'watched-folder-form',
    path: '/settings/watched-folders',
    prepare: async (page) => {
      await page.getByRole('button', { name: /add|new|create/i }).first().click()
    },
  },
]

async function settle(page: Page) {
  await page.waitForLoadState('networkidle').catch(() => {})
  await page
    .waitForFunction(() => document.querySelectorAll('.animate-spin').length === 0, undefined, { timeout: 8000 })
    .catch(() => {})
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(250)
}

for (const theme of THEMES) {
  for (const viewport of VIEWPORTS) {
    const group = `${theme}-${viewport.name}`

    test(group, async ({ browser }) => {
      const dir = path.join(OUT, group)
      mkdirSync(dir, { recursive: true })
      const contrast: Record<string, { text: string; summary: string }[]> = {}
      const problems: string[] = []

      for (const screen of SCREENS) {
        if (ONLY && !screen.name.includes(ONLY)) continue
        if (screen.desktopOnly && viewport.name !== 'desktop') continue
        if (screen.phoneOnly && viewport.name !== 'phone') continue

        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height },
          hasTouch: viewport.name === 'phone',
          isMobile: viewport.name === 'phone',
          reducedMotion: 'reduce',
        })
        await context.addInitScript(
          ([themeName, token]) => {
            localStorage.setItem('theme', themeName as string)
            if (token) localStorage.setItem('dcubby.auth_token', token as string)
            else localStorage.removeItem('dcubby.auth_token')
          },
          [theme, screen.signedOut ? '' : process.env.SHOTS_TOKEN || ''],
        )
        const page = await context.newPage()

        try {
          await page.goto(screen.path)
          await settle(page)
          // The Next.js development badge is not part of the interface.
          await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' })
          if (screen.prepare) {
            await screen.prepare(page, viewport)
            await settle(page)
          }
        } catch (error) {
          problems.push(`${screen.name}: ${(error as Error).message.split('\n')[0]}`)
        }

        await page.screenshot({ path: path.join(dir, `${screen.name}.png`), fullPage: !screen.prepare })

        try {
          const results = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze()
          const failures = results.violations.flatMap((violation) =>
            violation.nodes.map((node) => ({
              text: node.html.slice(0, 160),
              summary: (node.any[0]?.message ?? node.failureSummary ?? '').slice(0, 240),
            })),
          )
          if (failures.length) contrast[screen.name] = failures
        } catch (error) {
          problems.push(`${screen.name} (contrast check): ${(error as Error).message.split('\n')[0]}`)
        }

        await context.close()
      }

      writeFileSync(path.join(dir, 'contrast.json'), JSON.stringify(contrast, null, 2))
      writeFileSync(path.join(dir, 'problems.txt'), problems.join('\n'))
      const failing = Object.values(contrast).reduce((sum, list) => sum + list.length, 0)
      console.log(`${group}: ${failing} contrast failures, ${problems.length} screens not fully prepared`)
    })
  }
}
