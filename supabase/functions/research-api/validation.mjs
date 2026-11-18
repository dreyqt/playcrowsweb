export class PublicError extends Error {
  constructor(message, status = 400) { super(message); this.status = status }
}
export const MAX_PROOF_BYTES = 3 * 1024 * 1024
export const MAX_REQUEST_BYTES = 4 * 1024 * 1024
export function text(value, name, max, min = 0) {
  if (typeof value !== 'string') throw new PublicError(`${name} must be text.`)
  const result = value.trim()
  if (result.length < min || result.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(result)) throw new PublicError(`${name} must contain ${min}–${max} characters.`)
  return result
}
export function uuid(value) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new PublicError('Invalid request reference.')
  return value.toLowerCase()
}
export function invite(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(value.trim())) throw new PublicError('Invitation code is invalid or unavailable.', 403)
  return value.trim()
}
export function date(value, name, today = new Date(Date.now() + 14 * 3600000).toISOString().slice(0, 10)) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value || value < '2000-01-01' || value > today) throw new PublicError(`${name} must be a real date, no later than today.`)
  return value
}
export function httpsUrl(value) {
  const raw = text(value, 'Source URL', 2048, 12)
  let parsed
  try { parsed = new URL(raw) } catch { throw new PublicError('Use a complete HTTPS source URL.') }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || !parsed.hostname.includes('.') || parsed.hostname.endsWith('.local') || /^[\d.]+$/.test(parsed.hostname) || parsed.hostname.startsWith('[')) throw new PublicError('Use a public HTTPS source URL without a username or password.')
  return parsed.href
}
export function validatePayload(input, schema) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new PublicError('Invalid submission.')
  if (input.website !== '') throw new PublicError('Submission could not be accepted.')
  if (input.consent !== true) throw new PublicError('Confirm that staff may review your evidence.')
  const p = input.profile
  if (!p || typeof p !== 'object') throw new PublicError('Player information is required.')
  if (!['Global', 'Korea'].includes(p.region)) throw new PublicError('Choose Global or Korea official servers.')
  if (!['Orb', 'Cannon', 'Gauntlets', 'Other'].includes(p.characterClass)) throw new PublicError('Choose a character class.')
  if (!Number.isInteger(p.level) || p.level < 1 || p.level > 300) throw new PublicError('Character level must be between 1 and 300.')
  const profile = {
    displayName: text(p.displayName, 'Display name', 80, 2), contact: text(p.contact, 'Contact', 160, 3),
    region: p.region, server: text(p.server, 'Server', 100, 2), characterName: text(p.characterName, 'Character name', 100, 1),
    characterClass: p.characterClass, level: p.level, playedSince: date(p.playedSince, 'First played'), lastPlayed: date(p.lastPlayed, 'Last played'),
  }
  if (profile.lastPlayed < profile.playedSince) throw new PublicError('Last played cannot be before first played.')
  if (!Array.isArray(input.entries) || input.entries.length < 1 || input.entries.length > 30) throw new PublicError('Provide between 1 and 30 research entries.')
  const entries = input.entries.map((e, i) => {
    if (!e || typeof e !== 'object') throw new PublicError(`Entry ${i + 1} is invalid.`)
    const table = schema.tables.find(t => t.id === e.tableId && t.kind === 'research')
    if (!table) throw new PublicError(`Entry ${i + 1} uses an unknown topic.`)
    if (!Array.isArray(e.values) || e.values.length !== table.columns.length) throw new PublicError(`Entry ${i + 1} has an invalid number of fields.`)
    const values = e.values.map((v, c) => text(v, `Entry ${i + 1}: ${table.columns[c]}`, 4000))
    // Review/assignment claims in the template never confer actual verified status.
    table.columns.forEach((column, c) => { if (/^Verified By$/i.test(column)) values[c] = '' })
    const baseline = table.rows?.find(row => row[0] && (row[0] === e.rowLabel || row[0] === values[0]))
    const substantive = values.filter((v, c) => {
      if (/^(source|link|verified by|recorded by|logged by)/i.test(table.columns[c])) return false
      if (baseline && (c === 0 || v === baseline[c])) return false
      return Boolean(v.trim())
    }).join('').trim()
    if (substantive.length < 1) throw new PublicError(`Entry ${i + 1} needs new research details, not just a template label or citation.`)
    if (!['observed', 'uncertain'].includes(e.certainty)) throw new PublicError(`Choose a confidence level for entry ${i + 1}.`)
    return { tableId: table.id, rowLabel: text(e.rowLabel, 'Row label', 500), values,
      sourceUrl: httpsUrl(e.sourceUrl), observedAt: date(e.observedAt, 'Observation date'), certainty: e.certainty, notes: text(e.notes, 'Notes', 4000) }
  })
  const result = { profile, entries, consent: true, website: '' }
  if (new TextEncoder().encode(JSON.stringify(result)).length > 200000) throw new PublicError('The submission is too large. Split it into smaller contributions.')
  return result
}
export function inspectImage(bytes, declaredMime) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 32 || bytes.length > MAX_PROOF_BYTES) throw new PublicError('Upload one PNG, JPEG, or WebP screenshot up to 3 MB.')
  let mime = ''
  if ([137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v) && String.fromCharCode(...bytes.slice(12,16)) === 'IHDR') {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    const width = view.getUint32(16), height = view.getUint32(20)
    if (!width || !height || width > 20000 || height > 20000 || width * height > 60000000) throw new PublicError('Screenshot dimensions are too large.')
    mime = 'image/png'
  } else if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 && bytes[bytes.length - 2] === 255 && bytes[bytes.length - 1] === 217) mime = 'image/jpeg'
  else if (String.fromCharCode(...bytes.slice(0,4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8,12)) === 'WEBP' && ['VP8 ', 'VP8L', 'VP8X'].includes(String.fromCharCode(...bytes.slice(12,16)))) mime = 'image/webp'
  if (!mime || declaredMime !== mime) throw new PublicError('The screenshot contents must match its PNG, JPEG, or WebP file type.')
  return mime
}
export async function sha256(value) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), v => v.toString(16).padStart(2, '0')).join('')
}
export function randomCode() {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
export async function readLimitedBody(request, limit) {
  const declared = Number(request.headers.get('content-length') || 0)
  if (declared > limit) throw new PublicError('Request is too large.', 413)
  if (!request.body) throw new PublicError('Request body is required.')
  const reader = request.body.getReader(), chunks = []
  let total = 0
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > limit) { await reader.cancel(); throw new PublicError('Request is too large.', 413) }
    chunks.push(value)
  }
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  return bytes
}
