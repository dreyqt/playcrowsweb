import type { FormData } from '../../types'
import { Btn, Card } from '../ui'
import { DiscordIcon, TicketIcon } from '../icons'

export function StepReceipt({
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
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-[#e8eaf0] mb-2">
          Submit Your Payment Receipt
        </h2>
        <p className="text-sm text-[#6b7280] leading-relaxed">
          After completing your payment, please submit your receipt through our
          Discord support channel so our staff can verify your transaction.
        </p>
      </div>

      <Card className="p-10 flex flex-col items-center text-center gap-6">
        <DiscordIcon />

        <div>
          <h3 className="text-xl font-semibold text-[#e8eaf0]">
            Submit Your Receipt on Discord
          </h3>

          <p className="mt-3 text-sm text-[#6b7280] max-w-lg leading-relaxed">
            Click the button below to open our Discord support channel and send
            your payment receipt. Our staff will review and verify your
            transaction as soon as possible.
          </p>
        </div>

        <Btn
          onClick={() =>
            window.open(
              "https://discord.com/channels/1527607490840100955/1527609980625227866",
              "_blank"
            )
          }
        >
          <DiscordIcon />
          Open Discord Support
        </Btn>
      </Card>

      <Card className="p-5 flex flex-col gap-4">
        <div className="text-xs font-semibold text-[#6b7280] uppercase tracking-widest">
          Need Additional Help?
        </div>

        <p className="text-xs text-[#6b7280] leading-relaxed">
          When contacting our staff, please include the following information to
          speed up the verification process.
        </p>

        <div className="bg-[#13161e] rounded-xl p-4 text-xs text-[#6b7280] leading-relaxed">
          Please include:
          <span className="text-[#e8eaf0]">
            {" "}
            Player ID · Username · Payment Method · Donation Amount · Receipt
          </span>
        </div>

        <div className="flex flex-wrap gap-3">
          <Btn
            variant="secondary"
            className="flex-1 min-w-[140px]"
            onClick={() =>
              window.open(
                "https://discord.com/channels/1527607490840100955/1527608168711061614",
                "_blank"
              )
            }
          >
            <DiscordIcon />
            Contact Customer Support
          </Btn>

          <Btn
            variant="ghost"
            className="flex-1 min-w-[140px]"
            onClick={() =>
              window.open(
                "https://discord.com/channels/1527607490840100955/1527609980625227866",
                "_blank"
              )
            }
          >
            <TicketIcon />
            Create a Ticket
          </Btn>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <Btn variant="ghost" onClick={onBack}>
          Back
        </Btn>

        <Btn onClick={onNext}>
          Continue to Summary
        </Btn>
      </div>
    </div>
  )
}