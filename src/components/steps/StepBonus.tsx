import { useEffect, useState } from 'react'
import type { FormData } from '../../types'
import type { PlayCrowsServer } from '../../server'
import { useI18n } from '../../i18n'
import { useBonusI18n } from '../../bonusI18n'
import {
  EVENT_BONUS_OPTION_COUNT,
  fetchEventBonusOptions,
  getEventBonusEntitlement,
  getEventBonusSelectionTotal,
  isEventBonusSelectionValid,
  type EventBonusOption,
} from '../../eventBonus'
import { Btn, Card } from '../ui'

function BonusOptionCard({ option, quantity, remaining, disabled, onAdd, onRemove }: {
  option: EventBonusOption
  quantity: number
  remaining: number
  disabled: boolean
  onAdd: (count: number) => void
  onRemove: () => void
}) {
  const { t } = useBonusI18n()
  const name = `EVENT${option.eventNumber} · ${option.title}`
  const selected = quantity > 0

  return (
    <Card className={`p-4 sm:p-5 ${selected ? '!border-[#c9aa68]/60 !bg-[#c9aa68]/8' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#c9aa68]">EVENT{option.eventNumber}</div>
          <h3 className="mt-1 break-words text-base font-bold text-[#eee9df]">{option.title}</h3>
        </div>
        <span className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${selected ? 'border-[#c9aa68]/50 bg-[#c9aa68]/10 text-[#e1c48b]' : 'border-[#3b414b] text-[#aaa49a]'}`}>
          {t('quantity', { count: quantity })}
        </span>
      </div>

      <div className="mt-4 border-t border-[#292d34] pt-3">
        <div className="text-[10px] font-bold uppercase tracking-widest text-[#aaa49a]">{t('bundleContents')}</div>
        <ul className="mt-2 grid gap-1.5 text-xs leading-5 text-[#aaa49a] sm:grid-cols-2">
          {option.rewards.map((reward, index) => (
            <li key={`${option.eventNumber}-${index}`} className="flex min-w-0 gap-2">
              <span className="text-[#c9aa68]" aria-hidden="true">◆</span>
              <span className="min-w-0 flex-1 break-words">{reward}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-label={t('addOneLabel', { name })}
          disabled={disabled || remaining <= 0}
          onClick={() => onAdd(1)}
          className="min-h-11 rounded-xl border border-[#c9aa68]/50 bg-[#c9aa68]/10 px-4 py-2.5 text-sm font-bold text-[#e1c48b] transition-colors hover:bg-[#c9aa68]/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9aa68] disabled:cursor-not-allowed disabled:opacity-35"
        >
          <span aria-hidden="true">+ </span>{t('addOne')}
        </button>
        <button
          type="button"
          aria-label={t('removeOneLabel', { name })}
          disabled={disabled || quantity <= 0}
          onClick={onRemove}
          className="h-11 w-11 rounded-xl border border-[#3b414b] bg-[#111318] text-xl font-bold text-[#eee9df] transition-colors hover:bg-[#292d34] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9aa68] disabled:cursor-not-allowed disabled:opacity-35"
        >
          −
        </button>
        {remaining > 1 && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onAdd(remaining)}
            className="min-h-11 max-w-full rounded-lg px-2 py-2 text-left text-xs leading-5 text-[#c9aa68] underline decoration-[#c9aa68]/40 underline-offset-4 hover:text-[#e1c48b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9aa68] disabled:cursor-not-allowed disabled:opacity-35"
          >
            {t('useRemaining', { count: remaining })}
          </button>
        )}
      </div>
    </Card>
  )
}

export function StepBonus({ server, data, selectedPackageAmount, onUpdate, onNext, onBack, onOptionsLoaded }: {
  server: PlayCrowsServer
  data: FormData
  selectedPackageAmount: number | null
  onUpdate: (partial: Partial<FormData>) => void
  onNext: () => void
  onBack: () => void
  onOptionsLoaded: (options: EventBonusOption[]) => void
}) {
  const { t: commonT } = useI18n()
  const { t } = useBonusI18n()
  const packageQuantity = Math.max(1, Math.floor(Number(data.packageQuantity) || 1))
  const entitlement = getEventBonusEntitlement(selectedPackageAmount, packageQuantity)
  const selectedCount = getEventBonusSelectionTotal(data.eventBonusSelections)
  const remaining = Math.max(0, entitlement - selectedCount)
  const [options, setOptions] = useState<EventBonusOption[]>([])
  const [loading, setLoading] = useState(entitlement > 0)
  const [loadError, setLoadError] = useState(false)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    let cancelled = false

    if (entitlement <= 0) {
      setOptions([])
      onOptionsLoaded([])
      setLoading(false)
      setLoadError(false)
      return () => { cancelled = true }
    }

    setLoading(true)
    setLoadError(false)
    setOptions([])
    onOptionsLoaded([])
    void fetchEventBonusOptions(server)
      .then(loadedOptions => {
        if (cancelled) return
        setOptions(loadedOptions)
        onOptionsLoaded(loadedOptions)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setLoadError(true)
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [server, entitlement, retry, onOptionsLoaded])

  useEffect(() => {
    if (entitlement <= 0 && Object.keys(data.eventBonusSelections ?? {}).length > 0) {
      onUpdate({ eventBonusSelections: {} })
    }
  }, [entitlement, data.eventBonusSelections, onUpdate])

  const expectedCount = EVENT_BONUS_OPTION_COUNT[server]
  const catalogComplete = options.length === expectedCount && Array.from(
    { length: expectedCount }, (_, index) => String(index + 1).padStart(3, '0')
  ).every(eventNumber => options.some(option => option.eventNumber === eventNumber))
  const catalogReady = !loading && !loadError && catalogComplete
  const valid = isEventBonusSelectionValid(server, entitlement, data.eventBonusSelections, options) &&
    (entitlement <= 0 || catalogReady)
  const selectedEntries = Object.entries(data.eventBonusSelections ?? {}).filter(([, quantity]) => quantity > 0)
  const needsReset = catalogReady && (
    selectedCount > entitlement || Object.entries(data.eventBonusSelections ?? {}).some(([eventNumber, quantity]) =>
      !Number.isSafeInteger(quantity) || quantity <= 0 || !options.some(option => option.eventNumber === eventNumber)
    )
  )

  const adjust = (eventNumber: string, delta: number) => {
    if (!catalogReady) return
    if (delta > 0 && delta > remaining) return
    const current = Math.max(0, Math.floor(Number(data.eventBonusSelections?.[eventNumber]) || 0))
    const nextQuantity = Math.max(0, current + delta)
    const selections = { ...(data.eventBonusSelections ?? {}) }
    if (nextQuantity > 0) selections[eventNumber] = nextQuantity
    else delete selections[eventNumber]
    onUpdate({ eventBonusSelections: selections })
  }

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-[#eee9df]">{t('title')}</h2>
        <p className="text-sm leading-6 text-[#aaa49a]">{t('intro')}</p>
      </div>

      {entitlement <= 0 ? (
        <Card className="p-5">
          <p className="text-sm font-semibold leading-6 text-[#eee9df]">{t('noBonus')}</p>
          <p className="mt-2 text-sm leading-6 text-[#aaa49a]">{t('noBonusDesc')}</p>
        </Card>
      ) : (
        <>
          <Card className="!border-[#c9aa68]/35 p-4 sm:p-5">
            <div className="text-lg font-bold leading-7 text-[#e1c48b]">
              {t('entitlement', { value: ((selectedPackageAmount ?? 0) * packageQuantity).toLocaleString(), count: entitlement })}
            </div>
            <p className="mt-2 text-xs leading-5 text-[#aaa49a]">{t('rule')}</p>
            <p className="mt-3 rounded-lg bg-[#0d0f13] px-3 py-2.5 text-sm leading-6 text-[#eee9df]">{t('example')}</p>
            <p className="mt-3 text-sm leading-6 text-[#aaa49a]">{t('chooseHint')}</p>
          </Card>

          <Card className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-[#eee9df]">{t('selectionSummary')}</h3>
              <button
                type="button"
                disabled={Object.keys(data.eventBonusSelections ?? {}).length === 0}
                onClick={() => onUpdate({ eventBonusSelections: {} })}
                className="min-h-11 rounded-lg px-2 text-xs text-[#c9aa68] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9aa68] disabled:cursor-not-allowed disabled:opacity-35"
              >{t('clear')}</button>
            </div>
            {selectedEntries.length === 0 ? (
              <p className="text-xs leading-5 text-[#aaa49a]">{t('emptySelection')}</p>
            ) : (
              <ul className="mt-1 space-y-2 text-sm text-[#eee9df]">
                {selectedEntries.sort(([a], [b]) => Number(a) - Number(b)).map(([eventNumber, quantity]) => {
                  const option = options.find(candidate => candidate.eventNumber === eventNumber)
                  return (
                    <li key={eventNumber} className="flex items-start justify-between gap-3">
                      <span className="min-w-0 break-words">EVENT{eventNumber}{option ? ` · ${option.title}` : ''}</span>
                      <strong className="shrink-0 text-[#e1c48b]">×{quantity}</strong>
                    </li>
                  )
                })}
              </ul>
            )}
            {needsReset && <p role="alert" className="mt-3 text-xs leading-5 text-[#ef8b8b]">{t('fixSelection')}</p>}
          </Card>

          {loading && <p role="status" className="rounded-xl border border-[#292d34] px-4 py-6 text-center text-sm text-[#aaa49a]">{t('loading')}</p>}

          {!loading && (loadError || !catalogComplete) && (
            <div className="rounded-xl border border-[#f59e0b]/35 bg-[#f59e0b]/5 p-4">
              <p role="alert" className="text-sm leading-6 text-[#f6c66f]">
                {loadError ? t('loadError') : t('catalogIncomplete', { loaded: options.length, expected: expectedCount })}
              </p>
              <Btn variant="secondary" className="mt-3" onClick={() => setRetry(value => value + 1)}>{t('retry')}</Btn>
            </div>
          )}

          {!loading && options.map(option => (
            <BonusOptionCard
              key={option.eventNumber}
              option={option}
              quantity={Math.max(0, Math.floor(Number(data.eventBonusSelections?.[option.eventNumber]) || 0))}
              remaining={remaining}
              disabled={!catalogReady}
              onAdd={count => adjust(option.eventNumber, count)}
              onRemove={() => adjust(option.eventNumber, -1)}
            />
          ))}
        </>
      )}

      <div className="sticky bottom-0 z-20 -mx-1 rounded-xl border border-[#3b414b] bg-[#111318] p-3 shadow-[0_-8px_24px_rgba(0,0,0,0.35)] sm:p-4">
        {entitlement > 0 && (
          <div role="status" aria-live="polite" aria-atomic="true" className="mb-3">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs font-semibold">
              <span className="text-[#eee9df]">{t('progress', { selected: selectedCount, total: entitlement })}</span>
              {!valid && <span className="text-[#e1c48b]">{needsReset ? t('fixSelection') : t('remaining', { count: remaining })}</span>}
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#292d34]" aria-hidden="true">
              <div className={`h-full rounded-full transition-[width] ${valid ? 'bg-[#22c55e]' : 'bg-[#c9aa68]'}`} style={{ width: `${Math.min(100, (selectedCount / entitlement) * 100)}%` }} />
            </div>
            {valid && <p className="mt-2 text-xs leading-5 text-[#7add9a]">{t('complete')}</p>}
          </div>
        )}
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-stretch gap-2 sm:flex sm:justify-between sm:gap-4">
          <Btn variant="ghost" className="!px-3" onClick={onBack}>{commonT('back')}</Btn>
          <Btn className="!px-3 text-center" onClick={() => { if (valid) onNext() }} disabled={!valid}>{t('reviewSubmission')}</Btn>
        </div>
      </div>
    </div>
  )
}
