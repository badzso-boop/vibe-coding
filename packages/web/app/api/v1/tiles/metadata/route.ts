import { promises as dns } from 'dns'
import { type NextRequest } from 'next/server'
import { requireAuth, isAuthError } from '@/lib/auth'
import { ok, Errors } from '@/lib/response'

const TIMEOUT_MS = 5_000
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])

function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '') // strip IPv6 brackets
  if (h === 'localhost' || h === '0.0.0.0' || h === '::' || h === '::1') return true
  // IPv4-mapped IPv6 (::ffff:127.0.0.1) — recurse with the embedded v4 address
  const v4mapped = h.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (v4mapped) return isBlockedHost(v4mapped[1])
  // IPv4 private / reserved ranges
  const ipv4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])]
    if (a === 0) return true // 0.x.x.x unspecified
    if (a === 10) return true // 10.x.x.x private
    if (a === 127) return true // 127.x.x.x loopback
    if (a === 169 && b === 254) return true // 169.254.x.x link-local (AWS metadata)
    if (a === 172 && b >= 16 && b <= 31) return true // 172.16-31.x.x private
    if (a === 192 && b === 168) return true // 192.168.x.x private
    if (a === 255) return true // broadcast
  }
  // IPv6 private: ULA fc00::/7 and link-local fe80::/10
  if (/^f[cd]/i.test(h) || /^fe[89ab]/i.test(h)) return true
  return false
}

// Pre-resolve the hostname and verify all returned IPs are public.
// Mitigates DNS rebinding: an attacker-controlled domain with TTL=0 could
// resolve to a private IP at connection time even if it resolved publicly
// at validation time. We reject if ANY resolved address is blocked.
async function assertPublicHost(hostname: string): Promise<void> {
  // Raw IP addresses are already checked by isBlockedHost before we get here
  const isRawIp = /^[\d.]+$/.test(hostname) || /^[0-9a-f:]+$/i.test(hostname)
  if (isRawIp) return
  let addresses: { address: string; family: number }[]
  try {
    addresses = (await dns.lookup(hostname, { all: true })) as {
      address: string
      family: number
    }[]
  } catch {
    // ENOTFOUND etc. — let fetch surface the error naturally
    return
  }
  for (const { address } of addresses) {
    if (isBlockedHost(address)) throw new Error('Host resolves to a private or reserved address')
  }
}

const MAX_REDIRECTS = 5

async function safeFetch(initialUrl: string, signal: AbortSignal): Promise<Response> {
  let currentUrl = initialUrl
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    // Re-validate + re-resolve on every hop (covers open-redirect SSRF and DNS rebinding)
    const parsed = new URL(currentUrl)
    if (isBlockedHost(parsed.hostname)) throw new Error('Redirect to blocked host')
    await assertPublicHost(parsed.hostname)
    const res = await fetch(currentUrl, {
      redirect: 'manual',
      signal,
      headers: { 'User-Agent': 'FlowSpace/1.0 (metadata bot)' },
    })
    if (res.status < 300 || res.status >= 400) return res
    const location = res.headers.get('location')
    if (!location) return res
    let next: URL
    try {
      next = new URL(location, currentUrl)
      if (!ALLOWED_PROTOCOLS.has(next.protocol)) throw new Error()
    } catch {
      throw new Error('Redirect to invalid URL')
    }
    currentUrl = next.toString()
  }
  throw new Error('Too many redirects')
}

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

  if (isBlockedHost(parsed.hostname)) {
    return Errors.badRequest('url must be a public web address')
  }

  try {
    await assertPublicHost(parsed.hostname)
  } catch {
    return Errors.badRequest('url must be a public web address')
  }

  try {
    const getSignal = AbortSignal.timeout(TIMEOUT_MS)
    const getRes = await safeFetch(rawUrl, getSignal)

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
