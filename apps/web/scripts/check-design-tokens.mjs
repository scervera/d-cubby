#!/usr/bin/env node
/**
 * Checks that components take colour, depth and focus styling from the design tokens
 * (src/app/tokens.css) instead of hard-coding them.
 *
 *   node scripts/check-design-tokens.mjs            fail on any finding
 *   node scripts/check-design-tokens.mjs --report   print the counts, never fail
 *   node scripts/check-design-tokens.mjs --list     also print every finding
 *
 * A line that has to keep a literal (user-chosen colours, a preview backdrop) is exempted
 * by putting "palette-ok" in a comment on that line.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')
const args = new Set(process.argv.slice(2))

const PALETTE =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose'

const RULES = [
  ['hex colour', /#[0-9A-Fa-f]{6}\b|#[0-9A-Fa-f]{3}\b/],
  ['Tailwind palette class', new RegExp(`\\b(${PALETTE})-(50|[1-9]00|950)\\b`)],
  ['white/black colour utility', /\b(bg|text|border|ring|divide|fill|stroke|outline|placeholder|from|via|to)-(white|black)\b/],
  ['dark: variant', /\bdark:/],
  ['gradient', /bg-(gradient|linear|radial|conic)|linearGradient|radialGradient/],
  ['glass / old variables', /backdrop-(blur|filter)|glass-|--glass|--brand|--shell|accent-primary|surface-elevated/],
  ['ad-hoc focus, font or z-index', /focus:(ring|outline|border)|font-heading|z-\[[0-9]+\]|zIndex/],
]

const CSS_RULES = [
  ['colour literal in globals.css', /#[0-9A-Fa-f]{3,8}\b|rgba?\(/],
  ['backdrop-filter in globals.css', /backdrop-filter/],
]

function files(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) return files(full)
    return /\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry) ? [full] : []
  })
}

const findings = []
const scan = (file, rules) => {
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, index) => {
      if (line.includes('palette-ok')) return
      for (const [name, pattern] of rules) {
        if (pattern.test(line)) findings.push({ rule: name, file: path.relative(ROOT, file), line: index + 1, text: line.trim() })
      }
    })
}

files(SRC).forEach((file) => scan(file, RULES))
scan(path.join(SRC, 'app', 'globals.css'), CSS_RULES)

const byRule = new Map()
const byFile = new Map()
for (const finding of findings) {
  byRule.set(finding.rule, (byRule.get(finding.rule) ?? 0) + 1)
  byFile.set(finding.file, (byFile.get(finding.file) ?? 0) + 1)
}

if (args.has('--list')) {
  for (const f of findings) console.log(`${f.file}:${f.line}  [${f.rule}]  ${f.text.slice(0, 140)}`)
  console.log('')
}

if (findings.length === 0) {
  console.log('Design tokens: no hard-coded styling found.')
  process.exit(0)
}

console.log(`Design tokens: ${findings.length} lines with hard-coded styling in ${byFile.size} files`)
for (const [rule, count] of [...byRule].sort((a, b) => b[1] - a[1])) console.log(`  ${String(count).padStart(5)}  ${rule}`)
console.log('Most affected files:')
for (const [file, count] of [...byFile].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`  ${String(count).padStart(5)}  ${file}`)

process.exit(args.has('--report') ? 0 : 1)
