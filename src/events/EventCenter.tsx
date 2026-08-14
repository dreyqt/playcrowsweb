import { useEffect, useMemo, useState } from 'react'
import CrowLogo from '../assets/playcrows-icon.jpg'
import { supabase } from '../lib/supabase'
import type { EventFormField, EventSubmission, PlayCrowsEvent } from './types'

const dateLabel = (value: string | null) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

const statusBadge = (status: PlayCrowsEvent['status']) =>
  status === 'active'
    ? 'border-[#22c55e]/40 bg-[#22c55e]/10 text-[#22c55e]'
    : status === 'ended'
      ? 'border-[#77746e]/40 bg-[#77746e]/10 text-[#aaa49a]'
      : 'border-[#d3ad62]/40 bg-[#d3ad62]/10 text-[#d3ad62]'

function PublicHeader() {
  return <header className="sticky top-0 z-50 border-b border-[#171a20] bg-[#0a0b0d]"><div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4">
    <a href="/events" className="flex min-w-0 items-center gap-3 no-underline"><img src={CrowLogo} alt="PlayCrows logo" className="h-10 w-10 rounded-full object-cover" /><div><div className="text-base font-bold leading-tight text-[#eee9df]">PLAYCROWS</div><div className="text-[10px] uppercase tracking-[0.18em] text-[#77746e]">Event Center</div></div></a>
    <nav className="flex items-center gap-2 text-xs font-bold"><a href="/" className="rounded-lg border border-[#292d34] px-3 py-2 text-[#aaa49a] no-underline hover:border-[#c9aa68] hover:text-[#c9aa68]">Web Shop</a><a href="/events" className="rounded-lg border border-[#c9aa68]/50 bg-[#c9aa68]/10 px-3 py-2 text-[#c9aa68] no-underline">Events</a></nav>
  </div></header>
}

function EmptyState({ message }: { message: string }) {
  return <div className="rounded-2xl border border-[#292d34] bg-[#111318] px-6 py-14 text-center text-sm text-[#77746e]">{message}</div>
}

function EventList() {
  const [events, setEvents] = useState<PlayCrowsEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { void (async () => {
    const { data, error: loadError } = await supabase.from('events').select('*').in('status', ['active', 'ended']).not('published_at', 'is', null).order('published_at', { ascending: false })
    if (loadError) setError(loadError.message); else setEvents((data ?? []) as PlayCrowsEvent[])
    setLoading(false)
  })() }, [])

  return <div className="min-h-screen bg-[#0a0b0d] text-[#eee9df]"><PublicHeader /><main className="mx-auto max-w-5xl px-4 py-10">
    <section className="mb-9 overflow-hidden rounded-2xl border border-[#c9aa68]/25 bg-[#111318] p-6 sm:p-8"><div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#c9aa68]">PlayCrows Community</div><h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Event Center</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#8f8b84]">View active events, read the requirements, submit your claim, and check event results in one place.</p></section>
    {loading && <EmptyState message="Loading events…" />}{error && <EmptyState message={`Unable to load events: ${error}`} />}{!loading && !error && events.length === 0 && <EmptyState message="No published events are available yet." />}
    <div className="grid gap-5 md:grid-cols-2">{events.map(event => <a key={event.id} href={`/events/${encodeURIComponent(event.slug)}`} className="group rounded-2xl border border-[#292d34] bg-[#111318] p-6 text-inherit no-underline transition hover:-translate-y-0.5 hover:border-[#c9aa68]/50">
      <div className="flex items-start justify-between gap-4"><div><div className="text-xs font-bold uppercase tracking-[0.15em] text-[#c9aa68]">Event #{event.event_number}</div><h2 className="mt-2 text-xl font-bold group-hover:text-[#e1c88d]">{event.title}</h2></div><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${statusBadge(event.status)}`}>{event.status}</span></div>
      <p className="mt-4 min-h-12 text-sm leading-6 text-[#8f8b84]">{event.short_description || event.description || 'Open this event to view the full mechanics and rewards.'}</p><div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-[#292d34] pt-4 text-xs text-[#77746e]">{dateLabel(event.starts_at) && <span>Starts: {dateLabel(event.starts_at)}</span>}{dateLabel(event.ends_at) && <span>Ends: {dateLabel(event.ends_at)}</span>}</div>
    </a>)}</div>
  </main></div>
}

