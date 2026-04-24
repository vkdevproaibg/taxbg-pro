import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, PDFFont } from 'pdf-lib'

// ─────────────────────────────────────────────────────────────
// Cyrillic font loader — Noto Sans (OFL license, Google Fonts)
// Loads from local public/fonts/ first, falls back to gstatic CDN.
// Fonts are cached in memory — repeated PDF generations reuse them.
// ─────────────────────────────────────────────────────────────

let regularFontBytes: ArrayBuffer | null = null
let boldFontBytes: ArrayBuffer | null = null

const CDN_URLS = {
  regular:
    'https://fonts.gstatic.com/s/notosans/v42/o-0mIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjcz6L1SoM-jCpoiyD9A99d.ttf',
  bold:
    'https://fonts.gstatic.com/s/notosans/v42/o-0mIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjcz6L1SoM-jCpoiyAaBN9d.ttf',
} as const

async function loadFontBytes(variant: 'regular' | 'bold'): Promise<ArrayBuffer> {
  if (variant === 'regular' && regularFontBytes) return regularFontBytes
  if (variant === 'bold' && boldFontBytes) return boldFontBytes

  const fileName = variant === 'bold' ? 'NotoSans-Bold.ttf' : 'NotoSans-Regular.ttf'

  // Try local file first
  try {
    const response = await fetch(`/fonts/${fileName}`)
    if (response.ok) {
      const bytes = await response.arrayBuffer()
      if (variant === 'regular') regularFontBytes = bytes
      else boldFontBytes = bytes
      return bytes
    }
  } catch {
    console.warn(`[pdfFonts] Local font ${fileName} not found, trying CDN…`)
  }

  // Fallback: gstatic CDN
  const cdnResponse = await fetch(CDN_URLS[variant])
  if (!cdnResponse.ok) {
    throw new Error(
      `Не удалось загрузить шрифт Noto Sans (${variant}). Проверьте подключение к интернету.`,
    )
  }

  const bytes = await cdnResponse.arrayBuffer()
  if (variant === 'regular') regularFontBytes = bytes
  else boldFontBytes = bytes
  return bytes
}

export async function embedCyrillicFonts(
  doc: PDFDocument,
): Promise<{ font: PDFFont; bold: PDFFont }> {
  const [regularBytes, boldBytes] = await Promise.all([
    loadFontBytes('regular'),
    loadFontBytes('bold'),
  ])

  doc.registerFontkit(fontkit)
  // Noto Sans subsetting breaks glyph placement in some PDF viewers for this form.
  // Embedding the full font keeps Cyrillic rendering stable.
  const font = await doc.embedFont(regularBytes, { subset: false })
  const bold = await doc.embedFont(boldBytes, { subset: false })

  return { font, bold }
}

// ── Helpers for text fitting ────────────────────────────────

/** Shrinks fontSize until text fits within maxWidth; truncates with '…' as last resort. */
export function fitTextToWidth(
  text: string,
  font: PDFFont,
  maxFontSize: number,
  maxWidth: number,
  minFontSize = 6,
): { text: string; fontSize: number } {
  let fontSize = maxFontSize
  while (fontSize >= minFontSize) {
    if (font.widthOfTextAtSize(text, fontSize) <= maxWidth) return { text, fontSize }
    fontSize -= 0.5
  }
  // Text doesn't fit even at min size — truncate
  let truncated = text
  while (truncated.length > 1) {
    truncated = truncated.slice(0, -1)
    if (font.widthOfTextAtSize(truncated + '\u2026', minFontSize) <= maxWidth) {
      return { text: truncated + '\u2026', fontSize: minFontSize }
    }
  }
  return { text, fontSize: minFontSize }
}

/** Word-wraps text respecting font metrics. */
export function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
): string[] {
  const lines: string[] = []
  const paragraphs = text.split('\n')

  for (const paragraph of paragraphs) {
    if (paragraph.trim() === '') {
      lines.push('')
      continue
    }
    const words = paragraph.split(' ')
    let currentLine = ''

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      if (font.widthOfTextAtSize(testLine, fontSize) > maxWidth && currentLine) {
        lines.push(currentLine)
        currentLine = word
      } else {
        currentLine = testLine
      }
    }
    if (currentLine) lines.push(currentLine)
  }

  return lines
}
