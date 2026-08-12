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
  pending: 'border-[#d3ad62]/40 bg-[#d3ad62]/10 text-[#d3ad62]',
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



type EvidencePdfPage = {
  jpeg: Uint8Array
  widthPt: number
  heightPt: number
}

function dataUrlToBytes(dataUrl: string) {
  const base64 = dataUrl.split(',')[1] ?? ''
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function canvasToPdfPage(canvas: HTMLCanvasElement, widthPt: number, heightPt: number): EvidencePdfPage {
  return {
    jpeg: dataUrlToBytes(canvas.toDataURL('image/jpeg', 0.9)),
    widthPt,
    heightPt,
  }
}

function concatBytes(parts: Uint8Array[]) {
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

function buildImageOnlyPdf(pages: EvidencePdfPage[]) {
  const encoder = new TextEncoder()
  const header = encoder.encode('%PDF-1.4\n%PCROWS\n')
  const objectParts: Uint8Array[] = []
  const offsets: number[] = [0]
  let byteOffset = header.length
  const pageObjectIds: number[] = []
  const imageObjectIds: number[] = []
  const contentObjectIds: number[] = []
  const objectCount = 2 + pages.length * 3

  const pushObject = (id: number, bodyParts: Uint8Array[]) => {
    offsets[id] = byteOffset
    const start = encoder.encode(`${id} 0 obj\n`)
    const end = encoder.encode('\nendobj\n')
    const all = concatBytes([start, ...bodyParts, end])
    objectParts.push(all)
    byteOffset += all.length
  }

  pages.forEach((_, index) => {
    pageObjectIds.push(3 + index * 3)
    imageObjectIds.push(4 + index * 3)
    contentObjectIds.push(5 + index * 3)
  })

  pushObject(1, [encoder.encode('<< /Type /Catalog /Pages 2 0 R >>')])
  pushObject(2, [encoder.encode(`<< /Type /Pages /Count ${pages.length} /Kids [${pageObjectIds.map(id => `${id} 0 R`).join(' ')}] >>`)])

  pages.forEach((page, index) => {
    const pageId = pageObjectIds[index]
    const imageId = imageObjectIds[index]
    const contentId = contentObjectIds[index]
    pushObject(pageId, [encoder.encode(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.widthPt} ${page.heightPt}] /Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`)])
    pushObject(imageId, [
      encoder.encode(`<< /Type /XObject /Subtype /Image /Width ${Math.round(page.widthPt * 2)} /Height ${Math.round(page.heightPt * 2)} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpeg.length} >>\nstream\n`),
      page.jpeg,
      encoder.encode('\nendstream'),
    ])
    const content = `q\n${page.widthPt} 0 0 ${page.heightPt} 0 0 cm\n/Im0 Do\nQ`
    const contentBytes = encoder.encode(content)
    pushObject(contentId, [encoder.encode(`<< /Length ${contentBytes.length} >>\nstream\n`), contentBytes, encoder.encode('\nendstream')])
  })

  const xrefOffset = byteOffset
  const xrefLines = [`xref`, `0 ${objectCount + 1}`, '0000000000 65535 f ']
  for (let id = 1; id <= objectCount; id += 1) {
    xrefLines.push(`${String(offsets[id] ?? 0).padStart(10, '0')} 00000 n `)
  }
  const trailer = encoder.encode(`${xrefLines.join('\n')}\ntrailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`)
  return concatBytes([header, ...objectParts, trailer])
}

function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = String(text || 'Not recorded').split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (ctx.measureText(candidate).width <= maxWidth || !line) line = candidate
    else { lines.push(line); line = word }
  }
  if (line) lines.push(line)
  return lines
}

async function blobUrlToImage(url: string) {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Unable to load stored evidence image.')
  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  try {
    const image = new Image()
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('Unable to decode stored evidence image.'))
      image.src = objectUrl
    })
    return image
  } finally {
    // Keep the object URL alive until after the image has decoded.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
  }
}

function makeSummaryEvidencePage(title: string, subtitle: string, rows: Array<[string, string]>) {
  const canvas = document.createElement('canvas')
  canvas.width = 1190
  canvas.height = 1684
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#111111'
  ctx.font = 'bold 42px Arial, sans-serif'
  ctx.fillText(title, 72, 90)
  ctx.fillStyle = '#555555'
  ctx.font = '22px Arial, sans-serif'
  let y = 130
  for (const line of wrapCanvasText(ctx, subtitle, canvas.width - 144)) {
    ctx.fillText(line, 72, y)
    y += 31
  }
  y += 28
  const labelWidth = 340
  const rowWidth = canvas.width - 144
  for (const [label, value] of rows) {
    ctx.font = 'bold 20px Arial, sans-serif'
    const valueLines = (() => {
      ctx.font = '20px Arial, sans-serif'
      return wrapCanvasText(ctx, value || 'Not recorded', rowWidth - labelWidth - 36)
    })()
    const rowHeight = Math.max(64, 28 + valueLines.length * 28)
    if (y + rowHeight > canvas.height - 90) break
    ctx.fillStyle = '#f4f4f4'
    ctx.fillRect(72, y, labelWidth, rowHeight)
    ctx.strokeStyle = '#cfcfcf'
    ctx.strokeRect(72, y, rowWidth, rowHeight)
    ctx.beginPath()
    ctx.moveTo(72 + labelWidth, y)
    ctx.lineTo(72 + labelWidth, y + rowHeight)
    ctx.stroke()
    ctx.fillStyle = '#222222'
    ctx.font = 'bold 20px Arial, sans-serif'
    ctx.fillText(label, 90, y + 37)
    ctx.font = '20px Arial, sans-serif'
    valueLines.forEach((line, i) => ctx.fillText(line, 72 + labelWidth + 18, y + 37 + i * 28))
    y += rowHeight
  }
  ctx.fillStyle = '#666666'
  ctx.font = '18px Arial, sans-serif'
  ctx.fillText(`Generated ${new Date().toLocaleString()} - original evidence files remain stored in PlayCrows.`, 72, canvas.height - 45)
  return canvasToPdfPage(canvas, 595, 842)
}

function makeImageEvidencePage(title: string, image: HTMLImageElement, caption: string) {
  const landscape = image.naturalWidth / Math.max(1, image.naturalHeight) > 1.35
  const canvas = document.createElement('canvas')
  canvas.width = landscape ? 1684 : 1190
  canvas.height = landscape ? 1190 : 1684
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#111111'
  ctx.font = 'bold 38px Arial, sans-serif'
  ctx.fillText(title, 60, 75)
  ctx.fillStyle = '#555555'
  ctx.font = '20px Arial, sans-serif'
  ctx.fillText(caption, 60, 110)
  const boxX = 60
  const boxY = 145
  const boxW = canvas.width - 120
  const boxH = canvas.height - 205
  ctx.fillStyle = '#f7f7f7'
  ctx.fillRect(boxX, boxY, boxW, boxH)
  const scale = Math.min(boxW / image.naturalWidth, boxH / image.naturalHeight)
  const drawW = image.naturalWidth * scale
  const drawH = image.naturalHeight * scale
  ctx.drawImage(image, boxX + (boxW - drawW) / 2, boxY + (boxH - drawH) / 2, drawW, drawH)
  return canvasToPdfPage(canvas, landscape ? 842 : 595, landscape ? 595 : 842)
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

function buildFulfillmentNotes(donation: DonationRecord, deliveredTo: string, itemsDelivered: string) {
  const packageAmount = Number(donation.selected_package_amount)
  const quantity = donation.package_quantity ?? 1
  const coinAmount = Number.isFinite(packageAmount) ? packageAmount * quantity : null
  const account = deliveredTo.trim() || donation.username
  const items = itemsDelivered.trim()
  const coinText = coinAmount != null
    ? `The attached original backend ledger shows the corresponding coin -${coinAmount.toLocaleString()} balance deduction used when processing this order. `
    : 'The attached original backend ledger shows the corresponding coin balance deduction used when processing this order. '

  const itemsText = items ? `Items delivered: ${items}. ` : ''

  return `Digital in-game package successfully fulfilled to player account ${account} through the PlayCrows game administration backend. ${itemsText}${coinText}The coin value reflects the administration balance consumed when fulfilling the selected package and is not a separate player-facing currency. Original backend ledger evidence is attached to this order record.`
}

function PackageCategoryBadge({ packageId }: { packageId: string | null | undefined }) {
  const category = getPackageCategory(packageId)
  const className =
    category === 'Currency'
      ? 'border-[#c9aa68]/40 bg-[#c9aa68]/10 text-[#c9aa68]'
      : category === 'Support Package'
        ? 'border-[#d3ad62]/40 bg-[#d3ad62]/10 text-[#d3ad62]'
        : 'border-[#3b414b] bg-[#3b414b]/20 text-[#aaa49a]'

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
    <div className="flex min-h-screen items-center justify-center bg-[#0a0b0d] px-4 text-[#eee9df]">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl border border-[#292d34] bg-[#111318] p-6 shadow-2xl"
      >
        <div className="mb-6">
          <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#c9aa68]">
            PlayCrows
          </div>
          <h1 className="mt-2 text-2xl font-bold">Admin Dashboard</h1>
          <p className="mt-2 text-sm leading-6 text-[#8f8b84]">
            Sign in with an authorized Supabase administrator account.
          </p>
        </div>

        <label className="block">
          <span className="text-xs font-semibold text-[#aaa49a]">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={event => setEmail(event.target.value)}
            autoComplete="email"
            className="mt-2 min-h-11 w-full rounded-lg border border-[#3b414b] bg-[#0d0f13] px-3 text-sm text-[#eee9df] outline-none transition focus:border-[#c9aa68]"
          />
        </label>

        <label className="mt-4 block">
          <span className="text-xs font-semibold text-[#aaa49a]">Password</span>
          <input
            type="password"
            required
            value={password}
            onChange={event => setPassword(event.target.value)}
            autoComplete="current-password"
            className="mt-2 min-h-11 w-full rounded-lg border border-[#3b414b] bg-[#0d0f13] px-3 text-sm text-[#eee9df] outline-none transition focus:border-[#c9aa68]"
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
          className="mt-6 min-h-11 w-full rounded-lg bg-[#c9aa68] px-4 text-sm font-bold text-[#16120b] transition hover:bg-[#e1c88d] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>

        <a
          href="/"
          className="mt-4 block text-center text-xs text-[#8f8b84] hover:text-[#c9aa68]"
        >
          Return to donation website
        </a>
      </form>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-[#292d34] py-3 last:border-0">
      <div className="text-[10px] font-bold uppercase tracking-widest text-[#77746e]">
        {label}
      </div>
      <div className="mt-1 break-words text-sm text-[#eee9df]">{value}</div>
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
  const [paypalTransactionId, setPaypalTransactionId] = useState('')
  const [paymentVerified, setPaymentVerified] = useState(false)
  const [fulfillmentNotes, setFulfillmentNotes] = useState('')
  const [deliveredTo, setDeliveredTo] = useState('')
  const [itemsDelivered, setItemsDelivered] = useState('')
  const [fulfillmentEvidence, setFulfillmentEvidence] = useState<File | null>(null)
  const [generatingEvidencePdf, setGeneratingEvidencePdf] = useState(false)

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
        'id, reference_code, created_at, player_id, username, currency, amount, selected_package_amount, selected_package_id, selected_package_title, package_quantity, additional_notes, payment_method, receipt_path, receipt_original_name, receipt_mime_type, receipt_size_bytes, status, admin_notes, discord_message_id, paypal_transaction_id, payment_verified_at, fulfillment_status, fulfilled_at, fulfillment_notes, delivered_to, items_delivered, backend_ledger_timestamp, fulfillment_evidence_path, fulfillment_evidence_name, fulfillment_evidence_mime_type, fulfillment_evidence_size_bytes, fulfilled_by'
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
    setPaypalTransactionId(donation.paypal_transaction_id ?? '')
    setPaymentVerified(Boolean(donation.payment_verified_at))
    const defaultDeliveredTo = donation.delivered_to ?? donation.username ?? ''
    const defaultItemsDelivered = donation.items_delivered ?? ''
    setDeliveredTo(defaultDeliveredTo)
    setItemsDelivered(defaultItemsDelivered)
    setFulfillmentNotes(
      donation.fulfillment_notes ?? buildFulfillmentNotes(donation, defaultDeliveredTo, defaultItemsDelivered)
    )
    setFulfillmentEvidence(null)
    setSaveMessage('')
  }

  useEffect(() => {
    if (!selected || selected.fulfillment_status === 'delivered') return
    setFulfillmentNotes(buildFulfillmentNotes(selected, deliveredTo, itemsDelivered))
  }, [selected, deliveredTo, itemsDelivered])

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
      background: #0a0b0d;
      color: #eee9df;
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

  const openFulfillmentEvidence = async () => {
    if (!selected?.fulfillment_evidence_path) return
    const evidenceWindow = window.open('about:blank', '_blank')
    if (!evidenceWindow) return setSaveMessage('Allow pop-ups and try again.')
    const { data, error } = await supabase.storage.from('payment-receipts').createSignedUrl(selected.fulfillment_evidence_path, 300)
    if (error || !data?.signedUrl) { evidenceWindow.close(); return setSaveMessage(error?.message ?? 'Unable to open fulfillment evidence.') }
    evidenceWindow.location.replace(data.signedUrl)
  }

  const markDelivered = async () => {
    if (!selected || selected.fulfillment_status === 'delivered') return
    if (!paymentVerified) return setSaveMessage('Verify the payment before marking this package delivered.')
    if (selected.payment_method === 'paypal' && !paypalTransactionId.trim()) return setSaveMessage('PayPal Transaction ID is required before delivery.')
    if (!deliveredTo.trim()) return setSaveMessage('Enter the player/account that received the package.')
    if (!itemsDelivered.trim()) return setSaveMessage('Enter the items or package that was delivered.')
    if (!fulfillmentEvidence) return setSaveMessage('Upload the original backend ledger screenshot before marking this package delivered.')
    setSaving(true); setSaveMessage('Uploading fulfillment evidence…')
    const safeName = fulfillmentEvidence.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const evidencePath = `fulfillment/${selected.reference_code}/${Date.now()}-${safeName}`
    const upload = await supabase.storage.from('payment-receipts').upload(evidencePath, fulfillmentEvidence, { upsert: false, contentType: fulfillmentEvidence.type })
    if (upload.error) { setSaving(false); return setSaveMessage(upload.error.message) }
    const now = new Date().toISOString()
    const { data, error } = await supabase.from('donations').update({
      paypal_transaction_id: paypalTransactionId.trim() || null,
      payment_verified_at: selected.payment_verified_at ?? now,
      fulfillment_status: 'delivered', fulfilled_at: now,
      fulfillment_notes: fulfillmentNotes.trim() || null,
      delivered_to: deliveredTo.trim(),
      items_delivered: itemsDelivered.trim(),
      // Do not manually transcribe the backend timestamp. The original ledger screenshot is the source of truth.
      backend_ledger_timestamp: null,
      fulfillment_evidence_path: evidencePath,
      fulfillment_evidence_name: fulfillmentEvidence.name,
      fulfillment_evidence_mime_type: fulfillmentEvidence.type,
      fulfillment_evidence_size_bytes: fulfillmentEvidence.size,
      fulfilled_by: session?.user.email ?? session?.user.id ?? 'admin',
      status: 'approved',
    }).eq('id', selected.id).select('*').single()
    setSaving(false)
    if (error) return setSaveMessage(error.message)
    const updated = data as DonationRecord
    setSelected(updated); setStatus(updated.status)
    setDonations(current => current.map(item => item.id === updated.id ? updated : item))
    setFulfillmentEvidence(null); setSaveMessage('Package marked as delivered. Fulfillment evidence is now locked.')
  }

  const downloadEvidencePdf = async () => {
    if (!selected) return
    if (selected.fulfillment_status !== 'delivered') return setSaveMessage('Mark the package as delivered before downloading the evidence PDF.')
    setGeneratingEvidencePdf(true)
    setSaveMessage('Building evidence PDF…')
    try {
      const rows: Array<[string, string]> = [
        ['PlayCrows Reference', selected.reference_code],
        ['Submitted', formatDate(selected.created_at)],
        ['Player ID', selected.player_id],
        ['Character / Username', selected.username],
        ['Payment Method', PAYMENT_LABELS[selected.payment_method]],
        ['Amount', formatMoney(selected.currency, selected.amount)],
        ['PayPal Transaction ID', selected.paypal_transaction_id ?? 'Not recorded'],
        ['Payment Verified', selected.payment_verified_at ? formatDate(selected.payment_verified_at) : 'No'],
        ['Package', getPackageDisplayName(selected)],
        ['Quantity', String(selected.package_quantity ?? 1)],
        ['Fulfillment Status', 'DELIVERED'],
        ['Delivered At', selected.fulfilled_at ? formatDate(selected.fulfilled_at) : 'Not recorded'],
        ['Processed By', selected.fulfilled_by ?? 'Admin'],
        ['Delivered To', selected.delivered_to ?? 'Not recorded'],
        ['Items Delivered', selected.items_delivered ?? 'Not recorded'],
        ['Backend Ledger Timestamp', 'Shown in the original attached backend evidence image'],
        ['Fulfillment Notes', selected.fulfillment_notes ?? 'None'],
        ['Payment Receipt File', selected.receipt_original_name ?? 'Not recorded'],
        ['Backend Evidence File', selected.fulfillment_evidence_name ?? 'Not recorded'],
      ]
      const pages: EvidencePdfPage[] = [
        makeSummaryEvidencePage(
          'PlayCrows Transaction & Fulfillment Evidence',
          'Administrative record for a digital-goods transaction. Original uploaded files remain stored privately in PlayCrows; image evidence is reproduced below for convenient dispute submission.',
          rows
        ),
      ]

      const signedPaths = [
        { kind: 'receipt', path: selected.receipt_path, mime: selected.receipt_mime_type, name: selected.receipt_original_name },
        { kind: 'ledger', path: selected.fulfillment_evidence_path, mime: selected.fulfillment_evidence_mime_type, name: selected.fulfillment_evidence_name },
      ] as const

      for (const evidence of signedPaths) {
        if (!evidence.path || !evidence.mime?.startsWith('image/')) continue
        const { data, error } = await supabase.storage.from('payment-receipts').createSignedUrl(evidence.path, 300)
        if (error || !data?.signedUrl) throw new Error(error?.message ?? `Unable to load ${evidence.kind} evidence.`)
        const image = await blobUrlToImage(data.signedUrl)
        pages.push(makeImageEvidencePage(
          evidence.kind === 'receipt' ? 'Payment Receipt' : 'Backend Delivery Evidence',
          image,
          evidence.name ?? (evidence.kind === 'receipt' ? 'Original payment receipt' : 'Original backend ledger screenshot')
        ))
      }

      const pdf = buildImageOnlyPdf(pages)
      const blob = new Blob([pdf.buffer as ArrayBuffer], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `PlayCrows-Evidence-${selected.reference_code}.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
      const omittedPdf = signedPaths.filter(item => item.path && item.mime === 'application/pdf').map(item => item.kind)
      setSaveMessage(omittedPdf.length ? `Evidence PDF downloaded. Stored ${omittedPdf.join(' and ')} PDF files are referenced in the report but cannot be embedded by the browser generator.` : 'Evidence PDF downloaded with the stored image evidence embedded.')
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Unable to generate the evidence PDF.')
    } finally {
      setGeneratingEvidencePdf(false)
    }
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
        paypal_transaction_id: selected.fulfillment_status === 'delivered' ? selected.paypal_transaction_id : (paypalTransactionId.trim() || null),
        payment_verified_at: selected.fulfillment_status === 'delivered' ? selected.payment_verified_at : (paymentVerified ? (selected.payment_verified_at ?? new Date().toISOString()) : null),
        fulfillment_notes: selected.fulfillment_status === 'delivered' ? selected.fulfillment_notes : (fulfillmentNotes.trim() || null),
        delivered_to: selected.fulfillment_status === 'delivered' ? selected.delivered_to : (deliveredTo.trim() || null),
        items_delivered: selected.fulfillment_status === 'delivered' ? selected.items_delivered : (itemsDelivered.trim() || null),
      })
      .eq('id', selected.id)
      .select(
        'id, reference_code, created_at, player_id, username, currency, amount, selected_package_amount, selected_package_id, selected_package_title, package_quantity, additional_notes, payment_method, receipt_path, receipt_original_name, receipt_mime_type, receipt_size_bytes, status, admin_notes, discord_message_id, paypal_transaction_id, payment_verified_at, fulfillment_status, fulfilled_at, fulfillment_notes, delivered_to, items_delivered, backend_ledger_timestamp, fulfillment_evidence_path, fulfillment_evidence_name, fulfillment_evidence_mime_type, fulfillment_evidence_size_bytes, fulfilled_by'
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
      <div className="flex min-h-screen items-center justify-center bg-[#0a0b0d] text-sm text-[#8f8b84]">
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
    <div className="min-h-screen bg-[#0a0b0d] text-[#eee9df]">
      <header className="border-b border-[#171a20] bg-[#0a0b0d]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#c9aa68]">
              PlayCrows
            </div>
            <h1 className="mt-1 text-xl font-bold">Donation Admin Dashboard</h1>
            <div className="mt-1 text-xs text-[#77746e]">{session.user.email}</div>
          </div>

          <div className="flex gap-2">
            <a
              href="/"
              className="inline-flex min-h-10 items-center rounded-lg border border-[#3b414b] px-4 text-xs font-bold text-[#d7d2c8] hover:border-[#c9aa68]/60 hover:text-[#c9aa68]"
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
                  ? 'border-[#c9aa68] bg-[#c9aa68]/5'
                  : 'border-[#292d34] bg-[#111318] hover:border-[#3b414b]'
              }`}
            >
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#77746e]">
                {label}
              </div>
              <div className="mt-1 text-2xl font-bold text-[#eee9df]">{count}</div>
            </button>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3 rounded-xl border border-[#292d34] bg-[#111318] p-4 sm:flex-row">
          <input
            type="search"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search reference, player, package, or payment method"
            className="min-h-11 flex-1 rounded-lg border border-[#3b414b] bg-[#0d0f13] px-3 text-sm outline-none focus:border-[#c9aa68]"
          />
          <button
            type="button"
            onClick={() => void loadDonations()}
            disabled={loading}
            className="min-h-11 rounded-lg border border-[#c9aa68]/50 bg-[#c9aa68]/10 px-4 text-xs font-bold text-[#c9aa68] hover:bg-[#c9aa68]/20 disabled:opacity-60"
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {loadError && (
          <div className="mt-4 rounded-lg border border-[#ef4444]/35 bg-[#ef4444]/5 px-4 py-3 text-xs text-[#ef4444]">
            {loadError}
          </div>
        )}

        <div className="mt-6 overflow-hidden rounded-xl border border-[#292d34] bg-[#111318]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] table-fixed border-collapse text-left">
              <thead className="bg-[#171a20] text-[10px] uppercase tracking-widest text-[#8f8b84]">
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
                  <tr key={donation.id} className="border-t border-[#292d34] text-sm">
                    <td className="px-4 py-4 font-mono text-xs text-[#c9aa68]">
                      {donation.reference_code}
                    </td>
                    <td className="px-4 py-4 text-xs text-[#aaa49a]">
                      <div>{formatTableDate(donation.created_at).date}</div>
                      <div className="mt-1 text-[10px] text-[#77746e]">
                        {formatTableDate(donation.created_at).time}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-semibold text-[#eee9df]">{donation.username}</div>
                      <div className="mt-1 text-xs text-[#77746e]">{donation.player_id}</div>
                    </td>
                    <td className="px-3 py-4">
                      <PackageCategoryBadge packageId={donation.selected_package_id} />
                    </td>
                    <td className="px-3 py-4">
                      <div className="truncate font-semibold text-[#eee9df]">
                        {getPackageDisplayName(donation)}
                      </div>
                      <div className="mt-1 truncate font-mono text-[9px] text-[#77746e]">
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
                        className="whitespace-nowrap rounded-lg border border-[#3b414b] px-3 py-2 text-xs font-bold hover:border-[#c9aa68] hover:text-[#c9aa68]"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}

                {!loading && filteredDonations.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-sm text-[#77746e]">
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
          <div className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl border border-[#3b414b] bg-[#111318] sm:rounded-2xl">
            <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-[#292d34] bg-[#111318] px-5 py-4">
              <div>
                <div className="font-mono text-sm font-bold text-[#c9aa68]">{selected.reference_code}</div>
                <div className="mt-1 text-xs text-[#77746e]">{formatDate(selected.created_at)}</div>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="h-9 w-9 rounded-lg border border-[#3b414b] text-lg text-[#aaa49a] hover:text-white"
                aria-label="Close review"
              >
                ×
              </button>
            </div>

            <div className="grid gap-6 p-5 lg:grid-cols-2">
              <div>
                <h2 className="text-sm font-bold">Submission Details</h2>
                <div className="mt-3 rounded-xl border border-[#292d34] bg-[#0d0f13] px-4">
                  <DetailRow label="Player ID" value={selected.player_id} />
                  <DetailRow label="Username" value={selected.username} />
                  <DetailRow label="Amount" value={formatMoney(selected.currency, selected.amount)} />
                  <div className="border-b border-[#292d34] py-3">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-[#77746e]">
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
                  className="mt-4 min-h-11 w-full rounded-lg border border-[#c9aa68]/50 bg-[#c9aa68]/10 px-4 text-sm font-bold text-[#c9aa68] hover:bg-[#c9aa68]/20"
                >
                  Open Private Receipt
                </button>
              </div>

              <div>
                <h2 className="text-sm font-bold">Admin Review</h2>

                <label className="mt-3 block">
                  <span className="text-xs font-semibold text-[#aaa49a]">Status</span>
                  <select
                    value={status}
                    onChange={event => setStatus(event.target.value as DonationStatus)}
                    className="mt-2 min-h-11 w-full rounded-lg border border-[#3b414b] bg-[#0d0f13] px-3 text-sm outline-none focus:border-[#c9aa68]"
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </label>

                <div className="mt-4 rounded-xl border border-[#3b414b] bg-[#0d0f13] p-4">
                  <div className="flex items-center justify-between gap-3"><span className="text-xs font-bold uppercase tracking-widest text-[#c9aa68]">Payment & Fulfillment Evidence</span><span className={`rounded-full border px-2 py-1 text-[9px] font-bold ${selected.fulfillment_status === 'delivered' ? 'border-[#22c55e]/40 text-[#22c55e]' : 'border-[#77746e]/40 text-[#aaa49a]'}`}>{selected.fulfillment_status === 'delivered' ? 'DELIVERED' : 'NOT DELIVERED'}</span></div>
                  {selected.payment_method === 'paypal' && <label className="mt-4 block"><span className="text-xs text-[#aaa49a]">PayPal Transaction ID</span><input value={paypalTransactionId} disabled={selected.fulfillment_status === 'delivered'} onChange={e => setPaypalTransactionId(e.target.value)} placeholder="Enter the transaction ID from PayPal" className="mt-2 min-h-11 w-full rounded-lg border border-[#3b414b] bg-[#11141a] px-3 text-sm outline-none disabled:opacity-60" /></label>}
                  <label className="mt-4 flex items-center gap-2 text-xs text-[#aaa49a]"><input type="checkbox" checked={paymentVerified} disabled={selected.fulfillment_status === 'delivered'} onChange={e => setPaymentVerified(e.target.checked)} /> Payment independently verified in the payment provider</label>
                  <label className="mt-4 block"><span className="text-xs text-[#aaa49a]">Delivered To (Player / Account)</span><input value={deliveredTo} disabled={selected.fulfillment_status === 'delivered'} onChange={e => setDeliveredTo(e.target.value)} placeholder="e.g. rkdchfl89" className="mt-2 min-h-11 w-full rounded-lg border border-[#3b414b] bg-[#11141a] px-3 text-sm outline-none disabled:opacity-60" /></label>
                  <label className="mt-4 block"><span className="text-xs text-[#aaa49a]">Items Delivered</span><input value={itemsDelivered} disabled={selected.fulfillment_status === 'delivered'} onChange={e => setItemsDelivered(e.target.value)} placeholder="Enter exactly what you delivered (e.g. 210,000 Diamonds, JOB ADVANCE PACKAGE contents, etc.)" className="mt-2 min-h-11 w-full rounded-lg border border-[#3b414b] bg-[#11141a] px-3 text-sm outline-none disabled:opacity-60" /></label>
                  <label className="mt-4 block"><span className="text-xs text-[#aaa49a]">Fulfillment Notes</span><textarea value={fulfillmentNotes} disabled={selected.fulfillment_status === 'delivered'} onChange={e => setFulfillmentNotes(e.target.value)} rows={3} placeholder="Automatically generated from Items Delivered and backend ledger context…" className="mt-2 w-full rounded-lg border border-[#3b414b] bg-[#11141a] p-3 text-sm disabled:opacity-60" /></label>
                  {selected.fulfillment_status !== 'delivered' ? <><div className="mt-4"><span className="text-xs text-[#aaa49a]">Backend Ledger Screenshot (required)</span><div className="mt-1 text-[11px] leading-4 text-[#77746e]">Upload the original screenshot exactly as shown in the backend. Its visible timestamp is treated as the backend source timestamp; no manual timestamp entry is required.</div><label className="mt-2 flex min-h-12 cursor-pointer items-center justify-center rounded-lg border border-dashed border-[#c9aa68]/60 bg-[#c9aa68]/5 px-4 text-sm font-semibold text-[#c9aa68] hover:bg-[#c9aa68]/10"><input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={e => setFulfillmentEvidence(e.target.files?.[0] ?? null)} className="sr-only" />{fulfillmentEvidence ? `Selected: ${fulfillmentEvidence.name}` : 'Upload Backend Ledger Screenshot'}</label>{fulfillmentEvidence && <div className="mt-2 text-[11px] text-[#aaa49a]">Evidence ready to upload when you mark the package as delivered.</div>}</div><button type="button" disabled={saving} onClick={() => void markDelivered()} className="mt-4 min-h-11 w-full rounded-lg border border-[#22c55e]/50 bg-[#22c55e]/10 px-4 text-sm font-bold text-[#22c55e] hover:bg-[#22c55e]/20 disabled:opacity-60">Mark Package as Delivered & Lock Evidence</button></> : <div className="mt-4 space-y-2 text-xs text-[#aaa49a]"><div>Delivered: {selected.fulfilled_at ? formatDate(selected.fulfilled_at) : 'Recorded'}</div><div>Processed by: {selected.fulfilled_by ?? 'Admin'}</div><button type="button" onClick={() => void openFulfillmentEvidence()} className="min-h-10 w-full rounded-lg border border-[#3b414b] px-3 font-semibold text-[#eee9df]">Open Backend Delivery Evidence</button><button type="button" disabled={generatingEvidencePdf} onClick={() => void downloadEvidencePdf()} className="min-h-10 w-full rounded-lg border border-[#c9aa68]/50 px-3 font-bold text-[#c9aa68] disabled:opacity-60">{generatingEvidencePdf ? 'Building Evidence PDF…' : 'Download Evidence PDF'}</button></div>}
                </div>

                <label className="mt-4 block">
                  <span className="text-xs font-semibold text-[#aaa49a]">Internal Notes</span>
                  <textarea
                    value={notes}
                    onChange={event => setNotes(event.target.value)}
                    rows={8}
                    placeholder="Add verification details or rejection reason…"
                    className="mt-2 w-full resize-y rounded-lg border border-[#3b414b] bg-[#0d0f13] p-3 text-sm leading-6 outline-none focus:border-[#c9aa68]"
                  />
                </label>

                {saveMessage && (
                  <div className="mt-4 rounded-lg border border-[#3b414b] bg-[#0d0f13] px-3 py-3 text-xs leading-5 text-[#aaa49a]">
                    {saveMessage}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => void saveReview()}
                  disabled={saving}
                  className="mt-4 min-h-11 w-full rounded-lg bg-[#c9aa68] px-4 text-sm font-bold text-[#16120b] hover:bg-[#e1c88d] disabled:opacity-60"
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