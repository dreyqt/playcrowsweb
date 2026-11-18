import test from 'node:test'
import assert from 'node:assert/strict'
import schema from '../supabase/functions/research-api/schema.json' with { type: 'json' }
import { validatePayload, inspectImage, randomCode, invite, sha256, readLimitedBody } from '../supabase/functions/research-api/validation.mjs'

const png = new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aOqkAAAAASUVORK5CYII=', 'base64'))
const table = schema.tables.find(t => t.id === 'section-9')
const payload = () => ({ profile: { displayName: 'Research Player', contact: 'research-player', region: 'Global', server: 'Official server', characterName: 'ResearchCrow', characterClass: 'Orb', level: 60, playedSince: '2025-01-01', lastPlayed: '2026-01-01' }, entries: [{ tableId: table.id, rowLabel: '', values: table.columns.map((_, i) => i === 0 ? 'Test skill observation' : ''), sourceUrl: 'https://www.nightcrows.com/en/notice/release', observedAt: '2026-01-01', certainty: 'observed', notes: '' }], consent: true, website: '' })

test('normalizes accepted research and strips client review authority', () => {
  const p = payload()
  p.status = 'approved'; p.reviewed_by = 'attacker'
  const validated = validatePayload(p, schema)
  assert.equal(validated.status, undefined)
  assert.equal(validated.reviewed_by, undefined)
  assert.equal(validated.entries.length, 1)
  const question = schema.tables.find(t => t.columns.includes('Verified By'))
  p.entries[0] = { ...p.entries[0], tableId: question.id, values: question.columns.map(c => c === 'Verified By' ? 'Admin' : 'Claim details') }
  assert.equal(validatePayload(p, schema).entries[0].values[question.columns.indexOf('Verified By')], '')
})
test('rejects bots, missing consent, invalid topics, missing evidence source and future dates', () => {
  for (const change of [
    p => { p.website = 'spam' }, p => { p.consent = false }, p => { p.profile.region = 'Private' },
    p => { p.profile.level = '60' }, p => { p.entries = [] }, p => { p.entries[0].tableId = 'section-6' },
    p => { p.entries[0].sourceUrl = 'javascript:alert(1)' }, p => { p.entries[0].sourceUrl = 'https://user:pass@example.com/' },
    p => { p.entries[0].values = ['x'] }, p => { p.entries[0].values = table.columns.map(() => '') },
    p => { p.entries[0].observedAt = '2099-01-01' }, p => { p.profile.lastPlayed = '2025-02-30' },
    p => { p.profile.lastPlayed = '2024-01-01' }, p => { p.entries[0].notes = '\u0000' },
  ]) { const p = payload(); change(p); assert.throws(() => validatePayload(p, schema)) }
})
test('limits image contents, declared type, bytes, and decompression dimensions', () => {
  assert.equal(inspectImage(png, 'image/png'), 'image/png')
  assert.throws(() => inspectImage(png, 'image/jpeg'))
  assert.throws(() => inspectImage(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>'), 'image/png'))
  assert.throws(() => inspectImage(new Uint8Array(3 * 1024 * 1024 + 1), 'image/png'))
  const bomb = png.slice(); new DataView(bomb.buffer).setUint32(16, 999999)
  assert.throws(() => inspectImage(bomb, 'image/png'))
})
test('prefilled template labels and source links do not count as contributed research', () => {
  for (const tableId of ['section-7', 'section-37']) {
    const template = schema.tables.find(t => t.id === tableId), p = payload()
    p.entries[0] = { ...p.entries[0], tableId, rowLabel: template.rows[0][0], values: [...template.rows[0]] }
    assert.throws(() => validatePayload(p, schema))
    const column = tableId === 'section-7' ? 1 : template.columns.indexOf('Answer')
    p.entries[0].values[column] = 'Observed game mechanic'
    assert.doesNotThrow(() => validatePayload(p, schema))
  }
})
test('accepts a valid one-digit observation changed from a template row', () => {
  const p = payload(), template = schema.tables.find(t => t.id === 'section-7')
  p.entries[0] = { ...p.entries[0], tableId: template.id, rowLabel: template.rows[0][0], values: [...template.rows[0]] }
  p.entries[0].values[1] = '1'
  assert.doesNotThrow(() => validatePayload(p, schema))
})
test('generates strong one-use capability tokens with deterministic hashes', async () => {
  const tokens = Array.from({ length: 30 }, randomCode)
  assert.equal(new Set(tokens).size, 30)
  for (const token of tokens) assert.equal(invite(token), token)
  assert.throws(() => invite('PLAYCROWS'))
  assert.equal((await sha256(tokens[0])).length, 64)
  assert.equal(await sha256(tokens[0]), await sha256(tokens[0]))
  assert.notEqual(await sha256(tokens[0]), await sha256(tokens[1]))
})
test('enforces actual streamed body limit even without Content-Length', async () => {
  const request = new Request('https://example.com', { method: 'POST', body: new Uint8Array(101) })
  await assert.rejects(readLimitedBody(request, 100), error => error.status === 413)
})

let handler
globalThis.Deno = { env: { get: key => key === 'SUPABASE_URL' ? 'https://test.invalid' : 'server-only-test-key' }, serve: fn => { handler = fn } }
await import('../supabase/functions/research-api/index.ts')
const originalFetch = globalThis.fetch
test.after(() => { globalThis.fetch = originalFetch; delete globalThis.Deno })
function mockNetwork(fn) { globalThis.fetch = async (url, options) => fn(new URL(url), options) }
const json = body => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
const action = (body, authorization = '', origin = 'https://playcrowsweb.vercel.app') => new Request('https://test.invalid/functions/v1/research-api', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin, ...(authorization ? { Authorization: authorization } : {}) }, body: JSON.stringify(body) })

