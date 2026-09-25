import type { PlayCrowsServer } from './server'
import { supabase } from './lib/supabase'

export type EventBonusSelectionCounts = Record<string, number>

export type EventBonusOption = {
  eventNumber: string
  title: string
  rewards: string[]
}

export const EVENT_BONUS_OPTION_COUNT: Record<PlayCrowsServer, number> = {
  v1: 7,
  v2: 6,
}

export function normalizeEventNumber(value: unknown) {
  const raw = String(value ?? '').trim()
  if (!/^\d+$/.test(raw)) return null
  const number = Number(raw)
  if (!Number.isInteger(number) || number <= 0) return null
  return String(number).padStart(3, '0')
}

export function getEventBonusEntitlement(
  selectedPackageAmount: number | null,
  packageQuantity: string | number
) {
  if (selectedPackageAmount === null || !Number.isFinite(selectedPackageAmount)) return 0
  const quantity = Math.max(1, Math.floor(Number(packageQuantity) || 1))
  return Math.max(0, Math.floor((selectedPackageAmount * quantity) / 100))
}

export function getEventBonusSelectionTotal(selections: EventBonusSelectionCounts | null | undefined) {
  return Object.values(selections ?? {}).reduce((total, value) => {
    const count = Number(value)
    return total + (Number.isInteger(count) && count > 0 ? count : 0)
  }, 0)
}

/** Shared by the bonus step and final review so incomplete choices cannot be submitted. */
export function isEventBonusSelectionValid(
  server: PlayCrowsServer,
  entitlement: number,
  selections: EventBonusSelectionCounts,
  options: EventBonusOption[]
) {
  if (!Number.isInteger(entitlement) || entitlement < 0) return false
  const entries = Object.entries(selections)
  if (entitlement === 0) return entries.length === 0

  const validEvents = new Set(options.map(option => option.eventNumber))
  for (let event = 1; event <= EVENT_BONUS_OPTION_COUNT[server]; event++) {
    if (!validEvents.has(String(event).padStart(3, '0'))) return false
  }

  return entries.every(([eventNumber, count]) =>
    /^\d{3}$/.test(eventNumber) &&
    Number(eventNumber) >= 1 &&
    Number(eventNumber) <= EVENT_BONUS_OPTION_COUNT[server] &&
    validEvents.has(eventNumber) &&
    Number.isInteger(count) && count > 0
  ) && getEventBonusSelectionTotal(selections) === entitlement
}

function rowsToOptions(
  rows: Array<{ event_number?: unknown; title?: unknown; rewards?: unknown }>,
  server: PlayCrowsServer
) {
  const maxEvent = EVENT_BONUS_OPTION_COUNT[server]
  const options = new Map<string, EventBonusOption>()

  for (const row of rows) {
    const eventNumber = normalizeEventNumber(row.event_number)
    if (!eventNumber) continue
    const numericEvent = Number(eventNumber)
    if (numericEvent < 1 || numericEvent > maxEvent || options.has(eventNumber)) continue

    options.set(eventNumber, {
      eventNumber,
      title: typeof row.title === 'string' && row.title.trim()
        ? row.title.trim()
        : `EVENT${eventNumber}`,
      rewards: Array.isArray(row.rewards)
        ? row.rewards.filter((reward): reward is string => typeof reward === 'string' && reward.trim().length > 0)
        : [],
    })
  }

  return [...options.values()].sort((a, b) => Number(a.eventNumber) - Number(b.eventNumber))
}

/**
 * Loads the server-scoped donation bonus catalog. The RPC intentionally exposes
 * only event number/title/rewards, including current draft event rewards used by
 * the webshop. A published-event fallback keeps older deployments readable while
 * the new migration is being applied.
 */
export async function fetchEventBonusOptions(server: PlayCrowsServer): Promise<EventBonusOption[]> {
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    'get_donation_event_bonus_catalog',
    { p_server: server }
  )

  if (!rpcError && Array.isArray(rpcData)) {
    return rowsToOptions(rpcData as Array<{ event_number?: unknown; title?: unknown; rewards?: unknown }>, server)
  }

  const { data, error } = await supabase
    .from('events')
    .select('event_number, title, rewards, updated_at')
    .eq('server', server)
    .in('status', ['active', 'ended'])
    .not('published_at', 'is', null)
    .order('updated_at', { ascending: false })

  if (error) {
    throw new Error(rpcError?.message || error.message || 'Unable to load event bonus rewards.')
  }

  return rowsToOptions(
    (data ?? []) as Array<{ event_number?: unknown; title?: unknown; rewards?: unknown }>,
    server
  )
}

export function summarizeEventBonusSelections(selections: EventBonusSelectionCounts | null | undefined) {
  return Object.entries(selections ?? {})
    .filter(([, quantity]) => Number.isInteger(Number(quantity)) && Number(quantity) > 0)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([eventNumber, quantity]) => `EVENT${normalizeEventNumber(eventNumber) ?? eventNumber} ×${Number(quantity)}`)
    .join(', ')
}
