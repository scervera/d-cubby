import { deflateSync } from 'node:zlib'

/** Sample files for the screenshot run, generated in memory (nothing binary in the repo). */

type RGB = [number, number, number]

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buf: Buffer): number {
  let c = 0xffffffff
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type: string, data: Buffer): Buffer {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const out = Buffer.alloc(body.length + 8)
  out.writeUInt32BE(data.length, 0)
  body.copy(out, 4)
  out.writeUInt32BE(crc32(body), body.length + 4)
  return out
}

/** A PNG with a diagonal blend from `from` to `to` and a disc in `spot`. */
export function png(width: number, height: number, from: RGB, to: RGB, spot: RGB): Buffer {
  const raw = Buffer.alloc((width * 3 + 1) * height)
  const cx = width * 0.68
  const cy = height * 0.4
  const radius = Math.min(width, height) * 0.22
  let i = 0
  for (let y = 0; y < height; y++) {
    raw[i++] = 0
    for (let x = 0; x < width; x++) {
      const inSpot = (x - cx) ** 2 + (y - cy) ** 2 < radius ** 2
      const t = (x / width + y / height) / 2
      for (let ch = 0; ch < 3; ch++) raw[i++] = inSpot ? spot[ch] : Math.round(from[ch] + (to[ch] - from[ch]) * t)
    }
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header.set([8, 2, 0, 0, 0], 8)
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/** One second of a 440 Hz tone, 16-bit mono. */
export function wav(): Buffer {
  const rate = 8000
  const data = Buffer.alloc(rate * 2)
  for (let n = 0; n < rate; n++) data.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 440 * n) / rate) * 12000), n * 2)
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + data.length, 4)
  header.write('WAVEfmt ', 8)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(1, 22)
  header.writeUInt32LE(rate, 24)
  header.writeUInt32LE(rate * 2, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(data.length, 40)
  return Buffer.concat([header, data])
}

/** A one-page PDF. */
export function pdf(): Buffer {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    '',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  const stream = 'BT /F1 28 Tf 72 700 Td (D-cubby sample document) Tj ET'
  objects[3] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
  let body = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((object, index) => {
    offsets.push(body.length)
    body += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xref = body.length
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const offset of offsets) body += `${String(offset).padStart(10, '0')} 00000 n \n`
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(body, 'latin1')
}

export interface SampleFile {
  name: string
  filename: string
  mimeType: string
  tags: string[]
  build: () => Buffer
}

const image = (name: string, w: number, h: number, from: RGB, to: RGB, spot: RGB, tags: string[]): SampleFile => ({
  name,
  filename: `${name}.png`,
  mimeType: 'image/png',
  tags,
  build: () => png(w, h, from, to, spot),
})

/**
 * Strongly coloured images on purpose: the interface has to stay readable, and its accent
 * colour distinct, next to thumbnails of any colour.
 */
export const SAMPLE_FILES: SampleFile[] = [
  image('shots-crimson', 1200, 800, [190, 24, 40], [250, 110, 60], [255, 230, 200], ['shots-warm']),
  image('shots-amber', 800, 1200, [240, 170, 20], [255, 230, 120], [120, 60, 10], ['shots-warm']),
  image('shots-lime', 1200, 800, [120, 200, 40], [20, 120, 60], [240, 255, 200], ['shots-cool']),
  image('shots-teal', 1000, 1000, [10, 130, 140], [120, 220, 210], [10, 40, 60], ['shots-cool']),
  image('shots-cobalt', 1200, 800, [30, 80, 220], [100, 170, 255], [255, 255, 255], ['shots-cool']),
  image('shots-violet', 800, 1200, [110, 40, 200], [220, 120, 240], [30, 10, 60], ['shots-cool']),
  image('shots-white', 1200, 800, [250, 250, 250], [225, 225, 225], [255, 255, 255], ['shots-neutral']),
  image('shots-black', 1200, 800, [8, 8, 8], [40, 40, 40], [0, 0, 0], ['shots-neutral']),
  { name: 'shots-tone', filename: 'shots-tone.wav', mimeType: 'audio/wav', tags: ['shots-neutral'], build: wav },
  { name: 'shots-document', filename: 'shots-document.pdf', mimeType: 'application/pdf', tags: ['shots-neutral'], build: pdf },
  image('shots-deleted', 600, 400, [90, 90, 90], [160, 160, 160], [200, 60, 60], []),
]
