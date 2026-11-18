import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import {
  DRAFT_KEY, MAX_ENTRIES, MAX_PROOF_BYTES, RESEARCH_TABLES,
  isHttpsUrl, parseDraft, topicTitle, validDate,
  type EntryComposer, type ResearchDraft, type ResearchEntry, type ResearchPayload, type ResearchProfile,
} from './types'
import './research.css'

type ProfileForm = Omit<ResearchProfile, 'level'> & { level: string }
type Errors = Record<string, string>
const DISCORD_URL = 'https://discord.gg/Kmwfee38c'
const EMPTY_PROFILE: ProfileForm = {
  displayName: '', contact: '', region: 'Global', server: '', characterName: '',
  characterClass: 'Orb', level: '', playedSince: '', lastPlayed: '',
}
const topicGroups = [...new Map(RESEARCH_TABLES.map(table => [table.groupId, table.groupTitle])).entries()]

function dateToday() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function makeComposer(tableId = RESEARCH_TABLES[0].id, rowKey = '0'): EntryComposer {
  const table = RESEARCH_TABLES.find(item => item.id === tableId)!
  return {
    tableId, rowKey, customLabel: '',
    values: rowKey === 'custom' ? table.columns.map(() => '') : [...table.rows[Number(rowKey)]],
    sourceUrl: '', observedAt: '', certainty: 'observed', notes: '',
  }
}

function Icon({ kind = 'arrow' }: { kind?: 'arrow' | 'shield' | 'file' | 'check' }) {
  const paths = {
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" /><path d="m8 12 3 3 5-6" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8m-8 4h6" /></>,
    check: <path d="m5 12 4 4L19 6" />,
  }
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[kind]}</svg>
}

function Field({ id, label, required, hint, error, children, wide = false }: {
  id: string; label: string; required?: boolean; hint?: string; error?: string; children: ReactNode; wide?: boolean
}) {
  return <div className={`research-field${wide ? ' research-field--wide' : ''}`}>
    <label htmlFor={id}>{label}{required && <span className="research-required" aria-label="required"> *</span>}</label>
    {children}
    {hint && <small id={`${id}-hint`}>{hint}</small>}
    {error && <p id={`${id}-error`} className="research-field-error">{error}</p>}
  </div>
}

