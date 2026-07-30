import { useState } from 'react'
import type { FormData } from './types'
import {
  StepProgress,
  StepAmount,
  StepPlayerInfo,
  StepPayment,
  StepReceipt,
  StepComplete,
  SuccessScreen,
} from './components/steps'
import { GiftPackages } from './components/GiftPackages'
import CrowLogo from './assets/playcrows-icon.jpg'

type InformationTab = 'support' | 'packages' | 'cumulative'

const INITIAL: FormData = {
  currency: 'USD',
  amount: '',
  customAmount: '',
  playerId: '',
  username: '',
  paymentMethod: null,
  receiptFile: null,
  receiptPreview: null,
}

export default function App() {
  const [step, setStep] = useState(1)
  const [submitted, setSubmitted] = useState(false)
  const [activeTab, setActiveTab] =
    useState<InformationTab>('support')
  const [form, setForm] = useState<FormData>(INITIAL)

  const update = (partial: Partial<FormData>) => {
    setForm(current => ({
      ...current,
      ...partial,
    }))
  }

  const next = () => {
    setActiveTab('support')
    setStep(current => current + 1)
  }

  const back = () => {
    setActiveTab('support')
    setStep(current => current - 1)
  }

  const reset = () => {
    setForm(INITIAL)
    setStep(1)
    setSubmitted(false)
    setActiveTab('support')
  }

  const selectGiftPackage = (amount: number) => {
    update({
      currency: 'USD',
      amount: String(amount),
      customAmount: '',
    })

    setActiveTab('support')
  }

  const selectedAmount = Number(
    form.customAmount || form.amount || 0
  )

  const tabClass = (tab: InformationTab) => {
    const base =
      'min-h-11 rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold transition-colors duration-200'

    const active =
      'border border-[#f5a623] bg-[#f5a623]/10 text-[#f5a623]'

    const inactive =
      'border border-transparent text-[#7c879d] hover:bg-[#171b24] hover:text-[#e8eaf0]'

    return `${base} ${
      activeTab === tab ? active : inactive
    }`
  }

  return (
    <div className="min-h-screen bg-[#0d0f14] text-[#e8eaf0]">
      <header className="sticky top-0 z-50 border-b border-[#191d27] bg-[#0d0f14]">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-4">
          <img
            src={CrowLogo}
            alt="PlayCrows logo"
            className="h-10 w-10 rounded-full object-cover"
          />

          <div>
            <div className="text-base font-bold leading-tight tracking-tight text-[#e8eaf0]">
              PLAYCROWS
            </div>

            <div className="text-[10px] uppercase tracking-widest text-[#6b7280]">
              by Hawk
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-10">
        {submitted ? (
          <SuccessScreen onReset={reset} />
        ) : (
          <>
            <StepProgress current={step} />

            {step === 1 && (
              <>
                <nav
                  className="mb-8 mt-8 grid grid-cols-1 gap-1 rounded-xl border border-[#242a36] bg-[#11151d] p-1 sm:grid-cols-3"
                  aria-label="Support information"
                >
                  <button
                    type="button"
                    className={tabClass('support')}
                    onClick={() => setActiveTab('support')}
                  >
                    Support Amount
                  </button>

                  <button
                    type="button"
                    className={tabClass('packages')}
                    onClick={() => setActiveTab('packages')}
                  >
                    Gift Packages
                  </button>

                  <button
                    type="button"
                    className={tabClass('cumulative')}
                    onClick={() => setActiveTab('cumulative')}
                  >
                    Cumulative Rewards
                  </button>
                </nav>

                {activeTab === 'support' && (
                  <StepAmount
                    data={form}
                    onUpdate={update}
                    onNext={next}
                  />
                )}

                {activeTab === 'packages' && (
                  <GiftPackages
                    selectedAmount={selectedAmount}
                    onSelectAmount={selectGiftPackage}
                  />
                )}

                {activeTab === 'cumulative' && (
                  <section>
                    <div className="mb-6">
                      <h2 className="mb-2 text-2xl font-bold text-[#e8eaf0]">
                        Cumulative Rewards
                      </h2>

                      <p className="text-sm text-[#7c879d]">
                        Earn additional rewards when your accumulated
                        support reaches each milestone.
                      </p>
                    </div>

                    <div className="rounded-xl border border-[#242a36] bg-[#11151d] p-6">
                      <div className="flex min-h-40 flex-col items-center justify-center text-center">
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-[#f5a623]/30 bg-[#f5a623]/10 text-xl text-[#f5a623]">
                          ★
                        </div>

                        <h3 className="mb-2 font-semibold text-[#e8eaf0]">
                          Cumulative rewards coming soon
                        </h3>

                        <p className="max-w-md text-sm leading-6 text-[#7c879d]">
                          The complete milestone and reward list will be
                          displayed here.
                        </p>
                      </div>
                    </div>
                  </section>
                )}
              </>
            )}

            {step === 2 && (
              <StepPlayerInfo
                data={form}
                onUpdate={update}
                onNext={next}
                onBack={back}
              />
            )}

            {step === 3 && (
              <StepPayment
                data={form}
                onUpdate={update}
                onNext={next}
                onBack={back}
              />
            )}

            {step === 4 && (
              <StepReceipt
                data={form}
                onUpdate={update}
                onNext={next}
                onBack={back}
              />
            )}

            {step === 5 && (
              <StepComplete
                data={form}
                onSubmit={() => setSubmitted(true)}
                onBack={back}
              />
            )}
          </>
        )}
      </main>

      <footer className="mt-16 border-t border-[#191d27]">
        <div className="mx-auto max-w-2xl px-4 py-6 text-center text-xs text-[#6b7280]">
          2026 Playcrows by Hawk - All contributions are voluntary
          support donations.
        </div>
      </footer>
    </div>
  )
}