function SubmissionForm({ event }: { event: PlayCrowsEvent }) {
  const [discord, setDiscord] = useState(''); const [character, setCharacter] = useState(''); const [playerId, setPlayerId] = useState('')
  const [answers, setAnswers] = useState<Record<string, string>>({}); const [submitting, setSubmitting] = useState(false); const [error, setError] = useState(''); const [reference, setReference] = useState('')
  const updateAnswer = (field: EventFormField, value: string) => setAnswers(current => ({ ...current, [field.id]: value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (submitting) return; setError('')
    if (!discord.trim()) return setError('Discord username is required.')
    for (const field of event.form_fields ?? []) if (field.required && !String(answers[field.id] ?? '').trim()) return setError(`${field.label} is required.`)
    setSubmitting(true)
    const { data, error: submitError } = await supabase.rpc('submit_event_claim', { p_event_id: event.id, p_discord_username: discord.trim(), p_character_name: character.trim() || null, p_player_id: playerId.trim() || null, p_answers: answers })
    setSubmitting(false); if (submitError) return setError(submitError.message)
    const result = Array.isArray(data) ? data[0] : data; setReference(result?.reference_code ?? '')
  }

  if (reference) return <div className="rounded-2xl border border-[#22c55e]/30 bg-[#22c55e]/5 p-6 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#22c55e]/40 text-2xl text-[#22c55e]">✓</div><h3 className="mt-4 text-xl font-bold">Claim Submitted</h3><p className="mt-2 text-sm text-[#8f8b84]">Your claim is now pending review. Save your reference code.</p><div className="mt-4 rounded-xl border border-[#c9aa68]/25 bg-black/20 p-4 font-mono text-lg font-bold text-[#c9aa68]">{reference}</div></div>

  const inputClass = 'mt-2 w-full rounded-lg border border-[#292d34] bg-[#0d0f12] px-3 py-3 text-sm font-normal text-[#eee9df] outline-none focus:border-[#c9aa68]'
  return <form onSubmit={submit} className="rounded-2xl border border-[#292d34] bg-[#111318] p-5 sm:p-6"><div className="mb-5"><div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#c9aa68]">Submit Claim</div><h3 className="mt-2 text-xl font-bold">Event #{event.event_number}</h3></div>
    <div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold text-[#aaa49a]">Discord Username *<input value={discord} onChange={e => setDiscord(e.target.value)} className={inputClass} placeholder="yourname" /></label><label className="text-xs font-bold text-[#aaa49a]">Character Name<input value={character} onChange={e => setCharacter(e.target.value)} className={inputClass} /></label><label className="text-xs font-bold text-[#aaa49a] sm:col-span-2">Player ID / UID<input value={playerId} onChange={e => setPlayerId(e.target.value)} className={inputClass} /></label></div>
    <div className="mt-4 grid gap-4">{(event.form_fields ?? []).map(field => <label key={field.id} className="text-xs font-bold text-[#aaa49a]">{field.label}{field.required ? ' *' : ''}{field.type === 'textarea' ? <textarea rows={4} value={answers[field.id] ?? ''} onChange={e => updateAnswer(field, e.target.value)} placeholder={field.placeholder} className={`${inputClass} resize-y`} /> : <input type={field.type === 'url' ? 'url' : 'text'} value={answers[field.id] ?? ''} onChange={e => updateAnswer(field, e.target.value)} placeholder={field.placeholder} className={inputClass} />}{field.helpText && <span className="mt-1 block font-normal leading-5 text-[#77746e]">{field.helpText}</span>}</label>)}</div>
    {error && <div className="mt-4 rounded-lg border border-[#ef4444]/30 bg-[#ef4444]/8 px-3 py-2 text-xs text-[#ef4444]">{error}</div>}<button disabled={submitting} className="mt-5 w-full rounded-lg border border-[#c9aa68] bg-[#c9aa68] px-4 py-3 text-sm font-extrabold text-[#17120a] hover:bg-[#e1c88d] disabled:opacity-60">{submitting ? 'Submitting…' : 'Submit Event Claim'}</button>
  </form>
}

function ClaimStatusLookup() {
  const [reference, setReference] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ reference_code: string; event_number: string; event_title: string; discord_username: string; status: string; rejection_reason: string | null; reward_sent_at: string | null; updated_at: string } | null>(null)
  const [message, setMessage] = useState('')
  const lookup = async () => {
    if (!reference.trim()) return setMessage('Enter your claim reference code.')
    setLoading(true); setMessage(''); setResult(null)
    const { data, error } = await supabase.rpc('get_event_claim_status', { p_reference_code: reference.trim() })
    setLoading(false)
    if (error) return setMessage(error.message)
    const row = Array.isArray(data) ? data[0] : data
    if (!row) return setMessage('No claim was found with that reference code.')
    setResult(row)
  }
  const statusClass = result?.status === 'approved' ? 'text-[#22c55e]' : result?.status === 'rejected' ? 'text-[#ef4444]' : 'text-[#d3ad62]'
  return <div className="rounded-2xl border border-[#292d34] bg-[#111318] p-6"><h2 className="text-lg font-bold">🔎 Check Claim Status</h2><p className="mt-2 text-sm text-[#77746e]">Enter the reference code you received after submitting your claim.</p><div className="mt-4 flex flex-col gap-2 sm:flex-row"><input value={reference} onChange={e => setReference(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void lookup() }} placeholder="EV-XXXXXXXXXX" className="min-h-11 flex-1 rounded-lg border border-[#292d34] bg-[#0d0f12] px-3 font-mono text-sm outline-none focus:border-[#c9aa68]" /><button onClick={() => void lookup()} disabled={loading} className="rounded-lg bg-[#c9aa68] px-5 py-3 text-xs font-bold text-[#17120a]">{loading ? 'Checking…' : 'Check Status'}</button></div>{message && <div className="mt-4 text-xs text-[#aaa49a]">{message}</div>}{result && <div className="mt-5 rounded-xl border border-[#292d34] bg-black/20 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><div className="text-[10px] uppercase tracking-widest text-[#77746e]">Event #{result.event_number}</div><div className="mt-1 font-bold">{result.event_title}</div></div><div className={`text-sm font-extrabold uppercase ${statusClass}`}>{result.status === 'approved' ? '✅ Approved · Reward Sent' : result.status === 'rejected' ? '❌ Rejected' : '⏳ Pending Review'}</div></div><div className="mt-4 grid gap-2 text-xs text-[#aaa49a] sm:grid-cols-2"><div>Discord: <strong className="text-[#eee9df]">{result.discord_username}</strong></div><div>Reference: <strong className="font-mono text-[#c9aa68]">{result.reference_code}</strong></div></div>{result.rejection_reason && <div className="mt-4 rounded-lg border border-[#ef4444]/25 bg-[#ef4444]/5 px-3 py-2 text-xs text-[#ef4444]">Reason: {result.rejection_reason}</div>}</div>}</div>
}

function Results({ eventId }: { eventId: string }) {
  const [rows, setRows] = useState<EventSubmission[]>([])
  useEffect(() => { void (async () => { const { data } = await supabase.from('event_public_results').select('*').eq('event_id', eventId).order('updated_at', { ascending: false }); setRows((data ?? []) as EventSubmission[]) })() }, [eventId])
  const approved = rows.filter(row => row.status === 'approved'); const rejected = rows.filter(row => row.status === 'rejected')
  if (!rows.length) return <p className="text-sm text-[#77746e]">No reviewed claims have been published yet.</p>
  return <div className="grid gap-5 md:grid-cols-2"><div className="rounded-xl border border-[#22c55e]/25 bg-[#22c55e]/5 p-5"><h3 className="font-bold text-[#22c55e]">🟢 Approved · Rewards Sent</h3><div className="mt-4 space-y-2 text-sm">{approved.length ? approved.map(row => <div key={row.id}>✅ {row.discord_username}</div>) : <div className="text-[#77746e]">No approved claims yet.</div>}</div></div><div className="rounded-xl border border-[#ef4444]/25 bg-[#ef4444]/5 p-5"><h3 className="font-bold text-[#ef4444]">🔴 Rejected Claims</h3><div className="mt-4 space-y-3 text-sm">{rejected.length ? rejected.map(row => <div key={row.id}><div>❌ {row.discord_username}</div>{row.rejection_reason && <div className="ml-5 mt-1 text-xs text-[#9f9890]">{row.rejection_reason}</div>}</div>) : <div className="text-[#77746e]">No rejected claims yet.</div>}</div></div></div>
}

function EventDetail({ slug }: { slug: string }) {
  const [event, setEvent] = useState<PlayCrowsEvent | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [tab, setTab] = useState<'details' | 'results' | 'status'>('details')
  useEffect(() => { void (async () => { const { data, error: loadError } = await supabase.from('events').select('*').eq('slug', slug).in('status', ['active', 'ended']).not('published_at', 'is', null).maybeSingle(); if (loadError) setError(loadError.message); else setEvent(data as PlayCrowsEvent | null); setLoading(false) })() }, [slug])
  const canSubmit = useMemo(() => { if (!event || event.status !== 'active') return false; const now = Date.now(); if (event.starts_at && new Date(event.starts_at).getTime() > now) return false; if (event.ends_at && new Date(event.ends_at).getTime() < now) return false; return true }, [event])
  return <div className="min-h-screen bg-[#0a0b0d] text-[#eee9df]"><PublicHeader /><main className="mx-auto max-w-5xl px-4 py-8 sm:py-10"><a href="/events" className="text-xs font-bold text-[#c9aa68] no-underline">← All Events</a>{loading && <div className="mt-6"><EmptyState message="Loading event…" /></div>}{error && <div className="mt-6"><EmptyState message={`Unable to load event: ${error}`} /></div>}{!loading && !event && <div className="mt-6"><EmptyState message="This event could not be found or is not published." /></div>}
    {event && <><section className="mt-5 rounded-2xl border border-[#c9aa68]/25 bg-[#111318] p-6 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="text-xs font-bold uppercase tracking-[0.18em] text-[#c9aa68]">Event #{event.event_number}</div><h1 className="mt-2 text-3xl font-extrabold">{event.title}</h1></div><span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase ${statusBadge(event.status)}`}>{event.status}</span></div>{event.description && <p className="mt-5 max-w-3xl whitespace-pre-line text-sm leading-7 text-[#aaa49a]">{event.description}</p>}<div className="mt-5 flex flex-wrap gap-4 text-xs text-[#77746e]">{dateLabel(event.starts_at) && <span>Starts: {dateLabel(event.starts_at)}</span>}{dateLabel(event.ends_at) && <span>Ends: {dateLabel(event.ends_at)}</span>}</div></section>
      <div className="mt-6 flex gap-2 rounded-xl border border-[#292d34] bg-[#0f1115] p-1"><button onClick={() => setTab('details')} className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold ${tab === 'details' ? 'bg-[#c9aa68]/12 text-[#c9aa68]' : 'text-[#77746e]'}`}>Mechanics & Claim</button><button onClick={() => setTab('results')} className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold ${tab === 'results' ? 'bg-[#c9aa68]/12 text-[#c9aa68]' : 'text-[#77746e]'}`}>Results</button><button onClick={() => setTab('status')} className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold ${tab === 'status' ? 'bg-[#c9aa68]/12 text-[#c9aa68]' : 'text-[#77746e]'}`}>Check Claim</button></div>
      {tab === 'details' ? <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.92fr]"><div className="space-y-6"><section className="rounded-2xl border border-[#292d34] bg-[#111318] p-6"><h2 className="text-lg font-bold">📌 Mechanics</h2><ol className="mt-4 space-y-3 text-sm leading-6 text-[#aaa49a]">{(event.mechanics ?? []).map((item, i) => <li key={i} className="flex gap-3"><span className="font-bold text-[#c9aa68]">{i + 1}.</span><span>{item}</span></li>)}</ol></section><section className="rounded-2xl border border-[#292d34] bg-[#111318] p-6"><h2 className="text-lg font-bold">🎁 Rewards</h2><div className="mt-4 space-y-2 text-sm text-[#aaa49a]">{(event.rewards ?? []).map((item, i) => <div key={i}>◆ {item}</div>)}</div></section></div><div>{canSubmit ? <SubmissionForm event={event} /> : <div className="rounded-2xl border border-[#292d34] bg-[#111318] p-6 text-center"><div className="text-2xl">🔒</div><h3 className="mt-3 font-bold">Submissions Closed</h3><p className="mt-2 text-sm text-[#77746e]">This event is not currently accepting claims.</p></div>}</div></div> : tab === 'results' ? <div className="mt-6"><Results eventId={event.id} /></div> : <div className="mt-6"><ClaimStatusLookup /></div>}</>}
  </main></div>
}

export function EventCenter() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/events'
  const match = path.match(/^\/events\/([^/]+)$/)
  return match ? <EventDetail slug={decodeURIComponent(match[1])} /> : <EventList />
}
