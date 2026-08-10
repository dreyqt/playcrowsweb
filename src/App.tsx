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
import {
  EARLY_PROMO_CODE,
  isEarlyPromoActive,
  isPackageEligibleForPromo,
  normalizePromoCode,
  type PromoApplyResult,
} from './promo'
import CrowLogo from './assets/playcrows-icon.jpg'
import { findGiftPackage } from './giftPackageData'
import { I18nProvider, useI18n } from './i18n'
import { LanguageSelector } from './components/LanguageSelector'

type InformationTab = 'packages' | 'support' | 'cumulative'

const INITIAL: FormData = {
  currency: 'USD',
  amount: '',
  packageQuantity: '1',
  playerId: '',
  username: '',
  paymentMethod: null,
  receiptFile: null,
  receiptPreview: null,
  additionalNotes: '',
}

function PublicApp() {
  const { t } = useI18n()
  const [step, setStep] = useState(1)
  const [submitted, setSubmitted] = useState(false)
  const [submissionReference, setSubmissionReference] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [appliedPromoCode, setAppliedPromoCode] =
    useState<string | null>(null)
  const [activeTab, setActiveTab] =
    useState<InformationTab>('packages')
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(INITIAL)

  const update = (partial: Partial<FormData>) => {
    /*
     * Changing the amount or currency invalidates an already-applied
     * promo code. The player can apply the code again after finishing
     * their new selection.
     */
    if (
      'amount' in partial ||
      'packageQuantity' in partial ||
      'currency' in partial
    ) {
      setAppliedPromoCode(null)
    }

    setForm(current => ({
      ...current,
      ...partial,
    }))
  }

  const next = () => {
    if (step === 1 && selectedPackageId === null) {
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
    setAppliedPromoCode(null)
    setSelectedPackageId(null)
    setActiveTab('packages')
  }

  const selectGiftPackage = (packageId: string) => {
    const giftPackage = findGiftPackage(packageId)
    if (!giftPackage) return

    setAppliedPromoCode(null)
    setSelectedPackageId(packageId)

    update({
      currency: 'USD',
      amount: String(giftPackage.amount),
      packageQuantity: '1',
    })

    setActiveTab('support')
  }

  const changeGiftPackage = () => {
    setAppliedPromoCode(null)
    setSelectedPackageId(null)

    update({
      amount: '',
      packageQuantity: '1',
    })

    setActiveTab('packages')
  }

  const applyPromoCode = (code: string): PromoApplyResult => {
    const normalizedCode = normalizePromoCode(code)

    if (!isEarlyPromoActive()) {
      setAppliedPromoCode(null)

      return {
        success: false,
        message:
          t('promoEnded'),
      }
    }

    if (normalizedCode !== EARLY_PROMO_CODE) {
      setAppliedPromoCode(null)

      return {
        success: false,
        message: t('invalidRedeem'),
      }
    }

    if (
      !isPackageEligibleForPromo(
        form,
        selectedPackage?.amount ?? null
      )
    ) {
      setAppliedPromoCode(null)

      return {
        success: false,
        message:
          t('promoNotEligible'),
      }
    }

    setAppliedPromoCode(EARLY_PROMO_CODE)

    return {
      success: true,
      message:
        t('promoApplied'),
    }
  }

  const removePromoCode = () => {
    setAppliedPromoCode(null)
  }

  const submitForm = async () => {
    if (isSubmitting) return

    if (
      appliedPromoCode &&
      !isEarlyPromoActive()
    ) {
      setAppliedPromoCode(null)
      setSubmitError(
        t('promoExpiredReview')
      )
      return
    }

    setIsSubmitting(true)
    setSubmitError('')

    try {
      const result = await submitDonation({
        data: form,
        selectedPackageAmount: selectedPackage?.amount ?? null,
        selectedPackageId,
        selectedPackageTitle: selectedPackage?.title ?? null,
        promoCode: appliedPromoCode,
      })

      setSubmissionReference(result.donation.referenceCode)
      setSubmitted(true)
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : t('unableSubmit')
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedPackage = findGiftPackage(selectedPackageId)
  const hasSelectedPackage = selectedPackage !== null

  const tabClass = (
    tab: InformationTab,
    disabled = false
  ) => {
    const base =
      'min-h-11 rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold transition-colors duration-200'

    if (disabled) {
      return `${base} cursor-not-allowed border border-transparent text-[#5d5b57] opacity-60`
    }

    if (activeTab === tab) {
      return `${base} border border-[#c9aa68] bg-[#c9aa68]/10 text-[#c9aa68]`
    }

    return `${base} border border-transparent text-[#8f8b84] hover:bg-[#181b21] hover:text-[#eee9df]`
  }

  return (
    <div className="min-h-screen bg-[#0a0b0d] text-[#eee9df]">
      <header className="sticky top-0 z-50 border-b border-[#171a20] bg-[#0a0b0d]">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src={CrowLogo}
              alt="PlayCrows logo"
              className="h-10 w-10 rounded-full object-cover"
            />

            <div className="min-w-0">
              <div className="text-base font-bold leading-tight tracking-tight text-[#eee9df]">
                PLAYCROWS
              </div>

              <div className="truncate text-[10px] uppercase tracking-widest text-[#77746e]">
                {t('developmentTeam')}
              </div>
            </div>
          </div>

          <LanguageSelector />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-10">
        {submitted ? (
          <section className="mx-auto flex max-w-xl flex-col items-center rounded-2xl border border-[#c9aa68]/35 bg-[#111318] px-6 py-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#c9aa68]/40 bg-[#c9aa68]/10 text-3xl text-[#c9aa68]">
              ✓
            </div>

            <h1 className="mt-5 text-2xl font-bold text-[#eee9df]">
              {t('donationSubmitted')}
            </h1>

            <p className="mt-3 max-w-md text-sm leading-6 text-[#8f8b84]">
              {t('donationSubmittedDesc')}
            </p>

            <div className="mt-6 w-full rounded-xl border border-[#c9aa68]/30 bg-[#c9aa68]/5 px-4 py-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#8f8b84]">
                {t('referenceCode')}
              </div>
              <div className="mt-2 break-all font-mono text-xl font-bold text-[#c9aa68]">
                {submissionReference}
              </div>
            </div>

            <button
              type="button"
              onClick={reset}
              className="mt-7 min-h-11 rounded-lg border border-[#c9aa68] bg-[#c9aa68] px-5 py-2 text-sm font-bold text-[#16120b] transition-colors hover:bg-[#e1c88d]"
            >
              {t('submitAnother')}
            </button>
          </section>
        ) : (
          <>
            <StepProgress current={step} />

            {step === 1 && (
              <>
                <nav
                  className="mb-8 mt-8 grid grid-cols-1 gap-1 rounded-xl border border-[#292d34] bg-[#0f1115] p-1 sm:grid-cols-3"
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
                        ? t('changePackageHint')
                        : t('choosePackageHint')
                    }
                  >
                    {t('webShop')}
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
                        ? t('chooseSupportHint')
                        : t('selectPackageFirst')
                    }
                  >
                    {t('supportAmount')}
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
                    {t('cumulativeRewards')}
                  </button>
                </nav>

                {activeTab === 'packages' &&
                  !hasSelectedPackage && (
                    <GiftPackages
                      selectedPackageId={selectedPackageId}
                      onSelectPackage={selectGiftPackage}
                    />
                  )}

                {activeTab === 'support' &&
                  hasSelectedPackage && (
                    <section>
                      <div className="mb-6 flex flex-col gap-4 rounded-xl border border-[#c9aa68]/30 bg-[#c9aa68]/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#8f8b84]">
                            {t('initialPackage')}
                          </div>

                          <div className="text-xl font-bold text-[#c9aa68]">
                            {selectedPackage?.title} · ${selectedPackage?.amount.toLocaleString()}
                          </div>

                          <p className="mt-1 text-xs text-[#8f8b84]">
                            {t('packageSelectionDesc')}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={changeGiftPackage}
                          className="min-h-10 rounded-lg border border-[#c9aa68]/50 bg-[#c9aa68]/10 px-4 py-2 text-xs font-bold text-[#c9aa68] transition-colors hover:border-[#c9aa68] hover:bg-[#c9aa68]/20"
                        >
                          {t('changePackage')}
                        </button>
                      </div>

                      <StepAmount
                        data={form}
                        packageAmount={selectedPackage?.amount ?? 0}
                        packageTitle={selectedPackage?.title ?? ''}
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
                selectedPackageAmount={selectedPackage?.amount ?? null}
                appliedPromoCode={appliedPromoCode}
                onApplyPromoCode={applyPromoCode}
                onRemovePromoCode={removePromoCode}
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
                selectedPackageAmount={selectedPackage?.amount ?? null}
                selectedPackageTitle={selectedPackage?.title ?? null}
                promoCode={appliedPromoCode}
                onSubmit={submitForm}
                onBack={back}
                isSubmitting={isSubmitting}
                submitError={submitError}
              />
            )}
          </>
        )}
      </main>

      <footer className="mt-16 border-t border-[#171a20]">
        <div className="mx-auto max-w-2xl px-4 py-6 text-center text-xs text-[#77746e]">
          {t('voluntaryFooter')}
        </div>
      </footer>
    </div>
  )
}


export default function App() {
  return (
    <I18nProvider>
      <PublicApp />
    </I18nProvider>
  )
}
