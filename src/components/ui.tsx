import type { ReactNode } from 'react'
import { CheckIcon } from './icons'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bg-[#191d27] border border-[#252a38] rounded-2xl ${className}`}>{children}</div>
}

export function Input({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  type?: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold text-[#6b7280] uppercase tracking-widest">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-[#13161e] border border-[#252a38] rounded-xl px-4 py-3 text-[#e8eaf0] placeholder-[#6b7280] text-sm outline-none focus:border-[#f5a623] transition-colors duration-200"
      />
    </div>
  )
}

export function Btn({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'ghost'
  className?: string
}) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-xl font-semibold text-sm px-5 py-3 transition-all duration-200 cursor-pointer select-none disabled:opacity-40 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-[#f5a623] text-[#0d0f14] hover:bg-[#e09520] active:scale-95',
    secondary: 'bg-[#252a38] text-[#e8eaf0] hover:bg-[#353c52] active:scale-95',
    ghost: 'bg-transparent border border-[#252a38] text-[#e8eaf0] hover:border-[#353c52] hover:bg-[#191d27] active:scale-95',
  }

  return (
    <button className={`${base} ${variants[variant]} ${className}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}

export function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#252a38] last:border-0">
      <span className="text-xs font-semibold text-[#6b7280] uppercase tracking-widest">{label}</span>
      <span className="text-sm font-medium text-[#e8eaf0]">{value}</span>
    </div>
  )
}
