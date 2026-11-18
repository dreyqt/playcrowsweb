// Gateway JWT verification is disabled for invite submissions. Every admin action
// explicitly validates the Supabase user and checks the existing admin_users table.
import schema from './schema.json' with { type: 'json' }
import { PublicError, MAX_REQUEST_BYTES, text, uuid, invite, validatePayload, inspectImage, sha256, randomCode, readLimitedBody } from './validation.mjs'

const allowedOrigins = new Set(['https://playcrowsweb.vercel.app', 'http://localhost:4176', 'http://127.0.0.1:4176', 'http://localhost:8443', 'http://127.0.0.1:8443'])
const base = Deno.env.get('SUPABASE_URL')!
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const bucket = 'research-evidence'

async function api(path: string, init: RequestInit = {}) {
  const response = await fetch(`${base}${path}`, { ...init, headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', ...init.headers }, signal: AbortSignal.timeout(20000) })
  if (!response.ok) {
    const failure = await response.json().catch(() => ({}))
    // SQL exception text is mapped to bounded public errors; never return raw DB errors.
    if (failure.message === 'Invite unavailable') throw new PublicError('Invitation code is invalid, expired, already used, or revoked.', 403)
    if (failure.message === 'Request conflict') throw new PublicError('This request reference was already used for different information. Start a new submission.', 409)
    if (failure.message === 'Review conflict') throw new PublicError('Another administrator changed this submission. Refresh before reviewing.', 409)
    if (failure.message === 'Submission not found') throw new PublicError('Submission not found.', 404)
    throw new Error(`Research service request failed (${response.status}).`)
  }
  if (response.status === 204) return null
  return response.json()
}
function query(table: string, parameters: Record<string, string>) {
  return api(`/rest/v1/${table}?${new URLSearchParams(parameters)}`)
}
function rpc(name: string, body: unknown) { return api(`/rest/v1/rpc/${name}`, { method: 'POST', body: JSON.stringify(body) }) }
async function takeLimit(bucketName: string, limit: number, seconds: number) {
  if (await rpc('research_take_rate_limit', { p_bucket: bucketName, p_limit: limit, p_seconds: seconds }) !== true) throw new PublicError('Too many attempts. Please wait before trying again.', 429)
}
async function requireAdmin(request: Request) {
  const authorization = request.headers.get('Authorization') || ''
  if (!/^Bearer [A-Za-z0-9._-]+$/.test(authorization) || authorization.length > 8000) throw new PublicError('Administrator sign-in is required.', 401)
  const response = await fetch(`${base}/auth/v1/user`, { headers: { apikey: serviceKey, Authorization: authorization }, signal: AbortSignal.timeout(10000) })
  if (!response.ok) throw new PublicError('Your sign-in has expired. Sign in again.', 401)
  const user = await response.json()
  if (!user.id || user.is_anonymous) throw new PublicError('Administrator access is required.', 403)
  const admins = await query('admin_users', { select: 'user_id', user_id: `eq.${uuid(user.id)}`, limit: '1' })
  if (admins.length !== 1) throw new PublicError('This account is not authorized to review research.', 403)
  return user.id as string
}
function receipt(saved: Record<string, unknown>, replayed = false) {
  return { submission: { id: saved.id, reference: saved.reference, status: saved.status, created_at: saved.created_at }, replayed }
}
async function removeOwnUpload(path: string) {
  await api(`/storage/v1/object/${bucket}`, { method: 'DELETE', body: JSON.stringify({ prefixes: [path] }) })
}
async function submit(request: Request, bytes: Uint8Array) {
  const parsed = new Request(request.url, { method: 'POST', headers: { 'Content-Type': request.headers.get('content-type')! }, body: bytes })
  let form: FormData
  try { form = await parsed.formData() } catch { throw new PublicError('The submission form is malformed.') }
  if (form.get('action') !== 'submit') throw new PublicError('Unknown research action.')
  const tokenHash = await sha256(invite(form.get('inviteCode')))
  const requestId = uuid(form.get('requestId'))
  // Invalid random tokens never create rate-limit records or upload files.
  const invites = await query('research_invites', { select: 'id,expires_at,used_at,revoked_at', token_hash: `eq.${tokenHash}`, limit: '1' })
  const invitation = invites[0]
  if (!invitation) throw new PublicError('Invitation code is invalid or unavailable.', 403)
  await takeLimit(`invite:${invitation.id}`, 10, 600)
  let input
  try { input = JSON.parse(text(form.get('payload'), 'Research data', 250000, 2)) } catch (error) {
    if (error instanceof PublicError) throw error
    throw new PublicError('The research data is malformed.')
  }
  const payload = validatePayload(input, schema)
  const file = form.get('proof')
  if (!(file instanceof File)) throw new PublicError('A character screenshot is required.')
  const image = new Uint8Array(await file.arrayBuffer())
  const mime = inspectImage(image, file.type)
  const proofHash = await sha256(image)
  const payloadHash = await sha256(`${JSON.stringify(payload)}\n${proofHash}`)
  const existing = await query('research_submissions', { select: 'id,reference,status,created_at,invite_id,payload_sha256,proof_path', id: `eq.${requestId}`, limit: '1' })
  if (existing[0]) {
    if (existing[0].invite_id !== invitation.id || existing[0].payload_sha256 !== payloadHash) throw new PublicError('This request reference was already used for different information. Start a new submission.', 409)
    return receipt(existing[0], true)
  }
  if (invitation.used_at || invitation.revoked_at || Date.parse(invitation.expires_at) <= Date.now()) throw new PublicError('Invitation code is expired, already used, or revoked.', 403)
  // Every attempt has a unique object path. Concurrent retries can only remove
  // their own object, never the evidence committed by another request.
  const extension = mime === 'image/png' ? 'png' : mime === 'image/jpeg' ? 'jpg' : 'webp'
  const proofPath = `${requestId}/${crypto.randomUUID()}.${extension}`
  await api(`/storage/v1/object/${bucket}/${proofPath}`, { method: 'POST', headers: { 'Content-Type': mime, 'x-upsert': 'false' }, body: image })
  try {
    const saved = await rpc('research_commit_submission', { p_token_hash: tokenHash, p_request_id: requestId, p_payload: payload,
      p_payload_sha256: payloadHash, p_proof_path: proofPath, p_proof_sha256: proofHash, p_proof_mime: mime, p_proof_size: image.length })
    if (saved.proof_path !== proofPath) await removeOwnUpload(proofPath).catch(() => {})
    return receipt(saved, saved.replayed)
  } catch (error) {
    // A timeout may mean the DB committed successfully. Check before deletion.
    // If reconciliation also fails, keep the private object rather than risk
    // deleting a submitted player's evidence. Retrying the request is idempotent.
    try {
      const rows = await query('research_submissions', { select: 'id,reference,status,created_at,invite_id,payload_sha256,proof_path', id: `eq.${requestId}`, limit: '1' })
      const saved = rows[0]
      // A failed fetch can leave a transaction in flight. An empty SELECT is
      // not proof of rollback. Only clean up a definitive DB rejection, or a
      // different immutable object already committed for this request ID.
      if ((saved && saved.proof_path !== proofPath) || (!saved && error instanceof PublicError)) await removeOwnUpload(proofPath).catch(() => {})
      if (saved?.invite_id === invitation.id && saved?.payload_sha256 === payloadHash) return receipt(saved, true)
    } catch { /* Leave private evidence intact if commit state cannot be established. */ }
    throw error
  }
}

async function adminAction(request: Request, bytes: Uint8Array) {
  const actor = await requireAdmin(request)
  await takeLimit(`admin:${actor}`, 180, 60)
  let body
  try { body = JSON.parse(new TextDecoder().decode(bytes)) } catch { throw new PublicError('Invalid request.') }
  if (!body || typeof body !== 'object') throw new PublicError('Invalid request.')
  if (body.action === 'list') {
    const parameters: Record<string, string> = { select: 'id,reference,status,created_at,reviewed_at,payload', order: 'created_at.desc,id.desc', limit: '101' }
    if (body.before) {
      const [createdAt, id] = text(body.before, 'Page cursor', 100, 1).split('|')
      if (!/^\d{4}-\d{2}-\d{2}T[0-9:.+-]+Z?$/.test(createdAt) || !Number.isFinite(Date.parse(createdAt))) throw new PublicError('Invalid page cursor.')
      parameters.or = `(created_at.lt.${createdAt},and(created_at.eq.${createdAt},id.lt.${uuid(id)}))`
    }
    const rows = await query('research_submissions', parameters)
    const visible = rows.slice(0, 100)
    const tail = visible[visible.length - 1]
    const invites = await query('research_invites', { select: 'id,label,created_at,expires_at,used_at,revoked_at', order: 'created_at.desc,id.desc', limit: '101' })
    return {
      submissions: visible.map((row: Record<string, any>) => ({ id: row.id, reference: row.reference, status: row.status, created_at: row.created_at, reviewed_at: row.reviewed_at, profile: row.payload.profile, entry_count: row.payload.entries.length })),
      invites: invites.slice(0, 100), invitesTruncated: invites.length > 100,
      nextBefore: rows.length > 100 ? `${tail.created_at}|${tail.id}` : null,
    }
  }
  if (body.action === 'createInvite') {
    const label = text(body.label, 'Invitation label', 120, 1)
    await takeLimit(`issue:${actor}`, 30, 3600)
    const code = randomCode()
    const saved = await api('/rest/v1/research_invites?select=id,label,created_at,expires_at,used_at,revoked_at', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ label, token_hash: await sha256(code), created_by: actor }) })
    return { code, invite: saved[0] }
  }
  if (body.action === 'revokeInvite') {
    const id = uuid(body.id)
    await api(`/rest/v1/research_invites?id=eq.${id}&revoked_at=is.null`, { method: 'PATCH', body: JSON.stringify({ revoked_at: new Date().toISOString() }) })
    return { success: true }
  }
  if (body.action === 'detail') {
    const id = uuid(body.id)
    const rows = await query('research_submissions', { select: '*', id: `eq.${id}`, limit: '1' })
    const submission = rows[0]
    if (!submission) throw new PublicError('Submission not found.', 404)
    const signed = await api(`/storage/v1/object/sign/${bucket}/${submission.proof_path}`, { method: 'POST', body: JSON.stringify({ expiresIn: 300 }) })
    const signedPath = signed.signedURL || signed.signedUrl
    const proofUrl = signedPath.startsWith('http') ? signedPath : `${base}/storage/v1${signedPath}`
    const reviews = await query('research_reviews', { select: 'id,submission_id,actor_id,previous_status,status,notes,created_at', submission_id: `eq.${id}`, order: 'created_at.desc', limit: '100' })
    const duplicates = await query('research_submissions', { select: 'id,reference', proof_sha256: `eq.${submission.proof_sha256}`, id: `neq.${id}`, limit: '10' })
    return { submission, proofUrl, reviews, duplicateEvidence: duplicates }
  }
  if (body.action === 'review') {
    if (!['pending', 'approved', 'rejected'].includes(body.status) || !['pending', 'approved', 'rejected'].includes(body.expectedStatus)) throw new PublicError('Invalid review status.')
    if (body.status === 'approved' && body.evidenceChecked !== true) throw new PublicError('Confirm that you checked the official-server evidence and source citations.')
    if (body.expectedReviewedAt !== null && (typeof body.expectedReviewedAt !== 'string' || body.expectedReviewedAt.length > 50 || !Number.isFinite(Date.parse(body.expectedReviewedAt)))) throw new PublicError('Refresh this submission before reviewing it.')
    const submission = await rpc('research_review_submission', { p_id: uuid(body.id), p_actor: actor, p_status: body.status, p_expected_status: body.expectedStatus, p_notes: text(body.notes, 'Review notes', 4000, 10), p_expected_reviewed_at: body.expectedReviewedAt })
    return { submission }
  }
  throw new PublicError('Unknown research action.')
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get('origin') || ''
  const headers: Record<string, string> = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', Vary: 'Origin' }
  if (allowedOrigins.has(origin)) headers['Access-Control-Allow-Origin'] = origin
  headers['Access-Control-Allow-Headers'] = 'authorization, apikey, content-type, x-client-info'
  headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
  const respond = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers })
  try {
    if (origin && !allowedOrigins.has(origin)) throw new PublicError('This website is not allowed to send research requests.', 403)
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
    if (request.method !== 'POST') throw new PublicError('Use POST for research requests.', 405)
    const type = request.headers.get('content-type') || ''
    const multipart = type.startsWith('multipart/form-data;')
    if (!multipart && !type.startsWith('application/json')) throw new PublicError('Unsupported request type.', 415)
    const bytes = await readLimitedBody(request, multipart ? MAX_REQUEST_BYTES : 16384)
    return respond(multipart ? await submit(request, bytes) : await adminAction(request, bytes))
  } catch (error) {
    if (error instanceof PublicError) return respond({ error: error.message }, error.status)
    console.error('Research request failed; details omitted to protect player information.')
    return respond({ error: 'Research service is temporarily unavailable. Your draft is safe; please retry.' }, 503)
  }
})
