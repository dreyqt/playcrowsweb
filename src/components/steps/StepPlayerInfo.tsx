import type { FormData } from '../../types'
import { useI18n } from '../../i18n'
import { Btn, Card, Input } from '../ui'

export function StepPlayerInfo({ data, onUpdate, onNext, onBack }: {
  data: FormData
  onUpdate: (partial: Partial<FormData>) => void
  onNext: () => void
  onBack: () => void
}) {
  const { t } = useI18n()
  const valid = data.playerId.trim() && data.username.trim()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-[#eee9df] mb-2">{t('playerInformation')}</h2>
        <p className="text-sm text-[#77746e] leading-relaxed">{t('playerInformationDesc')}</p>
      </div>
      <Card className="p-6 flex flex-col gap-5">
        <Input label={t('username')} placeholder={t('loginIdPlaceholder')} value={data.playerId} onChange={v => onUpdate({ playerId: v })} />
        <Input label={t('characterName')} placeholder={t('characterPlaceholder')} value={data.username} onChange={v => onUpdate({ username: v })} />
      </Card>
      <div className="flex items-center justify-between">
        <Btn variant="ghost" onClick={onBack}>{t('back')}</Btn>
        <Btn onClick={onNext} disabled={!valid}>{t('continuePayment')}</Btn>
      </div>
    </div>
  )
}
