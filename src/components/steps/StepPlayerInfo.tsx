import { useEffect, useRef, useState } from 'react'
import type { FormData } from '../../types'
import type { PlayCrowsServer } from '../../server'
import { BoostingPurchaseLimitError, checkBoostingPurchaseEligibility, isLimitedBoostingPackage } from '../../lib/boostingPurchaseLimit'
import { useI18n } from '../../i18n'
import { Btn, Card, Input } from '../ui'

export function StepPlayerInfo({ server, selectedPackageId, data, onUpdate, onNext, onBack }: {
  server: PlayCrowsServer
  selectedPackageId: string | null
  data: FormData
  onUpdate: (partial: Partial<FormData>) => void
  onNext: () => void
  onBack: () => void
}) {
  const { t } = useI18n()
  const valid = data.playerId.trim() && data.username.trim()
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')
  const activeRequest = useRef<AbortController | null>(null)
  const limited = isLimitedBoostingPackage(server, selectedPackageId)

  useEffect(() => () => activeRequest.current?.abort(), [])

  const continueToPayment = async () => {
    if (!valid || checking) return
    if (!limited) { onNext(); return }
    const controller = new AbortController()
    activeRequest.current = controller
    setError('')
    setChecking(true)
    try {
      await checkBoostingPurchaseEligibility(server, selectedPackageId, data.playerId, controller.signal,
        data.paymentMethod === 'paypal' && data.paypalPaymentStatus === 'COMPLETED' ? data.paypalOrderId : null)
      if (!controller.signal.aborted) onNext()
    } catch (cause) {
      if (!controller.signal.aborted) setError(t(cause instanceof BoostingPurchaseLimitError ? 'boostingLimitReached' : 'boostingAvailabilityFailed'))
    } finally {
      if (!controller.signal.aborted) setChecking(false)
    }
  }

  const updatePlayer = (partial: Partial<FormData>) => { setError(''); onUpdate(partial) }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-[#eee9df] mb-2">{t('playerInformation')}</h2>
        <p className="text-sm text-[#77746e] leading-relaxed">{t('playerInformationDesc')}</p>
      </div>
      {limited && <p className="rounded-xl border border-[#c9aa68]/30 bg-[#c9aa68]/5 p-4 text-sm text-[#f1d487]">{t('boostingV1Limit')}</p>}
      <fieldset disabled={checking} className="min-w-0 border-0 p-0">
        <Card className="p-6 flex flex-col gap-5">
          <Input label={t('username')} placeholder={t('loginIdPlaceholder')} value={data.playerId} onChange={v => updatePlayer({ playerId: v })} />
          <Input label={t('characterName')} placeholder={t('characterPlaceholder')} value={data.username} onChange={v => updatePlayer({ username: v })} />
        </Card>
      </fieldset>
      {error && <p role="alert" className="rounded-xl border border-[#ef4444]/35 bg-[#ef4444]/5 p-4 text-sm leading-6 text-[#ef8b8b]">{error}</p>}
      <div className="flex items-center justify-between">
        <Btn variant="ghost" onClick={onBack} disabled={checking}>{t('back')}</Btn>
        <Btn onClick={() => void continueToPayment()} disabled={!valid || checking}>{t(checking ? 'boostingCheckingAvailability' : 'continuePayment')}</Btn>
      </div>
    </div>
  )
}
