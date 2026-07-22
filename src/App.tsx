import { useState } from 'react'
import type { FormData } from './types'
import { StepProgress, StepAmount, StepPlayerInfo, StepPayment, StepReceipt, StepComplete, SuccessScreen } from './components/steps'
import CrowLogo from './assets/playcrows-icon.jpg'

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
  const [form, setForm] = useState<FormData>(INITIAL)

  const update = (partial: Partial<FormData>) => setForm(f => ({ ...f, ...partial }))
  const next = () => setStep(s => s + 1)
  const back = () => setStep(s => s - 1)
  const reset = () => { setForm(INITIAL); setStep(1); setSubmitted(false) }

  return (
    <div className="min-h-screen bg-[#0d0f14] text-[#e8eaf0]">
      <header className="border-b border-[#191d27] bg-[#0d0f14] sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <img src={CrowLogo} alt="PlayCrows logo" className="h-10 w-10 rounded-full object-cover" />
          <div>
            <div className="font-bold text-base text-[#e8eaf0] leading-tight tracking-tight">PLAYCROWS</div>
            <div className="text-[10px] text-[#6b7280] tracking-widest uppercase">by Hawk</div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">
        {submitted ? (
          <SuccessScreen onReset={reset} />
        ) : (
          <>
            <StepProgress current={step} />
            {step === 1 && <StepAmount data={form} onUpdate={update} onNext={next} />}
            {step === 2 && <StepPlayerInfo data={form} onUpdate={update} onNext={next} onBack={back} />}
            {step === 3 && <StepPayment data={form} onUpdate={update} onNext={next} onBack={back} />}
            {step === 4 && <StepReceipt data={form} onUpdate={update} onNext={next} onBack={back} />}
            {step === 5 && <StepComplete data={form} onSubmit={() => setSubmitted(true)} onBack={back} />}
          </>
        )}
      </main>

      <footer className="border-t border-[#191d27] mt-16">
        <div className="max-w-2xl mx-auto px-4 py-6 text-center text-xs text-[#6b7280]">
          2026 Playcrows by Hawk - All contributions are voluntary support donations.
        </div>
      </footer>
    </div>
  )
}
