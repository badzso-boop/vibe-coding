import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  // API routes kezelik a saját auth-jukat (Bearer token + requireAuth())
  // A middleware csak a frontend session refresh-t végzi
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return
  }

  return updateSession(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
