import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { DonationRecord, DonationStatus } from './types'

const STATUS_LABELS: Record<DonationStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
}

const STATUS_CLASSES: Record<DonationStatus, string> = {
  pending: 'border-[#f5a623]/40 bg-[#f5a623]/10 text-[#f5a623]',
  approved: 'border-[#22c55e]/40 bg-[#22c55e]/10 text-[#22c55e]',
  rejected: 'border-[#ef4444]/40 bg-[#ef4444]/10 text-[#ef4444]',
}

const PAYMENT_LABELS = {
  paypal: 'PayPal',
  gcash: 'GCash',
  wise: 'Wise',
  bybit: 'Bybit',
} as const

function formatMoney(currency: DonationRecord['currency'], amount: number | string) {
  const value = Number(amount)

  if (!Number.isFinite(value)) {
    return `${currency} ${amount}`
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-SG', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Singapore',
  }).format(new Date(value))
}

function formatTableDate(value: string) {
  const date = new Date(value)

  return {
    date: new Intl.DateTimeFormat('en-SG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Singapore',
    }).format(date),
    time: new Intl.DateTimeFormat('en-SG', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Singapore',
    }).format(date),
  }
}

function formatBytes(bytes: number | null) {
  if (!bytes) return 'Unknown size'
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function getPackageCategory(packageId: string | null | undefined) {
  if (packageId?.startsWith('currency-')) return 'Currency'
  if (packageId?.startsWith('support-')) return 'Support Package'
  return 'Legacy'
}

function getPackageDisplayName(donation: DonationRecord) {
  if (donation.selected_package_id?.startsWith('currency-')) {
    const amount = Number(donation.selected_package_amount)

    if (Number.isFinite(amount)) {
      return `${amount.toLocaleString()} Diamonds`
    }
  }

  return donation.selected_package_title ?? 'Legacy Donation'
}

function PackageCategoryBadge({ packageId }: { packageId: string | null | undefined }) {
  const category = getPackageCategory(packageId)
  const className =
    category === 'Currency'
      ? 'border-[#66d4ff]/40 bg-[#66d4ff]/10 text-[#66d4ff]'
      : category === 'Support Package'
        ? 'border-[#f5a623]/40 bg-[#f5a623]/10 text-[#f5a623]'
        : 'border-[#353c52] bg-[#353c52]/20 text-[#9aa6ba]'

  return (
    <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[9px] font-bold ${className}`}>
      {category}
    </span>
  )
}

function LoginScreen({ onSignedIn }: { onSignedIn: () => Promise<void> }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    try {
      await onSignedIn()
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : 'Unable to verify administrator access.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0d0f14] px-4 text-[#e8eaf0]">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl border border-[#252a38] bg-[#13161e] p-6 shadow-2xl"
      >
        <div className="mb-6">
          <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#66d4ff]">
            PlayCrows
          </div>
          <h1 className="mt-2 text-2xl font-bold">Admin Dashboard</h1>
          <p className="mt-2 text-sm leading-6 text-[#7c879d]">
            Sign in with an authorized Supabase administrator account.
          </p>
        </div>

        <label className="block">
          <span className="text-xs font-semibold text-[#9aa6ba]">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={event => setEmail(event.target.value)}
            autoComplete="email"
            className="mt-2 min-h-11 w-full rounded-lg border border-[#353c52] bg-[#0f1219] px-3 text-sm text-[#e8eaf0] outline-none transition focus:border-[#66d4ff]"
          />
        </label>

        <label className="mt-4 block">
          <span className="text-xs font-semibold text-[#9aa6ba]">Password</span>
          <input
            type="password"
            required
            value={password}
            onChange={event => setPassword(event.target.value)}
            autoComplete="current-password"
            className="mt-2 min-h-11 w-full rounded-lg border border-[#353c52] bg-[#0f1219] px-3 text-sm text-[#e8eaf0] outline-none transition focus:border-[#66d4ff]"
          />
        </label>

        {error && (
          <div className="mt-4 rounded-lg border border-[#ef4444]/35 bg-[#ef4444]/5 px-3 py-3 text-xs leading-5 text-[#ef4444]">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 min-h-11 w-full rounded-lg bg-[#66d4ff] px-4 text-sm font-bold text-[#06141b] transition hover:bg-[#8ae2ff] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>

        <a
          href="/"
          className="mt-4 block text-center text-xs text-[#7c879d] hover:text-[#66d4ff]"
        >
          Return to donation website
        </a>
      </form>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-[#252a38] py-3 last:border-0">
      <div className="text-[10px] font-bold uppercase tracking-widest text-[#6b7280]">
        {label}
      </div>
      <div className="mt-1 break-words text-sm text-[#e8eaf0]">{value}</div>
    </div>
  )
}

export function AdminApp() {
  const [session, setSession] = useState<Session | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [authError, setAuthError] = useState('')
  const [donations, setDonations] = useState<DonationRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | DonationStatus>('all')
  const [selected, setSelected] = useState<DonationRecord | null>(null)
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<DonationStatus>('pending')
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  const verifyAdmin = async (currentSession?: Session | null) => {
    const activeSession =
      currentSession ?? (await supabase.auth.getSession()).data.session

    setSession(activeSession)

    if (!activeSession) {
      setAuthorized(false)
      setCheckingSession(false)
      return
    }

    const { data, error } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', activeSession.user.id)
      .maybeSingle()

    if (error || !data) {
      await supabase.auth.signOut()
      setSession(null)
      setAuthorized(false)
      setAuthError('This account is not authorized to access the PlayCrows admin dashboard.')
      setCheckingSession(false)
      throw new Error('This account is not authorized to access the PlayCrows admin dashboard.')
    }

    setAuthError('')
    setAuthorized(true)
    setCheckingSession(false)
  }

  const loadDonations = async () => {
    setLoading(true)
    setLoadError('')

    const { data, error } = await supabase
      .from('donations')
      .select(
        'id, reference_code, created_at, player_id, username, currency, amount, selected_package_amount, selected_package_id, selected_package_title, package_quantity, additional_notes, payment_method, receipt_path, receipt_original_name, receipt_mime_type, receipt_size_bytes, status, admin_notes, discord_message_id'
      )
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) {
      setLoadError(error.message)
      setLoading(false)
      return
    }

    setDonations((data ?? []) as DonationRecord[])
    setLoading(false)
  }

  useEffect(() => {
    void verifyAdmin().catch(() => undefined)

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (!nextSession) {
        setAuthorized(false)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (authorized) {
      void loadDonations()
    }
  }, [authorized])

  const filteredDonations = useMemo(() => {
    const query = search.trim().toLowerCase()

    return donations.filter(donation => {
      const statusMatches =
        statusFilter === 'all' || donation.status === statusFilter

      const searchMatches =
        !query ||
        donation.reference_code.toLowerCase().includes(query) ||
        donation.player_id.toLowerCase().includes(query) ||
        donation.username.toLowerCase().includes(query) ||
        donation.payment_method.toLowerCase().includes(query) ||
        donation.selected_package_id?.toLowerCase().includes(query) ||
        donation.selected_package_title?.toLowerCase().includes(query)

      return statusMatches && searchMatches
    })
  }, [donations, search, statusFilter])

  const counts = useMemo(
    () => ({
      all: donations.length,
      pending: donations.filter(item => item.status === 'pending').length,
      approved: donations.filter(item => item.status === 'approved').length,
      rejected: donations.filter(item => item.status === 'rejected').length,
    }),
    [donations]
  )

  const openDonation = (donation: DonationRecord) => {
    setSelected(donation)
    setNotes(donation.admin_notes ?? '')
    setStatus(donation.status)
    setSaveMessage('')
  }

const openReceipt = async () => {
  if (!selected) {
    return
  }

  const receiptWindow = window.open('about:blank', '_blank')

  if (!receiptWindow) {
    setSaveMessage(
      'Your browser blocked the new tab. Allow pop-ups for this website and try again.'
    )
    return
  }

  receiptWindow.opener = null
  receiptWindow.document.title = 'Loading Private Receipt'

  receiptWindow.document.body.innerHTML = `
    <div style="
      min-height: 100vh;
      margin: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0d0f14;
      color: #e8eaf0;
      font-family: Arial, sans-serif;
    ">
      Loading private receipt...
    </div>
  `

  setSaveMessage('Creating a secure receipt link…')

  const { data, error } = await supabase.storage
    .from('payment-receipts')
    .createSignedUrl(selected.receipt_path, 300)

  if (error || !data?.signedUrl) {
    receiptWindow.close()

    setSaveMessage(
      error?.message ?? 'Unable to create a secure receipt link.'
    )
    return
  }

  receiptWindow.location.replace(data.signedUrl)

  setSaveMessage(
    'Receipt opened in a new tab. The secure link expires in 5 minutes.'
  )
}

  const saveReview = async () => {
    if (!selected) return

    setSaving(true)
    setSaveMessage('')

    const { data, error } = await supabase
      .from('donations')
      .update({
        status,
        admin_notes: notes.trim() || null,
      })
      .eq('id', selected.id)
      .select(
        'id, reference_code, created_at, player_id, username, currency, amount, selected_package_amount, selected_package_id, selected_package_title, package_quantity, additional_notes, payment_method, receipt_path, receipt_original_name, receipt_mime_type, receipt_size_bytes, status, admin_notes, discord_message_id'
      )
      .single()

    if (error) {
      setSaveMessage(error.message)
      setSaving(false)
      return
    }

    const updated = data as DonationRecord
    setDonations(current =>
      current.map(item => (item.id === updated.id ? updated : item))
    )
    setSelected(updated)

    try {
      const {
        data: { session: activeSession },
      } = await supabase.auth.getSession()

      if (!activeSession) {
        throw new Error('Your admin session has expired.')
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

      const response = await fetch(
        `${supabaseUrl}/functions/v1/update-donation-discord-status`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: publishableKey,
            Authorization: `Bearer ${activeSession.access_token}`,
          },
          body: JSON.stringify({
            donationId: updated.id,
          }),
        }
      )

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        const message =
          payload &&
          typeof payload === 'object' &&
          'error' in payload &&
          typeof payload.error === 'string'
            ? payload.error
            : `Discord status sync failed (${response.status}).`

        throw new Error(message)
      }

      setSaveMessage('Review saved successfully and Discord status updated.')
    } catch (discordError) {
      console.error('Discord status sync error:', discordError)
      setSaveMessage(
        `Review saved, but Discord was not updated: ${
          discordError instanceof Error
            ? discordError.message
            : 'Unknown Discord sync error.'
        }`
      )
    } finally {
      setSaving(false)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setAuthorized(false)
    setSession(null)
    setDonations([])
    setSelected(null)
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0d0f14] text-sm text-[#7c879d]">
        Checking administrator access…
      </div>
    )
  }

  if (!session || !authorized) {
    return (
      <>
        {authError && (
          <div className="fixed left-1/2 top-5 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 rounded-lg border border-[#ef4444]/35 bg-[#1a1014] px-4 py-3 text-xs text-[#ef4444]">
            {authError}
          </div>
        )}
        <LoginScreen onSignedIn={() => verifyAdmin()} />
      </>
    )
  }

  return (
    <div className="min-h-screen bg-[#0d0f14] text-[#e8eaf0]">
      <header className="border-b border-[#191d27] bg-[#0d0f14]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#66d4ff]">
              PlayCrows
            </div>
            <h1 className="mt-1 text-xl font-bold">Donation Admin Dashboard</h1>
            <div className="mt-1 text-xs text-[#6b7280]">{session.user.email}</div>
          </div>

          <div className="flex gap-2">
            <a
              href="/"
              className="inline-flex min-h-10 items-center rounded-lg border border-[#353c52] px-4 text-xs font-bold text-[#cbd2de] hover:border-[#66d4ff]/60 hover:text-[#66d4ff]"
            >
              Open Website
            </a>
            <button
              type="button"
              onClick={() => void signOut()}
              className="min-h-10 rounded-lg border border-[#ef4444]/40 bg-[#ef4444]/5 px-4 text-xs font-bold text-[#ef4444] hover:bg-[#ef4444]/10"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {([
            ['All', counts.all, 'all'],
            ['Pending', counts.pending, 'pending'],
            ['Approved', counts.approved, 'approved'],
            ['Rejected', counts.rejected, 'rejected'],
          ] as const).map(([label, count, filter]) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
              className={`rounded-xl border p-4 text-left transition ${
                statusFilter === filter
                  ? 'border-[#66d4ff] bg-[#66d4ff]/5'
                  : 'border-[#252a38] bg-[#13161e] hover:border-[#353c52]'
              }`}
            >
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#6b7280]">
                {label}
              </div>
              <div className="mt-1 text-2xl font-bold text-[#e8eaf0]">{count}</div>
            </button>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3 rounded-xl border border-[#252a38] bg-[#13161e] p-4 sm:flex-row">
          <input
            type="search"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search reference, player, package, or payment method"
            className="min-h-11 flex-1 rounded-lg border border-[#353c52] bg-[#0f1219] px-3 text-sm outline-none focus:border-[#66d4ff]"
          />
          <button
            type="button"
            onClick={() => void loadDonations()}
            disabled={loading}
            className="min-h-11 rounded-lg border border-[#66d4ff]/50 bg-[#66d4ff]/10 px-4 text-xs font-bold text-[#66d4ff] hover:bg-[#66d4ff]/20 disabled:opacity-60"
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {loadError && (
          <div className="mt-4 rounded-lg border border-[#ef4444]/35 bg-[#ef4444]/5 px-4 py-3 text-xs text-[#ef4444]">
            {loadError}
          </div>
        )}

        <div className="mt-6 overflow-hidden rounded-xl border border-[#252a38] bg-[#13161e]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] table-fixed border-collapse text-left">
              <thead className="bg-[#191d27] text-[10px] uppercase tracking-widest text-[#7c879d]">
                <tr>
                  <th className="w-[135px] px-4 py-3">Reference</th>
                  <th className="w-[150px] px-4 py-3">Submitted</th>
                  <th className="w-[165px] px-4 py-3">Player</th>
                  <th className="w-[110px] px-3 py-3">Category</th>
                  <th className="w-[175px] px-3 py-3">Package</th>
                  <th className="w-[50px] px-2 py-3 text-center">Qty</th>
                  <th className="w-[105px] px-3 py-3">Total Paid</th>
                  <th className="w-[85px] px-3 py-3">Method</th>
                  <th className="w-[105px] px-3 py-3">Status</th>
                  <th className="w-[90px] px-3 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredDonations.map(donation => (
                  <tr key={donation.id} className="border-t border-[#252a38] text-sm">
                    <td className="px-4 py-4 font-mono text-xs text-[#66d4ff]">
                      {donation.reference_code}
                    </td>
                    <td className="px-4 py-4 text-xs text-[#9aa6ba]">
                      <div>{formatTableDate(donation.created_at).date}</div>
                      <div className="mt-1 text-[10px] text-[#6b7280]">
                        {formatTableDate(donation.created_at).time}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-semibold text-[#e8eaf0]">{donation.username}</div>
                      <div className="mt-1 text-xs text-[#6b7280]">{donation.player_id}</div>
                    </td>
                    <td className="px-3 py-4">
                      <PackageCategoryBadge packageId={donation.selected_package_id} />
                    </td>
                    <td className="px-3 py-4">
                      <div className="truncate font-semibold text-[#e8eaf0]">
                        {getPackageDisplayName(donation)}
                      </div>
                      <div className="mt-1 truncate font-mono text-[9px] text-[#6b7280]">
                        {donation.selected_package_id ?? 'Before package tracking'}
                      </div>
                    </td>
                    <td className="px-2 py-4 text-center font-semibold">
                      {donation.package_quantity ?? 1}
                    </td>
                    <td className="px-3 py-4 font-semibold">
                      {formatMoney(donation.currency, donation.amount)}
                    </td>
                    <td className="px-3 py-4 text-xs">{PAYMENT_LABELS[donation.payment_method]}</td>
                    <td className="px-3 py-4">
                      <span className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[9px] font-bold ${STATUS_CLASSES[donation.status]}`}>
                        {STATUS_LABELS[donation.status]}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => openDonation(donation)}
                        className="whitespace-nowrap rounded-lg border border-[#353c52] px-3 py-2 text-xs font-bold hover:border-[#66d4ff] hover:text-[#66d4ff]"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}

                {!loading && filteredDonations.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-sm text-[#6b7280]">
                      No donation submissions match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
          <div className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl border border-[#353c52] bg-[#13161e] sm:rounded-2xl">
            <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-[#252a38] bg-[#13161e] px-5 py-4">
              <div>
                <div className="font-mono text-sm font-bold text-[#66d4ff]">{selected.reference_code}</div>
                <div className="mt-1 text-xs text-[#6b7280]">{formatDate(selected.created_at)}</div>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="h-9 w-9 rounded-lg border border-[#353c52] text-lg text-[#9aa6ba] hover:text-white"
                aria-label="Close review"
              >
                ×
              </button>
            </div>

            <div className="grid gap-6 p-5 lg:grid-cols-2">
              <div>
                <h2 className="text-sm font-bold">Submission Details</h2>
                <div className="mt-3 rounded-xl border border-[#252a38] bg-[#0f1219] px-4">
                  <DetailRow label="Player ID" value={selected.player_id} />
                  <DetailRow label="Username" value={selected.username} />
                  <DetailRow label="Amount" value={formatMoney(selected.currency, selected.amount)} />
                  <div className="border-b border-[#252a38] py-3">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-[#6b7280]">
                      Package Category
                    </div>
                    <div className="mt-2">
                      <PackageCategoryBadge packageId={selected.selected_package_id} />
                    </div>
                  </div>
                  <DetailRow label="Package" value={getPackageDisplayName(selected)} />
                  <DetailRow
                    label="Unit Price"
                    value={
                      selected.selected_package_amount == null
                        ? 'Not recorded'
                        : formatMoney('USD', selected.selected_package_amount)
                    }
                  />
                  <DetailRow label="Quantity" value={String(selected.package_quantity ?? 1)} />
                  <DetailRow label="Total Paid" value={formatMoney(selected.currency, selected.amount)} />
                  <DetailRow label="Package ID" value={selected.selected_package_id ?? 'Legacy record'} />
                  <DetailRow label="Additional Notes" value={selected.additional_notes ?? 'None'} />
                  <DetailRow label="Payment Method" value={PAYMENT_LABELS[selected.payment_method]} />
                  <DetailRow
                    label="Receipt File"
                    value={`${selected.receipt_original_name ?? 'Receipt'} · ${formatBytes(selected.receipt_size_bytes)}`}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => void openReceipt()}
                  className="mt-4 min-h-11 w-full rounded-lg border border-[#66d4ff]/50 bg-[#66d4ff]/10 px-4 text-sm font-bold text-[#66d4ff] hover:bg-[#66d4ff]/20"
                >
                  Open Private Receipt
                </button>
              </div>

              <div>
                <h2 className="text-sm font-bold">Admin Review</h2>

                <label className="mt-3 block">
                  <span className="text-xs font-semibold text-[#9aa6ba]">Status</span>
                  <select
                    value={status}
                    onChange={event => setStatus(event.target.value as DonationStatus)}
                    className="mt-2 min-h-11 w-full rounded-lg border border-[#353c52] bg-[#0f1219] px-3 text-sm outline-none focus:border-[#66d4ff]"
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </label>

                <label className="mt-4 block">
                  <span className="text-xs font-semibold text-[#9aa6ba]">Internal Notes</span>
                  <textarea
                    value={notes}
                    onChange={event => setNotes(event.target.value)}
                    rows={8}
                    placeholder="Add verification details or rejection reason…"
                    className="mt-2 w-full resize-y rounded-lg border border-[#353c52] bg-[#0f1219] p-3 text-sm leading-6 outline-none focus:border-[#66d4ff]"
                  />
                </label>

                {saveMessage && (
                  <div className="mt-4 rounded-lg border border-[#353c52] bg-[#0f1219] px-3 py-3 text-xs leading-5 text-[#9aa6ba]">
                    {saveMessage}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => void saveReview()}
                  disabled={saving}
                  className="mt-4 min-h-11 w-full rounded-lg bg-[#66d4ff] px-4 text-sm font-bold text-[#06141b] hover:bg-[#8ae2ff] disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save Review'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}