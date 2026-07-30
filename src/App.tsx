import { useState } from 'react'
import type { FormData } from './types'
import {
  StepProgress,
  StepAmount,
  StepPlayerInfo,
  StepPayment,
  StepReceipt,
  StepComplete,
} from './components/steps'
import { GiftPackages } from './components/GiftPackages'
import { CumulativeRewards } from './components/CumulativeRewards'
import { submitDonation } from './lib/submitDonation'
import CrowLogo from './assets/playcrows-icon.jpg'

type InformationTab = 'packages' | 'support' | 'cumulative'

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
  const [submissionReference, setSubmissionReference] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [activeTab, setActiveTab] =
    useState<InformationTab>('packages')
  const [selectedPackageAmount, setSelectedPackageAmount] =
    useState<number | null>(null)
  const [form, setForm] = useState<FormData>(INITIAL)

  const update = (partial: Partial<FormData>) => {
    setForm(current => ({
      ...current,
      ...partial,
    }))
  }

  const next = () => {
    if (step === 1 && selectedPackageAmount === null) {
      setActiveTab('packages')
      return
    }

    setSubmitError('')
    setActiveTab('support')
    setStep(current => current + 1)
  }

  const back = () => {
    setSubmitError('')
    setActiveTab('support')
    setStep(current => Math.max(1, current - 1))
  }

  const reset = () => {
    if (form.receiptPreview) {
      URL.revokeObjectURL(form.receiptPreview)
    }

    setForm(INITIAL)
    setStep(1)
    setSubmitted(false)
    setSubmissionReference('')
    setSubmitError('')
    setSelectedPackageAmount(null)
    setActiveTab('packages')
  }

  const selectGiftPackage = (amount: number) => {
    setSelectedPackageAmount(amount)

    update({
      currency: 'USD',
      amount: String(amount),
      customAmount: '',
    })

    setActiveTab('support')
  }

  const changeGiftPackage = () => {
    setSelectedPackageAmount(null)

    update({
      amount: '',
      customAmount: '',
    })

    setActiveTab('packages')
  }


  const submitForm = async () => {
    if (isSubmitting) return

    setIsSubmitting(true)
    setSubmitError('')

    try {
      const result = await submitDonation({
        data: form,
        selectedPackageAmount,
      })

      setSubmissionReference(result.donation.referenceCode)
      setSubmitted(true)
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Unable to submit the donation form. Please try again.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasSelectedPackage = selectedPackageAmount !== null
  const selectedAmount = selectedPackageAmount ?? 0

  const tabClass = (
    tab: InformationTab,
    disabled = false
  ) => {
    const base =
      'min-h-11 rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold transition-colors duration-200'

    if (disabled) {
      return `${base} cursor-not-allowed border border-transparent text-[#475569] opacity-60`
    }

    if (activeTab === tab) {
      return `${base} border border-[#66d4ff] bg-[#66d4ff]/10 text-[#66d4ff]`
    }

    return `${base} border border-transparent text-[#7c879d] hover:bg-[#171b24] hover:text-[#e8eaf0]`
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
          <section className="mx-auto flex max-w-xl flex-col items-center rounded-2xl border border-[#66d4ff]/35 bg-[#13161e] px-6 py-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#66d4ff]/40 bg-[#66d4ff]/10 text-3xl text-[#66d4ff]">
              ✓
            </div>

            <h1 className="mt-5 text-2xl font-bold text-[#e8eaf0]">
              Donation Form Submitted
            </h1>

            <p className="mt-3 max-w-md text-sm leading-6 text-[#7c879d]">
              Your submission is pending review. Save the reference code below
              in case you need to contact PlayCrows support.
            </p>

            <div className="mt-6 w-full rounded-xl border border-[#66d4ff]/30 bg-[#66d4ff]/5 px-4 py-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#7c879d]">
                Reference Code
              </div>
              <div className="mt-2 break-all font-mono text-xl font-bold text-[#66d4ff]">
                {submissionReference}
              </div>
            </div>

            <button
              type="button"
              onClick={reset}
              className="mt-7 min-h-11 rounded-lg border border-[#66d4ff] bg-[#66d4ff] px-5 py-2 text-sm font-bold text-[#06141b] transition-colors hover:bg-[#8ae2ff]"
            >
              Submit Another Form
            </button>
          </section>
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
                    disabled={hasSelectedPackage}
                    className={tabClass(
                      'packages',
                      hasSelectedPackage
                    )}
                    onClick={() => {
                      if (!hasSelectedPackage) {
                        setActiveTab('packages')
                      }
                    }}
                    title={
                      hasSelectedPackage
                        ? 'Use Change Package to select another package'
                        : 'Choose a gift package'
                    }
                  >
                    Gift Packages
                    {hasSelectedPackage && (
                      <span className="ml-1 text-[10px]">
                        🔒
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={!hasSelectedPackage}
                    className={tabClass(
                      'support',
                      !hasSelectedPackage
                    )}
                    onClick={() => {
                      if (hasSelectedPackage) {
                        setActiveTab('support')
                      }
                    }}
                    title={
                      hasSelectedPackage
                        ? 'Choose your currency and support amount'
                        : 'Select a gift package first'
                    }
                  >
                    Support Amount
                    {!hasSelectedPackage && (
                      <span className="ml-1 text-[10px]">
                        🔒
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    className={tabClass('cumulative')}
                    onClick={() => setActiveTab('cumulative')}
                  >
                    Cumulative Rewards
                  </button>
                </nav>

                {activeTab === 'packages' &&
                  !hasSelectedPackage && (
                    <GiftPackages
                      selectedAmount={selectedAmount}
                      onSelectAmount={selectGiftPackage}
                    />
                  )}

                {activeTab === 'support' &&
                  hasSelectedPackage && (
                    <section>
                      <div className="mb-6 flex flex-col gap-4 rounded-xl border border-[#66d4ff]/30 bg-[#66d4ff]/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#7c879d]">
                            Initial Gift Package Selection
                          </div>

                          <div className="text-xl font-bold text-[#66d4ff]">
                            ${selectedAmount.toLocaleString()}
                          </div>

                          <p className="mt-1 text-xs text-[#7c879d]">
                            You may freely choose your currency and
                            support amount below.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={changeGiftPackage}
                          className="min-h-10 rounded-lg border border-[#66d4ff]/50 bg-[#66d4ff]/10 px-4 py-2 text-xs font-bold text-[#66d4ff] transition-colors hover:border-[#66d4ff] hover:bg-[#66d4ff]/20"
                        >
                          Change Package
                        </button>
                      </div>

                      <StepAmount
                        data={form}
                        onUpdate={update}
                        onNext={next}
                      />
                    </section>
                  )}

                {activeTab === 'cumulative' && (
                  <CumulativeRewards />
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
                selectedPackageAmount={selectedPackageAmount}
                onSubmit={submitForm}
                onBack={back}
                isSubmitting={isSubmitting}
                submitError={submitError}
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
