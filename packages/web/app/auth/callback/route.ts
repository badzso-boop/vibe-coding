import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

function safeRedirectPath(next: string | null): string {
  if (!next) return '/dashboard'
  // Only allow same-site relative paths — no protocol-relative or absolute URLs
  if (next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\')) {
    return next
  }
  return '/dashboard'
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeRedirectPath(searchParams.get('next'))

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(new URL(next, request.url))
}
