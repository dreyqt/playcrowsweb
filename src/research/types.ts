import schema from './schema.json'

export interface ResearchTable {
  id: string
  sectionId: string
  title: string
  groupId: string
  groupTitle: string
  kind: string
  intro: string
  columns: string[]
  rows: string[][]
  selectColumns: Record<string, string[]>
}

export const RESEARCH_TABLES = schema.tables.filter(table => table.kind === 'research') as ResearchTable[]
export const DRAFT_KEY = 'playcrows:official-research:v1'
export const MAX_ENTRIES = 30
export const MAX_PROOF_BYTES = 3 * 1024 * 1024

export interface ResearchProfile {
  displayName: string
  contact: string
  region: 'Global' | 'Korea'
  server: string
  characterName: string
  characterClass: 'Orb' | 'Cannon' | 'Gauntlets' | 'Other'
  level: number
  playedSince: string
  lastPlayed: string
}

export interface ResearchEntry {
  tableId: string
  rowLabel: string
  values: string[]
  sourceUrl: string
  observedAt: string
  certainty: 'observed' | 'uncertain'
  notes: string
}

export interface ResearchPayload {
  profile: ResearchProfile
  entries: ResearchEntry[]
  consent: true
  website: string
}

export interface EntryComposer {
  tableId: string
  rowKey: string
  customLabel: string
  values: string[]
  sourceUrl: string
  observedAt: string
  certainty: 'observed' | 'uncertain'
  notes: string
}

export interface ResearchDraft {
  version: 1
  savedAt: string
  requestId: string
  profile: Omit<ResearchProfile, 'contact' | 'level'> & { level: string }
  entries: ResearchEntry[]
  composer: EntryComposer
}

export function topicTitle(table: ResearchTable): string {
  return table.id === 'section-35-2' ? '9. Community Feedback' : table.title
}

export function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname.includes('.') && !url.username && !url.password
      && !url.hostname.endsWith('.local') && !/^[\d.]+$/.test(url.hostname) && !url.hostname.startsWith('[')
  } catch { return false }
}

export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T12:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function shortString(value: unknown, max = 2000): value is string {
  return typeof value === 'string' && value.length <= max
}

export function isValidEntry(value: unknown): value is ResearchEntry {
  if (!record(value)) return false
  const table = RESEARCH_TABLES.find(item => item.id === value.tableId)
  return Boolean(table) && shortString(value.rowLabel, 200)
    && Array.isArray(value.values) && value.values.length === table!.columns.length
    && value.values.every(cell => shortString(cell))
    && table!.columns.every((column, index) => column !== 'Verified By' || value.values![index as never] === '')
    && shortString(value.sourceUrl, 2048) && isHttpsUrl(value.sourceUrl)
    && shortString(value.observedAt, 10) && validDate(value.observedAt)
    && (value.certainty === 'observed' || value.certainty === 'uncertain')
    && shortString(value.notes)
}

/** Browser drafts are untrusted input. Never restore executable markup or secrets. */
export function parseDraft(raw: string): ResearchDraft {
  if (raw.length > 500_000) throw new Error('This saved draft is too large to restore.')
  const data: unknown = JSON.parse(raw)
  if (!record(data) || data.version !== 1 || !shortString(data.savedAt, 40)
    || !shortString(data.requestId, 36) || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.requestId)
    || !record(data.profile) || !record(data.composer)
    || !Array.isArray(data.entries) || data.entries.length > MAX_ENTRIES || !data.entries.every(isValidEntry)) {
    throw new Error('This saved draft is not valid for the current research form.')
  }
  const profile = data.profile
  for (const key of ['displayName', 'server', 'characterName', 'level', 'playedSince', 'lastPlayed']) {
    if (!shortString(profile[key], 120)) throw new Error('The saved player details are invalid.')
  }
  if (!['Global', 'Korea'].includes(String(profile.region)) || !['Orb', 'Cannon', 'Gauntlets', 'Other'].includes(String(profile.characterClass))) {
    throw new Error('The saved player details are invalid.')
  }
  const composer = data.composer
  const table = RESEARCH_TABLES.find(item => item.id === composer.tableId)
  if (!table || !shortString(composer.rowKey, 20) || !shortString(composer.customLabel, 200)
    || !Array.isArray(composer.values) || composer.values.length !== table.columns.length || !composer.values.every(value => shortString(value))
    || !shortString(composer.sourceUrl, 2048) || !shortString(composer.observedAt, 10)
    || !['observed', 'uncertain'].includes(String(composer.certainty)) || !shortString(composer.notes)) {
    throw new Error('The saved entry is invalid.')
  }
  if (composer.rowKey !== 'custom' && (!/^\d+$/.test(composer.rowKey) || !table.rows[Number(composer.rowKey)])) {
    throw new Error('The saved entry refers to an unavailable template row.')
  }
  // Pick exact fields so unexpected stored properties cannot enter the submitted payload.
  return {
    version: 1,
    savedAt: data.savedAt,
    requestId: data.requestId,
    profile: {
      displayName: profile.displayName as string,
      server: profile.server as string,
      characterName: profile.characterName as string,
      characterClass: profile.characterClass as ResearchProfile['characterClass'],
      region: profile.region as ResearchProfile['region'],
      level: profile.level as string,
      playedSince: profile.playedSince as string,
      lastPlayed: profile.lastPlayed as string,
    },
    entries: data.entries.map(entry => ({
      tableId: entry.tableId, rowLabel: entry.rowLabel, values: [...entry.values],
      sourceUrl: entry.sourceUrl, observedAt: entry.observedAt, certainty: entry.certainty, notes: entry.notes,
    })),
    composer: {
      tableId: table.id,
      rowKey: composer.rowKey,
      customLabel: composer.customLabel,
      values: composer.values.map((value, index) => table.columns[index] === 'Verified By' ? '' : value) as string[],
      sourceUrl: composer.sourceUrl,
      observedAt: composer.observedAt,
      certainty: composer.certainty as EntryComposer['certainty'],
      notes: composer.notes,
    },
  }
}
