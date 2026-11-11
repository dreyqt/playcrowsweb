import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useMountPreorderCampaign } from '../lib/useMountPreorderCampaign'
import type { DonationRecord } from './types'

const dollars = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
const buttonClass = 'min-h-10 rounded-lg border border-[#c9aa68]/40 bg-[#c9aa68]/10 px-3 py-2 text-xs font-bold text-[#e4c98e] hover:bg-[#c9aa68]/20 disabled:opacity-50'

export function MountPreorderCampaignControl() {
  const { campaign, error, refresh } = useMountPreorderCampaign()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const launch = async () => {
    if (!window.confirm('Launch mount pre-orders now? Only gift-package orders created from this moment onward will count when payment is verified. Previous purchases will not count.')) return
    setBusy(true)
    setMessage('')
    try {
      const result = await supabase.rpc('start_mount_preorder_campaign')
      if (result.error) throw result.error
      refresh()
      setMessage('Mount pre-orders launched. New qualifying purchases now count.')
    } catch {
      setMessage('Unable to launch mount pre-orders. Refresh the status and try again.')
    } finally { setBusy(false) }
  }

  return (
    <section aria-label="Mount pre-order campaign" className="mb-6 rounded-xl border border-[#c9aa68]/30 bg-[#c9aa68]/5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#e4c98e]">Mount pre-orders</h2>
          <p className="mt-1 text-sm text-[#bcb4a6]">$500 → $1,500 → $3,500 total verified spending per Login ID.</p>
          <p className="mt-2 text-xs leading-5 text-[#aaa49a]">{error ? 'Campaign status unavailable. Install the mount pre-order database update before launching.'
            : !campaign ? 'Loading campaign status…'
            : campaign.active ? `Open since ${new Date(campaign.starts_at!).toLocaleString('en-SG', { timeZone: 'Asia/Singapore' })} (Singapore time).`
            : 'Not launched. Deploy the updated website, then launch here to start counting new purchases.'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={buttonClass} disabled={busy} onClick={refresh}>Refresh status</button>
          {campaign && !campaign.active && <button type="button" className={buttonClass} disabled={busy} onClick={() => void launch()}>{busy ? 'Launching…' : 'Launch mount pre-orders'}</button>}
        </div>
      </div>
      {message && <p role="status" className="mt-3 text-xs text-[#e4c98e]">{message}</p>}
    </section>
  )
}

type MountProgress = {
  active: boolean
  starts_at: string | null
  total_paid_usd: number
  next_step: number | null
  remaining_usd: number
  steps: {
    step: number
    mount_key: string
    mount_name: string
    step_usd: number
    total_required_usd: number
    unlocked: boolean
    reserved_at: string | null
    source_donation_id: string | null
    delivery_status: 'reserved' | 'delivered' | null
  }[]
}

export function MountPreorderProgress({ donation }: { donation: DonationRecord }) {
  const [progress, setProgress] = useState<MountProgress | null>(null)
  const [error, setError] = useState(false)
  const [revision, setRevision] = useState(0)
  const [busyStep, setBusyStep] = useState<number | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    setProgress(null)
    setError(false)
    void (async () => {
      try {
        const result = await supabase.rpc('get_mount_preorder_progress', { p_player_id: donation.player_id })
        if (result.error || !Array.isArray(result.data?.steps)) throw new Error('Unavailable')
        if (!cancelled) setProgress(result.data as MountProgress)
      } catch { if (!cancelled) setError(true) }
    })()
    return () => { cancelled = true }
  }, [donation, revision])

  const markDelivered = async (step: MountProgress['steps'][number]) => {
    if (!window.confirm(`Confirm ${step.mount_name} has actually been delivered to Login ID ${donation.player_id}? This records mount delivery separately from the gift package.`)) return
    setBusyStep(step.step)
    setMessage('')
    try {
      const result = await supabase.rpc('mark_mount_preorder_delivered', { p_player_id: donation.player_id, p_step: step.step })
      if (result.error) throw result.error
      setRevision(value => value + 1)
      setMessage(`${step.mount_name}: delivery recorded.`)
    } catch { setMessage('Unable to record mount delivery. Refresh progress and try again.') }
    finally { setBusyStep(null) }
  }

  return (
    <section aria-label="Mount pre-order progress" className="my-4 rounded-xl border border-[#c9aa68]/30 bg-[#c9aa68]/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-[#e4c98e]">Mount pre-order progress</h3>
        <button type="button" className={buttonClass} onClick={() => setRevision(value => value + 1)}>Refresh progress</button>
      </div>
      <p className="mt-2 text-xs leading-5 text-[#aaa49a]">Account-wide rewards for this Login ID. Mounts remain reserved until separately delivered; fulfilling a gift package does not deliver a mount.</p>
      {error ? <p role="status" className="mt-3 text-xs text-[#ef8c87]">Unable to load mount progress. Try refreshing; normal package review remains available.</p>
        : !progress ? <p className="mt-3 text-xs text-[#aaa49a]">Loading progress…</p> : <>
          {!progress.active && <p className="mt-3 text-xs text-[#d8b978]">Pre-orders have not launched. Earlier purchases do not count.</p>}
          <p className="mt-3 text-lg font-bold text-[#f3e5cb]">{dollars(Number(progress.total_paid_usd))} <span className="text-xs font-normal text-[#aaa49a]">qualifying verified spending</span></p>
          {progress.next_step && <p className="mt-1 text-xs text-[#aaa49a]">{dollars(Number(progress.remaining_usd))} more to unlock Step {progress.next_step}.</p>}
          <ol className="mt-4 space-y-3">
            {progress.steps.map((step, index) => <li key={step.step} className="rounded-lg border border-white/10 bg-black/15 p-3">
              <div className="text-xs font-semibold text-[#eee9df]">Step {step.step} · {step.mount_name}</div>
              <p className="mt-1 text-xs text-[#aaa49a]">{dollars(Number(step.total_required_usd))} total · {step.delivery_status === 'delivered' ? 'Delivered' : step.unlocked ? 'Reserved — awaiting mount delivery' : 'Locked'}</p>
              {step.unlocked && step.delivery_status !== 'delivered' && <button type="button" className={`${buttonClass} mt-3`} disabled={busyStep !== null || (index > 0 && progress.steps[index - 1].delivery_status !== 'delivered')} onClick={() => void markDelivered(step)}>{busyStep === step.step ? 'Saving…' : 'Record mount delivery'}</button>}
            </li>)}
          </ol>
        </>}
      {message && <p role="status" className="mt-3 text-xs text-[#e4c98e]">{message}</p>}
    </section>
  )
}
