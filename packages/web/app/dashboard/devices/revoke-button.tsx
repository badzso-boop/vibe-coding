'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Trash2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

export function RevokeDeviceButton({ deviceId }: { deviceId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)

  async function handleRevoke() {
    if (!confirming) {
      setConfirming(true)
      setTimeout(() => setConfirming(false), 3000)
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token

    await fetch(`/api/v1/devices/${deviceId}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })

    router.refresh()
  }

  return (
    <button
      onClick={handleRevoke}
      disabled={loading}
      className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
        confirming
          ? 'bg-red-100 text-red-700 hover:bg-red-200'
          : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
      }`}
    >
      {loading ? (
        <Loader2 size={12} className="animate-spin" />
      ) : (
        <Trash2 size={12} />
      )}
      {confirming ? 'Confirm?' : 'Revoke'}
    </button>
  )
}
