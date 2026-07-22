import gcashLogo from '../assets/gcash-logo.jpg'
import paypalLogo from '../assets/paypal-logo.jpg'
import wiseLogo from '../assets/wise-logo.jpg'

export function PayPalIcon({ size = 32 }: { size?: number }) {
  return <img src={paypalLogo} alt="PayPal logo" width={size} height={size} className="rounded-lg object-contain" />
}

export function GCashIcon({ size = 32 }: { size?: number }) {
  return <img src={gcashLogo} alt="GCash logo" width={size} height={size} className="rounded-lg object-contain" />
}

export function WiseIcon({ size = 32 }: { size?: number }) {
  return <img src={wiseLogo} alt="Wise logo" width={size} height={size} className="rounded-lg object-contain" />
}

export function CrowIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M14 3C8.477 3 4 7.477 4 13c0 3.1 1.4 5.87 3.6 7.73L6 24h4l1.2-2.4A9.93 9.93 0 0014 22c1.85 0 3.58-.5 5.07-1.37L20.5 24H24l-1.8-3.6A9.97 9.97 0 0024 13c0-5.523-4.477-10-10-10z" fill="#f5a623" />
      <circle cx="10.5" cy="12" r="1.5" fill="#0d0f14" />
      <circle cx="17.5" cy="12" r="1.5" fill="#0d0f14" />
      <path d="M11 16.5c.83 1 2 1.5 3 1.5s2.17-.5 3-1.5" stroke="#0d0f14" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function CheckIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function UploadIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <path d="M20 28V16M20 16l-5 5M20 16l5 5" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="8" y="30" width="24" height="3" rx="1.5" fill="#252a38" />
    </svg>
  )
}

export function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="4" y="4" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 10V2h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function DiscordIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
      <path d="M13.54 3.14A13.2 13.2 0 0010.37 2a9.2 9.2 0 00-.41.84 12.2 12.2 0 00-3.92 0A8.6 8.6 0 005.62 2a13.3 13.3 0 00-3.18 1.14A14.1 14.1 0 000 10.8a13.3 13.3 0 004.06 2.06 10 10 0 00.87-1.42 8.7 8.7 0 01-1.37-.66l.33-.25a9.5 9.5 0 008.22 0l.33.25a8.7 8.7 0 01-1.38.67 10 10 0 00.87 1.41A13.2 13.2 0 0016 10.8 14.1 14.1 0 0013.54 3.14zM5.34 9.4c-.84 0-1.53-.77-1.53-1.72s.67-1.72 1.53-1.72 1.54.78 1.53 1.72c0 .95-.67 1.72-1.53 1.72zm5.32 0c-.84 0-1.53-.77-1.53-1.72s.67-1.72 1.53-1.72 1.54.78 1.53 1.72c0 .95-.67 1.72-1.53 1.72z" />
    </svg>
  )
}

export function TicketIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <path d="M2 5a1 1 0 011-1h10a1 1 0 011 1v2a1.5 1.5 0 000 3v2a1 1 0 01-1 1H3a1 1 0 01-1-1v-2a1.5 1.5 0 000-3V5z" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}
