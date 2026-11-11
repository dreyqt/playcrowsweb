import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

export type MountPreorderCampaign = { active: boolean; starts_at: string | null }

export function useMountPreorderCampaign() {
  const [campaign, setCampaign] = useState<MountPreorderCampaign | null>(null)
  const [error, setError] = useState(false)
  const [revision, setRevision] = useState(0)
  const refresh = useCallback(() => setRevision(value => value + 1), [])

  useEffect(() => {
    let cancelled = false
    setError(false)
    void (async () => {
      try {
        const result = await supabase.rpc('get_mount_preorder_campaign')
        if (result.error || typeof result.data?.active !== 'boolean') throw new Error('Unavailable')
        if (!cancelled) setCampaign(result.data as MountPreorderCampaign)
      } catch {
        if (!cancelled) { setCampaign(null); setError(true) }
      }
    })()
    return () => { cancelled = true }
  }, [revision])

  useEffect(() => {
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [refresh])

  return { campaign, error, refresh }
}