test('admin endpoints reject missing credentials before querying database', async () => {
  mockNetwork(() => { throw new Error('Unexpected network request') })
  for (const name of ['list', 'detail', 'createInvite', 'revokeInvite', 'review']) assert.equal((await handler(action({ action: name }))).status, 401)
})
test('a signed-in non-admin cannot read research or create invitation codes', async () => {
  const calls = []
  mockNetwork((url, options) => {
    calls.push(url.pathname)
    if (url.pathname === '/auth/v1/user') { assert.equal(options.headers.Authorization, 'Bearer ordinary.jwt'); return json({ id: '11111111-1111-4111-8111-111111111111' }) }
    if (url.pathname === '/rest/v1/admin_users') return json([])
    throw new Error('Non-admin accessed research data')
  })
  assert.equal((await handler(action({ action: 'list' }, 'Bearer ordinary.jwt'))).status, 403)
  assert.deepEqual(calls, ['/auth/v1/user', '/rest/v1/admin_users'])
})
test('cross-origin requests are denied even if they supply a token', async () => {
  mockNetwork(() => { throw new Error('Unexpected network request') })
  const response = await handler(action({ action: 'list' }, 'Bearer token.jwt', 'https://evil.example'))
  assert.equal(response.status, 403)
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), null)
})
test('unknown invitation cannot create a rate-limit row or upload evidence', async () => {
  const calls = []
  mockNetwork(url => { calls.push(url.pathname); if (url.pathname === '/rest/v1/research_invites') return json([]); throw new Error('Unknown invitation caused a write') })
  const form = new FormData(); form.set('action', 'submit'); form.set('inviteCode', randomCode()); form.set('requestId', crypto.randomUUID()); form.set('payload', JSON.stringify(payload())); form.set('proof', new File([png], 'proof.png', { type: 'image/png' }))
  const response = await handler(new Request('https://test.invalid', { method: 'POST', body: form }))
  assert.equal(response.status, 403)
  assert.deepEqual(calls, ['/rest/v1/research_invites'])
})
test('successful public submission uses atomic RPC and never accepts client-approved status', async () => {
  const id = crypto.randomUUID(), inviteId = crypto.randomUUID(), calls = []
  mockNetwork((url, options) => {
    calls.push(url.pathname)
    if (url.pathname === '/rest/v1/research_invites') return json([{ id: inviteId, expires_at: '2099-01-01T00:00:00Z', used_at: null, revoked_at: null }])
    if (url.pathname === '/rest/v1/rpc/research_take_rate_limit') return json(true)
    if (url.pathname === '/rest/v1/research_submissions') return json([])
    if (url.pathname.startsWith('/storage/v1/object/research-evidence/')) return json({ Key: 'stored' })
    if (url.pathname === '/rest/v1/rpc/research_commit_submission') {
      const body = JSON.parse(options.body)
      assert.equal(body.p_payload.status, undefined)
      assert.equal(body.p_request_id, id)
      assert.equal(body.p_proof_sha256.length, 64)
      return json({ id, reference: 'NCR-TEST', status: 'pending', created_at: '2026-01-01', proof_path: body.p_proof_path, replayed: false })
    }
    throw new Error(`Unexpected request: ${url.pathname}`)
  })
  const p = payload(); p.status = 'approved'
  const form = new FormData(); form.set('action', 'submit'); form.set('inviteCode', randomCode()); form.set('requestId', id); form.set('payload', JSON.stringify(p)); form.set('proof', new File([png], 'proof.png', { type: 'image/png' }))
  const response = await handler(new Request('https://test.invalid', { method: 'POST', body: form }))
  assert.equal(response.status, 200)
  assert.equal((await response.json()).submission.status, 'pending')
  assert.equal(calls.filter(path => path.includes('research_commit_submission')).length, 1)
})

