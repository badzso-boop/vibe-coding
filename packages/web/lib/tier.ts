import type { SupabaseClient } from '@supabase/supabase-js'
import { TIER_LIMITS } from '@flowspace/shared'
import { Errors } from './response'
import type { NextResponse } from 'next/server'

async function getUserTier(supabase: SupabaseClient, userId: string): Promise<'free' | 'pro'> {
  const { data } = await supabase
    .from('subscriptions')
    .select('tier')
    .eq('user_id', userId)
    .maybeSingle()

  return (data?.tier as 'free' | 'pro') ?? 'free'
}

export async function checkWorkspaceLimit(
  supabase: SupabaseClient,
  userId: string,
): Promise<NextResponse | null> {
  const tier = await getUserTier(supabase, userId)
  const limit = TIER_LIMITS[tier].workspaces

  if (limit === Infinity) return null

  const { count } = await supabase
    .from('workspaces')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if ((count ?? 0) >= limit) {
    return Errors.tierLimitReached(
      `Free tier allows only ${limit} workspace. Upgrade to Pro for unlimited workspaces.`,
    )
  }

  return null
}

export async function checkTileLimit(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string,
): Promise<NextResponse | null> {
  const tier = await getUserTier(supabase, userId)
  const limit = TIER_LIMITS[tier].tilesPerWorkspace

  if (limit === Infinity) return null

  const { count } = await supabase
    .from('tiles')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)

  if ((count ?? 0) >= limit) {
    return Errors.tierLimitReached(
      `Free tier allows only ${limit} tiles per workspace. Upgrade to Pro for unlimited tiles.`,
    )
  }

  return null
}

export async function checkDeviceLimit(
  supabase: SupabaseClient,
  userId: string,
): Promise<NextResponse | null> {
  const tier = await getUserTier(supabase, userId)
  const limit = TIER_LIMITS[tier].devices

  const { count } = await supabase
    .from('devices')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_revoked', false)

  if ((count ?? 0) >= limit) {
    return Errors.deviceLimitReached()
  }

  return null
}
