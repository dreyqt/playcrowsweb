import type { FormData } from '../../types'
import { Btn, Card, Input } from '../ui'

export function StepPlayerInfo({
  data,
  onUpdate,
  onNext,
  onBack,
}: {
  data: FormData
  onUpdate: (partial: Partial<FormData>) => void
  onNext: () => void
  onBack: () => void
}) {
  const valid = data.playerId.trim() && data.username.trim()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-[#e8eaf0] mb-2">Player Information</h2>
        <p className="text-sm text-[#6b7280] leading-relaxed">
          Before you continue, please enter your Playcrows account information. This allows us to properly identify your account and process your support contribution.
        </p>
      </div>
      <Card className="p-6 flex flex-col gap-5">
        <Input label="Player ID" placeholder="Enter your Player ID" value={data.playerId} onChange={v => onUpdate({ playerId: v })} />
        <Input label="Username" placeholder="Enter your in-game username" value={data.username} onChange={v => onUpdate({ username: v })} />
      </Card>
      <div className="flex items-center justify-between">
        <Btn variant="ghost" onClick={onBack}>Back</Btn>
        <Btn onClick={onNext} disabled={!valid}>Continue to Payment</Btn>
      </div>
    </div>
  )
}