function submissionRequest(id, code, p = payload()) {
  const form = new FormData()
  form.set('action', 'submit'); form.set('inviteCode', code); form.set('requestId', id); form.set('payload', JSON.stringify(p))
  form.set('proof', new File([png], 'proof.png', { type: 'image/png' }))
  return new Request('https://test.invalid', { method: 'POST', body: form })
}
test('identical retry with consumed invitation returns receipt without uploading again', async () => {
  const id = crypto.randomUUID(), inviteId = crypto.randomUUID(), p = payload()
  const hash = await sha256(`${JSON.stringify(validatePayload(p, schema))}\n${await sha256(png)}`)
  mockNetwork(url => {
    if (url.pathname === '/rest/v1/research_invites') return json([{ id: inviteId, expires_at: '2099-01-01T00:00:00Z', used_at: '2026-01-01', revoked_at: null }])
    if (url.pathname === '/rest/v1/rpc/research_take_rate_limit') return json(true)
    if (url.pathname === '/rest/v1/research_submissions') return json([{ id, reference: 'NCR-RETRY', status: 'pending', created_at: '2026-01-01', invite_id: inviteId, payload_sha256: hash, proof_path: `${id}/original.png` }])
    throw new Error('Retry caused an unexpected upload or write')
  })
  const response = await handler(submissionRequest(id, randomCode(), p))
  assert.equal(response.status, 200)
  assert.equal((await response.json()).replayed, true)
  p.entries[0].notes = 'Changed contents after original save'
  assert.equal((await handler(submissionRequest(id, randomCode(), p))).status, 409)
})
test('commit response loss reconciles saved evidence rather than deleting it', async () => {
  const id = crypto.randomUUID(), inviteId = crypto.randomUUID(), p = payload()
  const hash = await sha256(`${JSON.stringify(validatePayload(p, schema))}\n${await sha256(png)}`)
  let lookups = 0, proofPath
  mockNetwork((url, options) => {
    if (url.pathname === '/rest/v1/research_invites') return json([{ id: inviteId, expires_at: '2099-01-01T00:00:00Z', used_at: null, revoked_at: null }])
    if (url.pathname === '/rest/v1/rpc/research_take_rate_limit') return json(true)
    if (url.pathname === '/rest/v1/research_submissions') {
      lookups++
      return json(lookups === 1 ? [] : [{ id, reference: 'NCR-RECONCILED', status: 'pending', created_at: '2026-01-01', invite_id: inviteId, payload_sha256: hash, proof_path: proofPath }])
    }
    if (url.pathname.startsWith('/storage/v1/object/research-evidence/')) return json({ Key: 'stored' })
    if (url.pathname === '/rest/v1/rpc/research_commit_submission') {
      proofPath = JSON.parse(options.body).p_proof_path
      throw new Error('Simulated response lost after database commit')
    }
    throw new Error(`Committed evidence must not be deleted: ${url.pathname}`)
  })
  const response = await handler(submissionRequest(id, randomCode(), p))
  assert.equal(response.status, 200)
  assert.equal((await response.json()).submission.reference, 'NCR-RECONCILED')
})
test('admin approval requires explicit evidence confirmation and review notes', async () => {
  const actor = crypto.randomUUID()
  mockNetwork(url => {
    if (url.pathname === '/auth/v1/user') return json({ id: actor })
    if (url.pathname === '/rest/v1/admin_users') return json([{ user_id: actor }])
    if (url.pathname === '/rest/v1/rpc/research_take_rate_limit') return json(true)
    throw new Error('Incomplete review reached a database mutation')
  })
  const review = { action: 'review', id: crypto.randomUUID(), status: 'approved', expectedStatus: 'pending', expectedReviewedAt: null, notes: 'Checked source citations and proof.' }
  assert.equal((await handler(action(review, 'Bearer administrator.jwt'))).status, 400)
  assert.equal((await handler(action({ ...review, evidenceChecked: true, notes: 'yes' }, 'Bearer administrator.jwt'))).status, 400)
})
test('in-flight commit timeout with no visible row never deletes potentially committed proof', async () => {
  const id = crypto.randomUUID(), inviteId = crypto.randomUUID()
  let deletionAttempted = false
  mockNetwork(url => {
    if (url.pathname === '/rest/v1/research_invites') return json([{ id: inviteId, expires_at: '2099-01-01T00:00:00Z', used_at: null, revoked_at: null }])
    if (url.pathname === '/rest/v1/rpc/research_take_rate_limit') return json(true)
    if (url.pathname === '/rest/v1/research_submissions') return json([])
    if (url.pathname.startsWith('/storage/v1/object/research-evidence/')) return json({ Key: 'stored' })
    if (url.pathname === '/rest/v1/rpc/research_commit_submission') throw new Error('Transaction still in flight when network times out')
    if (url.pathname === '/storage/v1/object/research-evidence') { deletionAttempted = true; return json({}) }
    throw new Error(`Unexpected request ${url.pathname}`)
  })
  assert.equal((await handler(submissionRequest(id, randomCode()))).status, 503)
  assert.equal(deletionAttempted, false)
})
test('admin review forwards exact prior review timestamp and rejects an omitted version', async () => {
  const actor = crypto.randomUUID(), timestamp = '2026-11-17T10:12:13.123456+00:00'
  let rpcBody
  mockNetwork((url, options) => {
    if (url.pathname === '/auth/v1/user') return json({ id: actor })
    if (url.pathname === '/rest/v1/admin_users') return json([{ user_id: actor }])
    if (url.pathname === '/rest/v1/rpc/research_take_rate_limit') return json(true)
    if (url.pathname === '/rest/v1/rpc/research_review_submission') { rpcBody = JSON.parse(options.body); return json({ status: 'pending' }) }
    throw new Error(`Unexpected request ${url.pathname}`)
  })
  const review = { action: 'review', id: crypto.randomUUID(), status: 'pending', expectedStatus: 'pending', notes: 'More evidence needed before approval.' }
  assert.equal((await handler(action(review, 'Bearer administrator.jwt'))).status, 400)
  assert.equal(rpcBody, undefined)
  assert.equal((await handler(action({ ...review, expectedReviewedAt: timestamp }, 'Bearer administrator.jwt'))).status, 200)
  assert.equal(rpcBody.p_expected_reviewed_at, timestamp)
})
