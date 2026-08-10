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
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<InformationTab>('packages')
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(INITIAL)

  const update = (partial: Partial<FormData>) => {
    if ('amount' in partial || 'packageQuantity' in partial || 'currency' in partial) {
      setAppliedPromoCode(null)
    }

    setForm(current => ({ ...current, ...partial }))
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
    if (form.receiptPreview) URL.revokeObjectURL(form.receiptPreview)

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
    update({ amount: '', packageQuantity: '1' })
    setActiveTab('packages')
  }

  const selectedPackage = findGiftPackage(selectedPackageId)
  const hasSelectedPackage = selectedPackage !== null

  const applyPromoCode = (code: string): PromoApplyResult => {
    const normalizedCode = normalizePromoCode(code)

    if (!isEarlyPromoActive()) {
      setAppliedPromoCode(null)
      return { success: false, message: t('promoEnded') }
    }

    if (normalizedCode !== EARLY_PROMO_CODE) {
      setAppliedPromoCode(null)
      return { success: false, message: t('invalidRedeem') }
    }

    if (!isPackageEligibleForPromo(form, selectedPackage?.amount ?? null)) {
      setAppliedPromoCode(null)
      return { success: false, message: t('promoNotEligible') }
    }

    setAppliedPromoCode(EARLY_PROMO_CODE)
    return { success: true, message: t('promoApplied') }
  }

  const removePromoCode = () => setAppliedPromoCode(null)

  const submitForm = async () => {
    if (isSubmitting) return

    if (appliedPromoCode && !isEarlyPromoActive()) {
      setAppliedPromoCode(null)
      setSubmitError(t('promoExpiredReview'))
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
      setSubmitError(error instanceof Error ? error.message : t('unableSubmit'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const tabClass = (tab: InformationTab, disabled = false) => {
    const base = 'min-h-11 rounded-sm px-3 py-2 text-xs sm:text-sm font-semibold transition-all duration-200'

    if (disabled) {
      return `${base} cursor-not-allowed border border-transparent text-[#635c58] opacity-50`
    }

    if (activeTab === tab) {
      return `${base} border border-[#a76636] bg-[#7a321e]/25 text-[#f0c08a] shadow-[inset_0_0_20px_rgba(159,65,37,.12)]`
    }

    return `${base} border border-transparent text-[#9b918c] hover:bg-[#2a1713]/45 hover:text-[#f0ddd0]`
  }

  return (
    <div className="site-shell">
      <section className="shop-stage" id="web-shop">
        <div className="shop-stage__veil" aria-hidden="true" />
        <div className="shop-wrap">
          <header className="shop-topbar">
            <div className="shop-brand">
              <span className="shop-brand__crest">♜</span>
              <div><strong>PLAYCROWS</strong><small>{t('developmentTeam')}</small></div>
            </div>
            <LanguageSelector />
          </header>

          <div className="shop-heading">
            <div>
              <span className="shop-heading__eyebrow">NIGHT CROWS · PREMIUM SUPPORT CENTER</span>
              <h2>{t('webShop')}</h2>
              <p>Support the server and choose the package that gives you the rewards you want.</p>
            </div>
            <div className="shop-status"><i /> SECURE SUBMISSION</div>
          </div>

          <div className="shop-benefits">
            <div><strong>Premium Packages</strong><span>Curated progression rewards</span></div>
            <div><strong>Multiple Payment Options</strong><span>Choose your preferred method</span></div>
            <div><strong>Manual Verification</strong><span>Every submission is reviewed</span></div>
          </div>

          <div className="shop-panel">
            {submitted ? (
              <section className="submission-success">
                <div className="submission-success__icon">✓</div>
                <h1>{t('donationSubmitted')}</h1>
                <p>{t('donationSubmittedDesc')}</p>
                <div className="submission-reference">
                  <span>{t('referenceCode')}</span>
                  <strong>{submissionReference}</strong>
                </div>
                <button type="button" onClick={reset} className="cinematic-button">
                  {t('submitAnother')}
                </button>
              </section>
            ) : (
              <>
                <StepProgress current={step} />

                {step === 1 && (
                  <>
                    <nav className="shop-tabs" aria-label="Support information">
                      <button
                        type="button"
                        disabled={hasSelectedPackage}
                        className={tabClass('packages', hasSelectedPackage)}
                        onClick={() => !hasSelectedPackage && setActiveTab('packages')}
                        title={hasSelectedPackage ? t('changePackageHint') : t('choosePackageHint')}
                      >
                        {t('webShop')}{hasSelectedPackage && <span className="ml-1 text-[10px]">◆</span>}
                      </button>

                      <button
                        type="button"
                        disabled={!hasSelectedPackage}
                        className={tabClass('support', !hasSelectedPackage)}
                        onClick={() => hasSelectedPackage && setActiveTab('support')}
                        title={hasSelectedPackage ? t('chooseSupportHint') : t('selectPackageFirst')}
                      >
                        {t('supportAmount')}{!hasSelectedPackage && <span className="ml-1 text-[10px]">◆</span>}
                      </button>

                      <button type="button" className={tabClass('cumulative')} onClick={() => setActiveTab('cumulative')}>
                        {t('cumulativeRewards')}
                      </button>
                    </nav>

                    {activeTab === 'packages' && !hasSelectedPackage && (
                      <GiftPackages selectedPackageId={selectedPackageId} onSelectPackage={selectGiftPackage} />
                    )}

                    {activeTab === 'support' && hasSelectedPackage && (
                      <section>
                        <div className="selected-package-banner">
                          <div>
                            <div className="selected-package-banner__label">{t('initialPackage')}</div>
                            <div className="selected-package-banner__title">
                              {selectedPackage?.title} · ${selectedPackage?.amount.toLocaleString()}
                            </div>
                            <p>{t('packageSelectionDesc')}</p>
                          </div>
                          <button type="button" onClick={changeGiftPackage} className="ghost-cinematic-button">
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

                    {activeTab === 'cumulative' && <CumulativeRewards />}
                  </>
                )}

                {step === 2 && <StepPlayerInfo data={form} onUpdate={update} onNext={next} onBack={back} />}
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
                {step === 4 && <StepReceipt data={form} onUpdate={update} onNext={next} onBack={back} />}
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
          </div>
        </div>

        <footer className="cinematic-footer">{t('voluntaryFooter')}</footer>
      </section>
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
