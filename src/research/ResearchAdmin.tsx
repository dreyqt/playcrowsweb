import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import schema from './schema.json'
import './admin.css'

type ReviewStatus = 'pending' | 'approved' | 'rejected'
type Profile = {
  displayName: string; contact: string; region: string; server: string; characterName: string
  characterClass: string; level: number; playedSince: string; lastPlayed: string
}
type Entry = {
  tableId: string; rowLabel: string; values: string[]; sourceUrl: string
  observedAt: string; certainty: string; notes: string
}
type Submission = {
  id: string; reference: string; status: ReviewStatus; created_at: string
  profile?: Profile; entry_count?: number; reviewed_at?: string | null
  payload?: { profile: Profile; entries: Entry[]; consent: boolean }
  proof_sha256?: string; proof_path?: string; review_notes?: string | null; reviewed_by?: string | null
}
type Invite = { id: string; label: string; created_at: string; expires_at: string; used_at: string | null; revoked_at: string | null }
type Audit = { id: string; created_at: string; status?: string; from_status?: string; to_status?: string; notes: string; reviewed_by?: string; actor_id?: string; reviewer_id?: string }
type Listing = { submissions: Submission[]; invites: Invite[]; nextBefore: string | null; invitesTruncated?: boolean }
type Detail = { submission: Submission; proofUrl: string; reviews: Audit[]; duplicateEvidence?: { id: string; reference: string }[] }

const showDate = (value: string | null | undefined) => value ? new Intl.DateTimeFormat('en-SG', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Singapore',
}).format(new Date(value)) : '—'

function safeHttps(value: string) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null } catch { return null }
}

function Login({ message }: { message: string }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const result = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (result.error) throw result.error
      setPassword('')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to sign in. Please try again.') }
    finally { setBusy(false) }
  }
  return <main className="research-admin ra-login"><form className="ra-panel" onSubmit={submit}>
    <a className="ra-wordmark" href="/">PLAYCROWS</a><p className="ra-eyebrow">Staff access</p>
    <h1>Research review</h1><p className="ra-muted">Sign in with your existing PlayCrows administrator account.</p>
    <label>Email<input required type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} /></label>
    <label>Password<input required type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} /></label>
    {(message || error) && <p className="ra-error" role="alert">{error || message}</p>}
    <button className="ra-primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
    <a className="ra-text-link" href="/research">Back to player research</a>
  </form></main>
}

