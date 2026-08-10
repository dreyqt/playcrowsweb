import type { ReactNode } from 'react'
import { CheckIcon } from './icons'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bg-[#171a20] border border-[#292d34] rounded-2xl ${className}`}>{children}</div>
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
      <label className="text-xs font-semibold text-[#77746e] uppercase tracking-widest">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-[#111318] border border-[#292d34] rounded-xl px-4 py-3 text-[#eee9df] placeholder-[#77746e] text-sm outline-none focus:border-[#d3ad62] transition-colors duration-200"
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
    primary: 'bg-[#d3ad62] text-[#0a0b0d] hover:bg-[#bd9142] active:scale-95',
    secondary: 'bg-[#292d34] text-[#eee9df] hover:bg-[#3b414b] active:scale-95',
    ghost: 'bg-transparent border border-[#292d34] text-[#eee9df] hover:border-[#3b414b] hover:bg-[#171a20] active:scale-95',
  }

  return (
    <button className={`${base} ${variants[variant]} ${className}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}

export function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#292d34] last:border-0">
      <span className="text-xs font-semibold text-[#77746e] uppercase tracking-widest">{label}</span>
      <span className="text-sm font-medium text-[#eee9df]">{value}</span>
    </div>
  )
}