function fieldA11y(id: string, error?: string, hint = false) {
  return { 'aria-invalid': error ? true : undefined, 'aria-describedby': [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined }
}

export default function ResearchPage() {
  const [profile, setProfile] = useState<ProfileForm>(EMPTY_PROFILE)
  const [composer, setComposer] = useState<EntryComposer>(() => makeComposer())
  const [entries, setEntries] = useState<ResearchEntry[]>([])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [errors, setErrors] = useState<Errors>({})
  const [entryErrors, setEntryErrors] = useState<Errors>({})
  const [proof, setProof] = useState<File | null>(null)
  const [proofPreview, setProofPreview] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [website, setWebsite] = useState('')
  const [consent, setConsent] = useState(false)
  const [requestId, setRequestId] = useState<string>(() => crypto.randomUUID())
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [draftMessage, setDraftMessage] = useState('')
  const [hasDraft, setHasDraft] = useState(false)
  const [receipt, setReceipt] = useState<{ reference: string; id: string } | null>(null)
  const attempted = useRef(false)
  const summaryRef = useRef<HTMLDivElement>(null)
  const entryRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const successRef = useRef<HTMLElement>(null)
  const table = RESEARCH_TABLES.find(item => item.id === composer.tableId)!
  const today = dateToday()

  useEffect(() => {
    document.title = 'Official Player Research | PlayCrows'
    try { setHasDraft(Boolean(localStorage.getItem(DRAFT_KEY))) } catch { /* Draft storage is optional. */ }
  }, [])
  useEffect(() => {
    if (!proof) { setProofPreview(''); return }
    const url = URL.createObjectURL(proof)
    setProofPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [proof])
  useEffect(() => { if (receipt) successRef.current?.focus() }, [receipt])

  function changed() {
    if (attempted.current) { setRequestId(crypto.randomUUID()); attempted.current = false }
    setMessage('')
  }
  function updateProfile(key: keyof ProfileForm, value: string) {
    changed()
    setProfile(current => ({ ...current, [key]: value }))
    setErrors(current => ({ ...current, [key]: '' }))
  }
  function updateComposer(key: keyof Omit<EntryComposer, 'values'>, value: string) {
    setComposer(current => ({ ...current, [key]: value }))
    setEntryErrors(current => ({ ...current, [key]: '', values: '' }))
  }
  function selectTopic(tableId: string) {
    setComposer(makeComposer(tableId))
    setEditingIndex(null)
    setEntryErrors({})
  }
  function selectTemplate(rowKey: string) {
    setComposer(current => ({ ...makeComposer(current.tableId, rowKey), observedAt: current.observedAt, sourceUrl: current.sourceUrl }))
    setEntryErrors({})
  }
  function addEntry() {
    const next: Errors = {}
    const values = composer.values.map((value, index) => table.columns[index] === 'Verified By' ? '' : value.trim())
    const seed = composer.rowKey === 'custom' ? table.columns.map(() => '') : table.rows[Number(composer.rowKey)]
    const meaningful = values.some((value, index) => value && value !== seed[index] && !/^(Source|Link|Verified By|Recorded By|Logged By)(\b|$)/i.test(table.columns[index]))
    if (!meaningful) next.values = 'Add at least one research detail beyond the template labels and source link.'
    if (composer.rowKey === 'custom' && !composer.customLabel.trim()) next.customLabel = 'Give this entry a short label.'
    if (!isHttpsUrl(composer.sourceUrl.trim())) next.sourceUrl = 'Enter a full HTTPS source link, such as an official notice or timestamped video.'
    if (!validDate(composer.observedAt) || composer.observedAt > today) next.observedAt = 'Enter the date you observed this information, today or earlier.'
    if (editingIndex === null && entries.length >= MAX_ENTRIES) next.values = `A submission can contain up to ${MAX_ENTRIES} entries.`
    setEntryErrors(next)
    if (Object.keys(next).length) { entryRef.current?.focus(); return }
    const entry: ResearchEntry = {
      tableId: table.id,
      rowLabel: (composer.rowKey === 'custom' ? composer.customLabel.trim() : seed[0] || values[0] || `Entry ${Number(composer.rowKey) + 1}`).slice(0, 200),
      values,
      sourceUrl: composer.sourceUrl.trim(), observedAt: composer.observedAt,
      certainty: composer.certainty, notes: composer.notes.trim(),
    }
    changed()
    setEntries(current => editingIndex === null ? [...current, entry] : current.map((item, index) => index === editingIndex ? entry : item))
    setDraftMessage(editingIndex === null ? 'Entry added to your submission. It has not been sent yet.' : 'Entry updated. It has not been sent yet.')
    setEditingIndex(null)
    setComposer({ ...makeComposer(table.id, composer.rowKey), observedAt: composer.observedAt })
    setErrors(current => ({ ...current, entries: '' }))
  }
  function editEntry(index: number) {
    const entry = entries[index]
    const target = RESEARCH_TABLES.find(item => item.id === entry.tableId)!
    const templateIndex = target.rows.findIndex(row => row[0] && row[0] === entry.rowLabel)
    setComposer({ ...entry, rowKey: templateIndex < 0 ? 'custom' : String(templateIndex), customLabel: entry.rowLabel, values: [...entry.values] })
    setEditingIndex(index)
    setEntryErrors({})
    requestAnimationFrame(() => { entryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); entryRef.current?.focus({ preventScroll: true }) })
  }
  function chooseProof(file: File | undefined) {
    changed()
    if (!file) { setProof(null); return }
    let error = ''
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) error = 'Choose a PNG, JPEG, or WebP screenshot.'
    else if (file.size > MAX_PROOF_BYTES) error = 'Your screenshot must be 3 MB or smaller.'
    else if (!file.size) error = 'This file is empty. Choose a screenshot.'
    setErrors(current => ({ ...current, proof: error }))
    setProof(error ? null : file)
    if (error && fileRef.current) fileRef.current.value = ''
  }
  function saveDraft() {
    try {
      const { contact: _contact, ...safeProfile } = profile
      const draft: ResearchDraft = { version: 1, savedAt: new Date().toISOString(), requestId, profile: safeProfile, entries, composer }
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
      setHasDraft(true)
      setDraftMessage(`Draft saved in this browser at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Nothing has been submitted. Contact, invitation code and screenshot were not saved.`)
    } catch { setDraftMessage('This browser could not save your draft. Keep this page open until you submit.') }
  }
  function restoreDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) throw new Error('No saved draft was found in this browser.')
      const draft = parseDraft(raw)
      setProfile({ ...draft.profile, contact: '' })
      setEntries(draft.entries)
      setComposer(draft.composer)
      setRequestId(draft.requestId)
      setEditingIndex(null)
      setConsent(false)
      setInviteCode('')
      setProof(null)
      if (fileRef.current) fileRef.current.value = ''
      setErrors({})
      setEntryErrors({})
      attempted.current = false
      setDraftMessage('Draft restored. Re-enter your Discord contact and invitation code, attach your screenshot, and confirm the declaration before submitting.')
    } catch (error) { setDraftMessage(error instanceof Error ? error.message : 'This saved draft could not be restored.') }
  }
  function clearSavedDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY)
      setHasDraft(false)
      setDraftMessage('Saved browser draft removed. The information currently on this page is still here.')
    } catch { setDraftMessage('This browser could not remove the saved draft.') }
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    const next: Errors = {}
    for (const [key, min] of [['displayName', 2], ['contact', 3], ['server', 2], ['characterName', 1]] as const) {
      if (profile[key].trim().length < min) next[key] = `Please enter at least ${min} ${min === 1 ? 'character' : 'characters'}.`
    }
    const level = Number(profile.level)
    if (!Number.isInteger(level) || level < 1 || level > 300) next.level = 'Enter a character level from 1 to 300.'
    if (!validDate(profile.playedSince) || profile.playedSince > today) next.playedSince = 'Enter a valid date, today or earlier.'
    if (!validDate(profile.lastPlayed) || profile.lastPlayed > today) next.lastPlayed = 'Enter a valid date, today or earlier.'
    else if (validDate(profile.playedSince) && profile.lastPlayed < profile.playedSince) next.lastPlayed = 'Last played must be on or after the date you started.'
    if (!entries.length) next.entries = 'Add at least one research entry before submitting.'
    if (editingIndex !== null) next.entries = 'Save or cancel the entry you are editing before submitting.'
    if (!proof) next.proof = 'Attach an official-server character screenshot for the review team.'
    if (!/^[A-Za-z0-9_-]{43}$/.test(inviteCode.trim())) next.inviteCode = 'Paste the complete one-time invitation code given to you by the PlayCrows team.'
    if (!consent) next.consent = 'Confirm the genuine-play declaration to submit.'
    setErrors(next)
    setMessage('')
    if (Object.keys(next).length) { requestAnimationFrame(() => summaryRef.current?.focus()); return }
    const url = import.meta.env.VITE_SUPABASE_URL
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
    if (!url || !key) { setMessage('Submissions are temporarily unavailable. Save a browser draft and try again later.'); return }
    const payload: ResearchPayload = {
      profile: { ...profile, displayName: profile.displayName.trim(), contact: profile.contact.trim(), server: profile.server.trim(), characterName: profile.characterName.trim(), level },
      entries, consent: true, website,
    }
    const body = new FormData()
    body.set('action', 'submit')
    body.set('inviteCode', inviteCode.trim())
    body.set('requestId', requestId)
    body.set('payload', JSON.stringify(payload))
    body.set('proof', proof!)
    attempted.current = true
    setBusy(true)
    try {
      const response = await fetch(`${url}/functions/v1/research-api`, { method: 'POST', headers: { apikey: key }, body })
      const text = await response.text()
      let result: { error?: string; submission?: { id?: string; reference?: string; status?: string } }
      try { result = JSON.parse(text) } catch { throw new Error('The server returned an unexpected response. Your entries are still here; please try submitting again.') }
      if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error.slice(0, 600) : 'Your submission could not be accepted. Please try again.')
      if (!result.submission?.id || !result.submission.reference) throw new Error('We could not confirm your submission reference. Please retry with the information on this page.')
      setReceipt({ id: result.submission.id, reference: result.submission.reference })
      setInviteCode('')
      setProof(null)
      try { localStorage.removeItem(DRAFT_KEY) } catch { /* The confirmed receipt is still valid. */ }
    } catch (error) {
      setMessage(error instanceof TypeError ? 'We could not confirm receipt because the connection failed. Your entries are still here. Please retry; an unchanged retry uses the same submission reference.' : error instanceof Error ? error.message : 'We could not confirm receipt. Please try again.')
    } finally { setBusy(false) }
  }

  const errorCount = Object.values(errors).filter(Boolean).length
  return <div className="research">
    <a href="#research-content" className="research-skip">Skip to research form</a>
    <div className="research-topbar">
      <a className="research-brand" href="/"><span className="research-brand-mark">P<span>C</span></span><span>PLAYCROWS<span className="research-brand-caption">PLAYER RESEARCH</span></span></a>
      <a className="research-back" href="/">Back to PlayCrows <Icon /></a>
    </div>
    <main className="research-main" id="research-content">
      <section className="research-hero" aria-labelledby="research-title">
        <div><p className="research-eyebrow"><span /> OFFICIAL-SERVER PLAYER INSIGHTS</p>
          <h1 id="research-title">Your experience.<br /><span>Better class research.</span></h1>
          <p className="research-intro">Played Orb, Cannon, or Gauntlets in the official Night Crows? Help our team understand the classes and systems through details you can support with evidence.</p>
          <div className="research-hero-tags"><span>Global & Korea</span><span>Evidence required</span><span>Reviewed by our team</span></div>
        </div>
        <aside className="research-invitation-note"><span className="research-icon-tile"><Icon kind="shield" /></span><h2>For invited contributors</h2><p>Speak with the PlayCrows team on Discord to confirm your official-server experience and receive a one-time invitation code.</p><a href={DISCORD_URL} target="_blank" rel="noopener noreferrer">Contact the team on Discord <Icon /></a><small>An invitation and screenshot help us check submissions. Every claim still needs review.</small></aside>
      </section>

      {receipt ? <section className="research-success research-card" ref={successRef} tabIndex={-1} aria-labelledby="research-success-title">
        <span className="research-success-icon"><Icon kind="check" /></span><p className="research-eyebrow">SUBMISSION RECEIVED</p><h2 id="research-success-title">Thank you for sharing what you know.</h2><p>Your {entries.length} {entries.length === 1 ? 'entry is' : 'entries are'} awaiting review. The team will check your evidence and may contact you on Discord for clarification.</p><div className="research-reference"><span>Your reference</span><strong>{receipt.reference}</strong></div><p className="research-muted">Keep this reference if you need to follow up. Your submission is not published or treated as verified research automatically.</p><a className="research-button research-button--primary" href={DISCORD_URL} target="_blank" rel="noopener noreferrer">Open Discord <Icon /></a><a className="research-link" href="/">Return to PlayCrows</a>
      </section> : <form onSubmit={submit} noValidate>
        <fieldset className="research-form-fieldset" disabled={busy}>
          <div className="research-layout">
            <aside className="research-sidebar">
              <nav aria-label="Research form sections"><a href="#research-profile"><span>01</span> Your player profile</a><a href="#research-entries"><span>02</span> Share your research</a><a href="#research-evidence"><span>03</span> Evidence & submit</a></nav>
              <div className="research-sidebar-note"><Icon kind="file" /><p>Contribute what you know.</p><small>You can send a single useful entry. Leave unknown names or values blank, keep the original units, and flag uncertainty.</small></div>
              <a className="research-template-link" href="/Night_Crows_New_Class_Research_EN.html" download>Download original template <span aria-hidden="true">↗</span></a>
              <p className="research-language-note">The research form is in English. Original Korean and Chinese names are welcome.</p>
            </aside>

            <div className="research-form-content">
              <div className="research-draft-bar"><div><strong>Your working draft</strong><span>Entries stay on this page until you submit.</span></div><div className="research-draft-actions"><button type="button" onClick={saveDraft}>Save in this browser</button>{hasDraft && <><button type="button" onClick={restoreDraft}>Restore saved draft</button><button type="button" className="research-text-button" onClick={clearSavedDraft}>Remove saved draft</button></>}</div></div>
              {draftMessage && <p className="research-status" role="status">{draftMessage}</p>}
              {errorCount > 0 && <div className="research-error-summary" ref={summaryRef} tabIndex={-1} role="alert"><strong>Please check {errorCount} {errorCount === 1 ? 'field' : 'fields'} before submitting.</strong><ul>{Object.entries(errors).filter(([, error]) => error).map(([key, error]) => <li key={key}><a href={`#rq-${key}`}>{error}</a></li>)}</ul></div>}

              <section className="research-card" id="research-profile" aria-labelledby="profile-title">
                <div className="research-section-heading"><span className="research-step">01</span><div><p className="research-eyebrow">YOUR EXPERIENCE</p><h2 id="profile-title">Tell us about your character</h2></div></div>
                <p className="research-section-intro">Use details from the official Global or Korean game. Do not enter your game password, recovery codes, or payment information. <span>Fields marked * are required.</span></p>
                <div className="research-fields">
                  <Field id="rq-displayName" label="Contributor name" required error={errors.displayName}><input id="rq-displayName" autoComplete="nickname" maxLength={80} value={profile.displayName} onChange={e => updateProfile('displayName', e.target.value)} {...fieldA11y('rq-displayName', errors.displayName)} /></Field>
                  <Field id="rq-contact" label="Discord username" required hint="Use the account the team can contact. This is kept with your submission for review." error={errors.contact}><input id="rq-contact" autoComplete="off" maxLength={120} value={profile.contact} onChange={e => updateProfile('contact', e.target.value)} {...fieldA11y('rq-contact', errors.contact, true)} /></Field>
                  <Field id="rq-region" label="Official game region" required><select id="rq-region" value={profile.region} onChange={e => updateProfile('region', e.target.value)}><option>Global</option><option>Korea</option></select></Field>
                  <Field id="rq-server" label="Official server name" required error={errors.server}><input id="rq-server" maxLength={100} placeholder="As shown in the official game" value={profile.server} onChange={e => updateProfile('server', e.target.value)} {...fieldA11y('rq-server', errors.server)} /></Field>
                  <Field id="rq-characterName" label="Character name" required error={errors.characterName}><input id="rq-characterName" maxLength={100} value={profile.characterName} onChange={e => updateProfile('characterName', e.target.value)} {...fieldA11y('rq-characterName', errors.characterName)} /></Field>
                  <Field id="rq-characterClass" label="Character class" required><select id="rq-characterClass" value={profile.characterClass} onChange={e => updateProfile('characterClass', e.target.value)}><option>Orb</option><option>Cannon</option><option>Gauntlets</option><option>Other</option></select></Field>
                  <Field id="rq-level" label="Character level" required error={errors.level}><input id="rq-level" type="number" inputMode="numeric" min={1} max={300} step={1} value={profile.level} onChange={e => updateProfile('level', e.target.value)} {...fieldA11y('rq-level', errors.level)} /></Field>
                  <div className="research-field research-profile-tip"><Icon kind="shield" /><span>Your player details and screenshot are for the review team. They are not displayed on a public response list.</span></div>
                  <Field id="rq-playedSince" label="Started playing the official game" required error={errors.playedSince}><input id="rq-playedSince" type="date" max={today} value={profile.playedSince} onChange={e => updateProfile('playedSince', e.target.value)} {...fieldA11y('rq-playedSince', errors.playedSince)} /></Field>
                  <Field id="rq-lastPlayed" label="Last played the official game" required error={errors.lastPlayed}><input id="rq-lastPlayed" type="date" min={profile.playedSince || undefined} max={today} value={profile.lastPlayed} onChange={e => updateProfile('lastPlayed', e.target.value)} {...fieldA11y('rq-lastPlayed', errors.lastPlayed)} /></Field>
                </div>
              </section>

              <section className="research-card" id="research-entries" aria-labelledby="entries-title">
                <div className="research-section-heading"><span className="research-step">02</span><div><p className="research-eyebrow">ONE DETAIL AT A TIME</p><h2 id="entries-title">Share your research</h2></div><span className="research-count">{entries.length} / {MAX_ENTRIES}</span></div>
                <p className="research-section-intro">Choose a topic, add what you observed, and cite a source. All 26 research tables from the original form are available below.</p>
                <div className="research-composer" ref={entryRef} tabIndex={-1}>
                  {editingIndex !== null && <div className="research-edit-banner">Editing entry {editingIndex + 1}<button type="button" onClick={() => { setEditingIndex(null); setComposer(makeComposer(table.id)); setEntryErrors({}) }}>Cancel edit</button></div>}
                  <div className="research-fields">
                    <Field id="rq-topic" label="Research topic" required wide><select id="rq-topic" value={composer.tableId} onChange={e => selectTopic(e.target.value)}>{topicGroups.map(([id, title]) => <optgroup key={id} label={title}>{RESEARCH_TABLES.filter(item => item.groupId === id).map(item => <option key={item.id} value={item.id}>{topicTitle(item)}</option>)}</optgroup>)}</select></Field>
                    <Field id="rq-row" label="Template row" required wide><select id="rq-row" value={composer.rowKey} onChange={e => selectTemplate(e.target.value)}>{table.rows.map((row, index) => <option key={index} value={String(index)}>{row[0] || `Blank entry ${index + 1}`}</option>)}<option value="custom">+ Add a custom row</option></select></Field>
                    {composer.rowKey === 'custom' && <Field id="rq-customLabel" label="Entry label" required wide error={entryErrors.customLabel}><input id="rq-customLabel" maxLength={200} placeholder="A short name for this finding" value={composer.customLabel} onChange={e => updateComposer('customLabel', e.target.value)} {...fieldA11y('rq-customLabel', entryErrors.customLabel)} /></Field>}
                  </div>
                  {table.intro && <p className="research-topic-note">{table.intro}</p>}
                  <div className="research-divider"><span>{topicTitle(table)}</span><small>Keep original units · ZH / KO / EN where known</small></div>
                  {entryErrors.values && <p className="research-field-error" role="alert">{entryErrors.values}</p>}
                  <div className="research-fields">{table.columns.map((column, index) => {
                    const locked = column === 'Verified By'
                    const id = `rq-value-${index}`
                    return <Field key={`${table.id}-${index}`} id={id} label={column} wide={/Effect|Mechanic|Details|Comment|Answer|Question|Original Text/i.test(column)} hint={locked ? 'Only the review team can verify a finding.' : undefined}><textarea id={id} rows={2} maxLength={2000} readOnly={locked} placeholder={locked ? 'Reserved for the review team' : 'Leave blank if unknown'} value={locked ? '' : composer.values[index]} onChange={e => { setComposer(current => ({ ...current, values: current.values.map((value, i) => i === index ? e.target.value : value) })); setEntryErrors(current => ({ ...current, values: '' })) }} {...fieldA11y(id, undefined, locked)} /></Field>
                  })}</div>
                  <div className="research-entry-evidence"><div className="research-fields">
                    <Field id="rq-sourceUrl" label="Evidence / source link" required wide hint="Use HTTPS. Link to an official notice, guide, or video with a timestamp. This supports this entry specifically." error={entryErrors.sourceUrl}><input id="rq-sourceUrl" type="url" maxLength={2048} placeholder="https://…" value={composer.sourceUrl} onChange={e => updateComposer('sourceUrl', e.target.value)} {...fieldA11y('rq-sourceUrl', entryErrors.sourceUrl, true)} /></Field>
                    <Field id="rq-observedAt" label="Date observed" required error={entryErrors.observedAt}><input id="rq-observedAt" type="date" max={today} value={composer.observedAt} onChange={e => updateComposer('observedAt', e.target.value)} {...fieldA11y('rq-observedAt', entryErrors.observedAt)} /></Field>
                    <Field id="rq-certainty" label="How certain is this information?" required><select id="rq-certainty" value={composer.certainty} onChange={e => updateComposer('certainty', e.target.value)}><option value="observed">Directly observed / source supported</option><option value="uncertain">To confirm / uncertain</option></select></Field>
                    <Field id="rq-notes" label="Notes for the review team" wide hint="Include game version, video timestamps, context, or what still needs checking."><textarea id="rq-notes" rows={3} maxLength={2000} value={composer.notes} onChange={e => updateComposer('notes', e.target.value)} {...fieldA11y('rq-notes', undefined, true)} /></Field>
                  </div></div>
                  <div className="research-entry-actions"><span>Only saved entries below will be submitted.</span><button className="research-button research-button--secondary" type="button" onClick={addEntry} disabled={editingIndex === null && entries.length >= MAX_ENTRIES}>{editingIndex === null ? 'Add entry to submission' : 'Save entry changes'} <Icon /></button></div>
                </div>

                <div className="research-basket" id="rq-entries" tabIndex={-1}><div className="research-basket-heading"><h3>Your submission</h3><span>{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</span></div>
                  {errors.entries && <p className="research-field-error">{errors.entries}</p>}
                  {entries.length === 0 ? <div className="research-empty"><Icon kind="file" /><p>Your findings will appear here.</p><small>Add one useful detail or build a collection of up to 30 entries.</small></div> : <ol className="research-entry-list">{entries.map((entry, index) => {
                    const itemTable = RESEARCH_TABLES.find(item => item.id === entry.tableId)!
                    return <li key={index}><div className="research-entry-number">{String(index + 1).padStart(2, '0')}</div><div className="research-entry-info"><p className="research-entry-topic">{topicTitle(itemTable)}</p><h4>{entry.rowLabel}</h4><div className="research-entry-meta"><span>{entry.observedAt}</span><span className={entry.certainty === 'uncertain' ? 'research-uncertain' : ''}>{entry.certainty === 'uncertain' ? 'To confirm' : 'Source supplied'}</span></div><details><summary>Review entry details</summary><dl>{itemTable.columns.map((column, cellIndex) => entry.values[cellIndex] ? <div key={cellIndex}><dt>{column}</dt><dd>{entry.values[cellIndex]}</dd></div> : null)}<div><dt>Source</dt><dd><a href={entry.sourceUrl} target="_blank" rel="noopener noreferrer">{entry.sourceUrl}</a></dd></div>{entry.notes && <div><dt>Review notes</dt><dd>{entry.notes}</dd></div>}</dl></details></div><div className="research-entry-tools"><button type="button" onClick={() => editEntry(index)} aria-label={`Edit entry ${index + 1}: ${entry.rowLabel}`}>Edit</button><button type="button" onClick={() => { changed(); setEntries(current => current.filter((_, i) => i !== index)); if (editingIndex !== null) { setEditingIndex(null); setComposer(makeComposer(table.id)) } }} aria-label={`Remove entry ${index + 1}: ${entry.rowLabel}`}>Remove</button></div></li>
                  })}</ol>}
                </div>
              </section>

              <section className="research-card" id="research-evidence" aria-labelledby="evidence-title">
                <div className="research-section-heading"><span className="research-step">03</span><div><p className="research-eyebrow">READY FOR REVIEW</p><h2 id="evidence-title">Evidence & submission</h2></div></div>
                <p className="research-section-intro">Help the team check that your experience comes from the official game. Your invitation code can be used for one submission.</p>
                <div className="research-proof-box"><Field id="rq-proof" label="Official character screenshot" required hint="PNG, JPEG or WebP · maximum 3 MB" error={errors.proof}><p className="research-upload-guidance">Show your character name, server, and official client or region. Redact private messages, email addresses, account IDs, and payment details. Do not upload passwords or recovery codes.</p><input ref={fileRef} id="rq-proof" type="file" accept="image/png,image/jpeg,image/webp" onChange={e => chooseProof(e.target.files?.[0])} {...fieldA11y('rq-proof', errors.proof, true)} /></Field>{proof && <div className="research-proof-preview">{proofPreview && <img src={proofPreview} alt="Your selected official character screenshot" />}<div><strong>{proof.name}</strong><span>{(proof.size / 1024 / 1024).toFixed(2)} MB · attached for review</span><button type="button" className="research-text-button" onClick={() => { changed(); setProof(null); if (fileRef.current) fileRef.current.value = '' }}>Remove screenshot</button></div></div>}</div>
                <Field id="rq-inviteCode" label="One-time invitation code" required hint="Get your code from the PlayCrows team on Discord. Codes are not saved in browser drafts." error={errors.inviteCode}><input id="rq-inviteCode" autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={160} placeholder="Paste your invitation code" value={inviteCode} onChange={e => { changed(); setInviteCode(e.target.value); setErrors(current => ({ ...current, inviteCode: '' })) }} {...fieldA11y('rq-inviteCode', errors.inviteCode, true)} /></Field>
                <div className="research-honeypot" aria-hidden="true"><label htmlFor="rq-website">Website</label><input id="rq-website" name="website" value={website} onChange={e => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" /></div>
                <div className="research-declaration"><label htmlFor="rq-consent"><input id="rq-consent" type="checkbox" checked={consent} onChange={e => { changed(); setConsent(e.target.checked); setErrors(current => ({ ...current, consent: '' })) }} {...fieldA11y('rq-consent', errors.consent)} /><span>I have played the official Night Crows game. These details are accurate to the best of my knowledge, and I have marked uncertainties. I agree that the PlayCrows team may store this profile, research, and screenshot to review my contribution and contact me on Discord.</span></label>{errors.consent && <p id="rq-consent-error" className="research-field-error">{errors.consent}</p>}</div>
                <div className="research-review-note"><Icon kind="shield" /><p><strong>Reviewed before use.</strong> Submissions enter a private review queue. An invitation, screenshot, or source link does not automatically make a claim verified.</p></div>
                {message && <p className="research-error-summary" role="alert">{message}</p>}
                <div className="research-submit-row"><div><strong>{entries.length} {entries.length === 1 ? 'entry' : 'entries'} ready to send</strong><span>You will receive a reference after the server accepts your submission.</span></div><button className="research-button research-button--primary" type="submit" disabled={busy} aria-busy={busy}>{busy ? 'Sending for review…' : 'Submit for review'} {!busy && <Icon />}</button></div>
                <p className="research-storage-note">Browser drafts are optional and saved only when you choose “Save in this browser.” They exclude your Discord contact, invitation code, screenshot, and declaration.</p>
              </section>
            </div>
          </div>
        </fieldset>
      </form>}
      <div className="research-footer"><span>PLAYCROWS · COMMUNITY RESEARCH</span><p>This community research form is not an official Night Crows account service.</p><a href={DISCORD_URL} target="_blank" rel="noopener noreferrer">Need help? Contact our team <span aria-hidden="true">↗</span></a></div>
    </main>
  </div>
}