export default function ResearchAdmin() {
  const [session, setSession] = useState<Session | null>(null)
  const [checking, setChecking] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [authError, setAuthError] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [rows, setRows] = useState<Submission[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [invitesTruncated, setInvitesTruncated] = useState(false)
  const [nextBefore, setNextBefore] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [filter, setFilter] = useState<'all' | ReviewStatus>('pending')
  const [detail, setDetail] = useState<Detail | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [proofError, setProofError] = useState(false)
  const [notes, setNotes] = useState('')
  const [checked, setChecked] = useState(false)
  const [inviteLabel, setInviteLabel] = useState('')
  const [issuedCode, setIssuedCode] = useState('')
  const authVersion = useRef(0)
  const detailVersion = useRef(0)
  const listVersion = useRef(0)
  const selectedRef = useRef<string | null>(null)

  useEffect(() => {
    document.title = 'Research Review | PlayCrows'
    let active = true
    const apply = (current: Session | null) => { if (active) setSession(current) }
    void supabase.auth.getSession().then(({ data, error: failure }) => {
      if (!active) return
      if (failure) { setAuthError('Unable to check your session. Please sign in again.'); setChecking(false) }
      apply(data.session)
      if (!data.session) setChecking(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, current) => apply(current))
    return () => { active = false; data.subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    const version = ++authVersion.current
    setAuthorized(false); setRows([]); setInvites([]); setInvitesTruncated(false); setDetail(null); setSelectedId(null)
    selectedRef.current = null; detailVersion.current++; listVersion.current++
    setIssuedCode(''); setNotes(''); setChecked(false); setNextBefore(null); setLoaded(false)
    setError(''); setMessage(''); setLoading(false); setBusy(false); setDetailLoading(false)
    if (!session) { setChecking(false); return }
    setChecking(true)
    void supabase.from('admin_users').select('user_id').eq('user_id', session.user.id).maybeSingle().then(({ data, error: failure }) => {
      if (version !== authVersion.current) return
      if (failure || !data) { setAuthError('This account does not have research administrator access.'); setChecking(false); return }
      setAuthError(''); setAuthorized(true); setChecking(false)
    })
    return () => { authVersion.current++ }
    // Token refresh preserves the same administrator and loaded review state.
  }, [session?.user.id])

  async function request<T>(body: Record<string, unknown>): Promise<T> {
    const version = authVersion.current
    const current = (await supabase.auth.getSession()).data.session
    if (!current || !authorized) throw new Error('Your administrator session has expired. Please sign in again.')
    const result = await supabase.functions.invoke('research-api', {
      body, headers: { Authorization: `Bearer ${current.access_token}` },
    })
    if (version !== authVersion.current) throw new Error('Your session changed. Please sign in again.')
    if (result.error) {
      let text = result.error.message || 'The request failed. Please try again.'
      try {
        const context = result.error.context
        if (context instanceof Response) {
          const payload = await context.clone().json()
          if (typeof payload.error === 'string') text = payload.error
        }
      } catch { /* Retain the generic transport error. */ }
      throw new Error(text)
    }
    if (result.data?.error) throw new Error(String(result.data.error))
    return result.data as T
  }

  const report = (cause: unknown) => setError(cause instanceof Error ? cause.message : 'Unable to complete the request. Please try again.')

  async function load(before?: string) {
    const version = ++listVersion.current
    setLoading(true); setError('')
    try {
      const result = await request<Listing>({ action: 'list', ...(before ? { before } : {}) })
      if (version !== listVersion.current) return
      setRows(current => before ? [...current, ...result.submissions.filter(item => !current.some(old => old.id === item.id))] : result.submissions)
      setInvites(result.invites); setInvitesTruncated(Boolean(result.invitesTruncated)); setNextBefore(result.nextBefore); setLoaded(true)
    } catch (cause) { if (version === listVersion.current) report(cause) }
    finally { if (version === listVersion.current) setLoading(false) }
  }

  useEffect(() => { if (authorized) void load() }, [authorized])

  async function openDetail(id: string) {
    const version = ++detailVersion.current
    selectedRef.current = id; setSelectedId(id); setDetail(null); setDetailLoading(true)
    setProofError(false); setNotes(''); setChecked(false); setError(''); setMessage('')
    try {
      const result = await request<Detail>({ action: 'detail', id })
      if (version !== detailVersion.current) return
      setDetail(result); setNotes(result.submission.review_notes || '')
    } catch (cause) { if (version === detailVersion.current) report(cause) }
    finally { if (version === detailVersion.current) setDetailLoading(false) }
  }

  async function createInvite(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setMessage(''); setIssuedCode('')
    try {
      const result = await request<{ code: string; invite: Invite }>({ action: 'createInvite', label: inviteLabel.trim() })
      setIssuedCode(result.code); setInvites(current => [result.invite, ...current]); setInviteLabel('')
      setMessage('Invitation created. Copy the code now and share it privately with the player.')
    } catch (cause) { report(cause) }
    finally { setBusy(false) }
  }

  async function revokeInvite(invite: Invite) {
    if (!window.confirm(`Revoke the unused invitation for “${invite.label}”? The player will need a new code.`)) return
    setBusy(true); setError(''); setMessage('')
    try {
      await request({ action: 'revokeInvite', id: invite.id })
      setInvites(current => current.map(item => item.id === invite.id ? { ...item, revoked_at: new Date().toISOString() } : item))
      setIssuedCode(''); setMessage('Invitation revoked.')
    } catch (cause) { report(cause) }
    finally { setBusy(false) }
  }

  async function review(status: ReviewStatus) {
    if (!detail) return
    if (notes.trim().length < 10) { setError('Add at least 10 characters of review notes describing what you checked or why this entry needs changes.'); return }
    if (status === 'approved' && (!checked || proofError || !safeHttps(detail.proofUrl))) { setError('Load the evidence and confirm that you checked the official-server proof and cited sources.'); return }
    const submission = detail.submission
    setBusy(true); setError(''); setMessage('')
    try {
      await request({ action: 'review', id: submission.id, status, notes: notes.trim(), expectedStatus: submission.status, expectedReviewedAt: submission.reviewed_at ?? null, evidenceChecked: checked })
      if (selectedRef.current === submission.id) await openDetail(submission.id)
      setRows(current => current.map(item => item.id === submission.id ? { ...item, status, reviewed_at: new Date().toISOString() } : item))
      setMessage(`Submission ${submission.reference} marked ${status}.`)
    } catch (cause) { report(cause) }
    finally { setBusy(false) }
  }

  function downloadSelected() {
    if (!detail) return
    const output = {
      exportedAt: new Date().toISOString(), reviewStatus: detail.submission.status,
      submission: detail.submission, reviews: detail.reviews,
      researchColumns: schema.tables.filter(table => detail.submission.payload?.entries.some(entry => entry.tableId === table.id)).map(table => ({ id: table.id, title: table.title, columns: table.columns })),
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `PlayCrows-Research-${detail.submission.reference}.json`
    anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
    setMessage('Downloaded this submission and its review history. Keep this file private; it includes player contact details.')
  }

  async function signOut() {
    authVersion.current++; detailVersion.current++; listVersion.current++
    setAuthorized(false); setRows([]); setInvites([]); setDetail(null); setIssuedCode(''); setNotes(''); setChecked(false)
    try { const result = await supabase.auth.signOut(); if (result.error) throw result.error; setSession(null) }
    catch { setAuthError('Sign-out could not be confirmed. Close this tab and sign out from the main admin dashboard.'); setSession(null) }
  }

  if (checking) return <main className="research-admin ra-login"><p role="status">Checking administrator access…</p></main>
  if (!session) return <Login message={authError} />
  if (!authorized) return <main className="research-admin ra-login"><div className="ra-panel"><h1>Administrator access required</h1><p role="alert">{authError}</p><button className="ra-primary" onClick={() => void signOut()}>Sign out and use another account</button><a href="/research">Back to research</a></div></main>

  const visibleRows = rows.filter(item => filter === 'all' || item.status === filter)
  const profile = detail?.submission.payload?.profile
  return <div className="research-admin">
    <header className="ra-header"><div><a className="ra-wordmark" href="/admin">PLAYCROWS <span>ADMIN</span></a><h1>Research review</h1></div>
      <nav aria-label="Administrator navigation"><a href="/admin">Donation admin</a><a href="/admin/events">Event admin</a><a href="/research">Player form ↗</a><button onClick={() => void signOut()}>Sign out</button></nav>
    </header>
    <main className="ra-main">
      <div className="ra-intro"><p className="ra-eyebrow">Official Night Crows · Orb / Cannon / Gauntlets</p><p>Invite experienced players, inspect their evidence, and accept only the research you have checked. Approval is a staff assessment, not automatic proof.</p></div>
      {error && <p className="ra-error ra-banner" role="alert">{error}</p>}
      {message && <p className="ra-notice ra-banner" role="status">{message}</p>}
      <details className="ra-panel ra-invitations">
        <summary>Player invitations <span>{invites.filter(item => !item.used_at && !item.revoked_at && new Date(item.expires_at) > new Date()).length} active in latest list</span></summary>
        <p className="ra-muted">Check the player’s official-server experience through your community first. Each private code permits one submission of up to 30 research entries and expires after 14 days.</p>
        <form className="ra-invite-form" onSubmit={event => void createInvite(event)}><label>Player label / Discord name<input required maxLength={120} value={inviteLabel} onChange={event => setInviteLabel(event.target.value)} placeholder="For your staff records" /></label><button className="ra-primary" disabled={busy || !inviteLabel.trim()}>Create invitation</button></form>
        {issuedCode && <div className="ra-code-box"><p><strong>Copy this code now.</strong> It will not be shown again after leaving this page.</p><code>{issuedCode}</code><div className="ra-actions"><button onClick={() => void navigator.clipboard.writeText(issuedCode).then(() => setMessage('Invitation code copied. Share it privately with the intended player.')).catch(() => setError('Copy was unavailable. Select and copy the code above.'))}>Copy code</button><button onClick={() => setIssuedCode('')}>Hide code</button></div><p>Send the player the form address and this code separately. Never post codes in public channels.</p></div>}
        <div className="ra-invite-list">{invites.map(invite => <div className="ra-invite-row" key={invite.id}><div><strong>{invite.label}</strong><small>Expires {showDate(invite.expires_at)} SGT</small></div><span>{invite.revoked_at ? 'Revoked' : invite.used_at ? 'Used' : new Date(invite.expires_at) <= new Date() ? 'Expired' : 'Active'}</span>{!invite.used_at && !invite.revoked_at && new Date(invite.expires_at) > new Date() && <button disabled={busy} onClick={() => void revokeInvite(invite)}>Revoke</button>}</div>)}</div>
        {invitesTruncated && <p className="ra-notice">Latest 100 invitations shown. Older invitation records are retained privately.</p>}
        {loaded && !invites.length && <p className="ra-muted">No invitations yet. Create one for your first contributor.</p>}
      </details>
      <div className="ra-workspace">
        <aside className="ra-panel ra-queue"><div className="ra-panel-heading"><h2>Submissions</h2><button disabled={loading || busy} onClick={() => void load()}>{loading ? 'Loading…' : 'Refresh'}</button></div>
          <label>Filter loaded submissions<select value={filter} onChange={event => setFilter(event.target.value as typeof filter)}><option value="pending">Pending review</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="all">All statuses</option></select></label>
          <p className="ra-muted ra-small">{rows.length} loaded · Times in Singapore time</p>
          <div className="ra-submission-list">{visibleRows.map(row => <button className={`ra-submission ${selectedId === row.id ? 'ra-selected' : ''}`} aria-pressed={selectedId === row.id} key={row.id} onClick={() => void openDetail(row.id)} disabled={busy}><span className={`ra-status ra-${row.status}`}>{row.status}</span><strong>{row.profile?.displayName || row.reference}</strong><span>{row.profile?.region} · {row.profile?.characterClass} · {row.entry_count ?? '—'} entries</span><small>{showDate(row.created_at)}</small><code>{row.reference}</code></button>)}</div>
          {loaded && !visibleRows.length && <p className="ra-empty">No {filter === 'all' ? '' : filter} submissions in the loaded results.</p>}
          {nextBefore && <button className="ra-load-more" disabled={loading || busy} onClick={() => void load(nextBefore)}>Load older submissions</button>}
        </aside>
        <section className="ra-detail" aria-live="polite" aria-busy={detailLoading}>
          {detailLoading && <div className="ra-panel ra-empty" role="status">Loading the submission and private evidence…</div>}
          {!detailLoading && !detail && <div className="ra-panel ra-empty"><span className="ra-empty-icon" aria-hidden="true">◇</span><h2>Select a submission</h2><p>Player details, the original screenshot, research entries, and review history will appear here.</p>{selectedId && <button onClick={() => void openDetail(selectedId)}>Retry loading</button>}</div>}
          {detail && profile && <>
            <article className="ra-panel"><div className="ra-panel-heading"><div><p className="ra-eyebrow">{detail.submission.reference}</p><h2>{profile.displayName}</h2></div><span className={`ra-status ra-${detail.submission.status}`}>{detail.submission.status}</span></div>
              <dl className="ra-profile">{[['Discord / contact', profile.contact], ['Official region', profile.region], ['Server', profile.server], ['Character', profile.characterName], ['Class / level', `${profile.characterClass} / ${profile.level}`], ['Played since', profile.playedSince], ['Last played', profile.lastPlayed], ['Submitted', `${showDate(detail.submission.created_at)} SGT`]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
              <div className="ra-panel-heading ra-evidence-heading"><h3>Official-server character evidence</h3><button disabled={busy} onClick={() => void openDetail(detail.submission.id)}>Refresh evidence</button></div>
              <p className="ra-muted">Check the character, server, client region, and consistency with the player’s account. A screenshot alone does not establish that every claim is true.</p>
              {!!detail.duplicateEvidence?.length && <div className="ra-notice"><strong>Reused screenshot detected.</strong><p>This exact image also appears in another submission. Check whether the reuse is legitimate before approving.</p><div className="ra-actions">{detail.duplicateEvidence.map(item => <button key={item.id} disabled={busy} onClick={() => void openDetail(item.id)}>Inspect {item.reference}</button>)}</div></div>}
              {safeHttps(detail.proofUrl) && !proofError ? <a className="ra-proof-link" href={detail.proofUrl} target="_blank" rel="noopener noreferrer"><img className="ra-proof" src={detail.proofUrl} alt={`Character screenshot supplied by ${profile.displayName}`} referrerPolicy="no-referrer" onError={() => setProofError(true)} /><span>Open full-size evidence ↗</span></a> : <p className="ra-error">The private image could not load or its link expired. Use Refresh evidence to request a new link.</p>}
            </article>
            <article className="ra-panel"><div className="ra-panel-heading"><h2>Research entries</h2><button onClick={downloadSelected}>Download this submission</button></div>
              <p className="ra-muted ra-small">The download includes private player details and the review history. Share only with your research team.</p>
              {detail.submission.payload?.entries.map((entry, index) => {
                const table = schema.tables.find(item => item.id === entry.tableId)
                const source = safeHttps(entry.sourceUrl)
                return <section className="ra-entry" key={`${entry.tableId}-${index}`}><p className="ra-eyebrow">Entry {index + 1} · {entry.certainty === 'uncertain' ? 'Contributor marked uncertain' : 'Reported observation'}</p><h3>{table?.title || entry.tableId}</h3><p className="ra-entry-label">{entry.rowLabel}</p>
                  <dl className="ra-fields">{entry.values.map((value, field) => <div key={field}><dt>{table?.columns[field] || `Field ${field + 1}`}</dt><dd>{value || 'Not provided'}</dd></div>)}</dl>
                  <p><strong>Observed:</strong> {entry.observedAt}</p><p><strong>Source:</strong> {source ? <a className="ra-text-link ra-source" href={source} target="_blank" rel="noopener noreferrer">{entry.sourceUrl} ↗</a> : <span>{entry.sourceUrl || 'Not provided'}</span>}</p>
                  {entry.notes && <p className="ra-entry-notes"><strong>Notes:</strong> {entry.notes}</p>}
                </section>
              })}
            </article>
            <article className="ra-panel"><h2>Staff decision</h2><p className="ra-muted">Check the gameplay evidence and every cited source before approving. If a player mixed accurate and uncertain claims, describe the limitations in your notes.</p>
              <label>Review notes (at least 10 characters)<textarea rows={4} minLength={10} maxLength={2000} value={notes} onChange={event => setNotes(event.target.value)} placeholder="What did you verify? Record corrections, uncertainties, or the reason for rejection." /></label>
              <label className="ra-checkbox"><input type="checkbox" checked={checked} onChange={event => setChecked(event.target.checked)} />I checked official-server proof and cited sources.</label>
              <div className="ra-actions"><button className="ra-primary" disabled={busy || !checked || proofError || !safeHttps(detail.proofUrl) || notes.trim().length < 10} onClick={() => void review('approved')}>Approve research</button><button className="ra-danger-button" disabled={busy || notes.trim().length < 10} onClick={() => void review('rejected')}>Reject</button>{detail.submission.status !== 'pending' && <button disabled={busy || notes.trim().length < 10} onClick={() => void review('pending')}>Return to pending</button>}</div>
              <p className="ra-muted ra-small">If another administrator changes this submission, refresh it before reviewing again.</p>
            </article>
            <article className="ra-panel"><h2>Review history</h2>{detail.reviews.length ? <ol className="ra-history">{detail.reviews.map((audit, index) => <li key={audit.id || index}><div><strong>{audit.to_status || audit.status || 'Reviewed'}</strong><time>{showDate(audit.created_at)} SGT</time></div><p>{audit.notes}</p><small>Staff ID: {audit.actor_id || audit.reviewer_id || audit.reviewed_by || 'Recorded by server'}</small></li>)}</ol> : <p className="ra-muted">No staff decisions yet. This submission is awaiting its first review.</p>}</article>
          </>}
        </section>
      </div>
    </main>
  </div>
}
