import { type NextRequest } from 'next/server'
import { requireAuth, isAuthError } from '@/lib/auth'
import { ok, Errors } from '@/lib/response'

const TIMEOUT_MS = 5_000
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]{1,512})<\/title>/i)
  if (!match) return null
  // Strip any residual tags and decode entities so stored titles are plain text
  const stripped = match[1].replace(/<[^>]*>/g, '').trim()
  return decodeHtmlEntities(stripped) || null
}

function extractFavicon(html: string, origin: string): string | null {
  // Try <link rel="icon"> or <link rel="shortcut icon">
  const iconMatch =
    html.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i) ??
    html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut )?icon["']/i)

  if (iconMatch) {
    const href = iconMatch[1]
    // Resolve relative paths
    if (href.startsWith('http')) return href
    if (href.startsWith('//')) return `https:${href}`
    if (href.startsWith('/')) return `${origin}${href}`
    return `${origin}/${href}`
  }

  // Fallback to /favicon.ico
  return `${origin}/favicon.ico`
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth.error

  const { searchParams } = new URL(request.url)
  const rawUrl = searchParams.get('url')

  if (!rawUrl) {
    return Errors.badRequest('url query parameter is required')
  }

  let parsed: URL
  try {
    parsed = new URL(rawUrl)
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) throw new Error()
  } catch {
    return Errors.badRequest('url must be a valid http or https URL')
  }

  try {
    const getSignal = AbortSignal.timeout(TIMEOUT_MS)
    const getRes = await fetch(rawUrl, {
      redirect: 'follow',
      signal: getSignal,
      headers: { 'User-Agent': 'FlowSpace/1.0 (metadata bot)' },
    })

    const contentType = getRes.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html')) {
      // Not an HTML page (e.g. an image or PDF) — return what we have
      return ok({
        url: rawUrl,
        title: parsed.hostname,
        faviconUrl: `${parsed.origin}/favicon.ico`,
        isIframeable: true,
        iframeBlockReason: null,
      })
    }

    // Read at most 50KB — enough for the <head> section
    const reader = getRes.body?.getReader()
    let html = ''
    let bytesRead = 0
    if (reader) {
      const decoder = new TextDecoder()
      while (bytesRead < 51_200) {
        const { done, value } = await reader.read()
        if (done) break
        html += decoder.decode(value, { stream: true })
        bytesRead += value.byteLength
        // Stop once we have the closing </head> tag
        if (html.toLowerCase().includes('</head>')) break
      }
      reader.cancel()
    }

    return ok({
      url: rawUrl,
      title: extractTitle(html),
      faviconUrl: extractFavicon(html, parsed.origin),
      isIframeable: true,
      iframeBlockReason: null,
    })
  } catch {
    return ok({
      url: rawUrl,
      title: null,
      faviconUrl: null,
      isIframeable: true,
      iframeBlockReason: null,
    })
  }
}
