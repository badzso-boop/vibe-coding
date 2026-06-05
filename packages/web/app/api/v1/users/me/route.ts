import { type NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth, isAuthError } from '@/lib/auth'
import { createServiceClient, createAnonClient } from '@/lib/supabase'
import { ok, noContent, Errors } from '@/lib/response'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth.error

  const supabase = createServiceClient()

  const { data: user } = await supabase
    .from('users')
    .select('id, email, name, avatar_url, created_at, updated_at, last_login_at')
    .eq('id', auth.ctx.user.id)
    .single()

  if (!user) return Errors.internalError()

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('tier, status, current_period_end, cancel_at_period_end')
    .eq('user_id', auth.ctx.user.id)
    .maybeSingle()

  // Update last_login_at without blocking
  void supabase
    .from('users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', auth.ctx.user.id)

  return ok({
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatar_url,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
    lastLoginAt: user.last_login_at,
    subscription: subscription
      ? {
          tier: subscription.tier,
          status: subscription.status,
          currentPeriodEnd: subscription.current_period_end,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        }
      : { tier: 'free', status: 'active', currentPeriodEnd: null, cancelAtPeriodEnd: false },
  })
}

const patchSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  avatarUrl: z.string().url().nullable().optional(),
})

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth.error

  let body: z.infer<typeof patchSchema>
  try {
    body = patchSchema.parse(await request.json())
  } catch {
    return Errors.badRequest('Invalid request body')
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.name !== undefined) updates.name = body.name
  if (body.avatarUrl !== undefined) updates.avatar_url = body.avatarUrl

  const supabase = createServiceClient()

  const { data: user, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', auth.ctx.user.id)
    .select('id, email, name, avatar_url, created_at, updated_at, last_login_at')
    .single()

  if (error || !user) {
    console.error('Failed to update user:', error?.message)
    return Errors.internalError()
  }

  return ok({
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatar_url,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
    lastLoginAt: user.last_login_at,
  })
}

const deleteSchema = z.object({
  // Google OAuth users don't have a password — confirmPassword is optional
  confirmPassword: z.string().min(1).optional(),
})

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth.error

  let body: z.infer<typeof deleteSchema>
  try {
    body = deleteSchema.parse(await request.json())
  } catch {
    return Errors.badRequest('Invalid request body')
  }

  const supabase = createServiceClient()

  // Check if the user has email+password authentication
  const { data: adminUser } = await supabase.auth.admin.getUserById(auth.ctx.user.id)
  const hasPasswordAuth = adminUser?.user?.identities?.some((i) => i.provider === 'email') ?? false

  if (hasPasswordAuth) {
    if (!body.confirmPassword) {
      return Errors.badRequest('Password confirmation is required to delete your account')
    }
    const anonClient = createAnonClient()
    const { error: signInError } = await anonClient.auth.signInWithPassword({
      email: auth.ctx.user.email,
      password: body.confirmPassword,
    })
    if (signInError) return Errors.wrongPassword()
  }

  // Delete from Supabase Auth — cascades to public.users via DB trigger
  const { error } = await supabase.auth.admin.deleteUser(auth.ctx.user.id)

  if (error) {
    console.error('Failed to delete user:', error?.message)
    return Errors.internalError()
  }

  return noContent()
}
