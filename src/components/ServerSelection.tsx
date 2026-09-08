import CrowLogo from '../assets/playcrows-icon.jpg'
import type { PlayCrowsServer } from '../server'
import { PLAYCROWS_SERVERS } from '../server'
import { LanguageSelector } from './LanguageSelector'
import { useI18n } from '../i18n'

export function ServerSelection({ onSelect }: { onSelect: (server: PlayCrowsServer) => void }) {
  const { t } = useI18n()

  return (
    <div className="min-h-screen bg-[#08090b] text-[#eee9df]">
      <header className="border-b border-[#171a20] bg-[#0a0b0d]/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <img src={CrowLogo} alt="PlayCrows logo" className="h-10 w-10 rounded-full object-cover ring-1 ring-[#c9aa68]/30" />
            <div>
              <div className="text-base font-bold leading-tight tracking-tight text-[#eee9df]">PLAYCROWS</div>
              <div className="text-[10px] uppercase tracking-widest text-[#77746e]">{t('developmentTeam')}</div>
            </div>
          </div>
          <LanguageSelector />
        </div>
      </header>

      <main className="relative mx-auto flex min-h-[calc(100vh-74px)] max-w-5xl items-center overflow-hidden px-4 py-12">
        <div className="pointer-events-none absolute inset-x-0 top-[-12rem] mx-auto h-[30rem] max-w-4xl rounded-full bg-[#c9aa68]/[0.04] blur-3xl" />

        <section className="relative z-10 w-full">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-xs font-black uppercase tracking-[0.28em] text-[#d6ad54]">WEB SHOP</div>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Select Your Server</h1>
          </div>

          <div className="mx-auto mt-10 grid max-w-4xl gap-5 sm:grid-cols-2">
            {(Object.keys(PLAYCROWS_SERVERS) as PlayCrowsServer[]).map(serverId => {
              const server = PLAYCROWS_SERVERS[serverId]
              const isV2 = server.id === 'v2'

              return (
                <button
                  key={server.id}
                  type="button"
                  onClick={() => onSelect(server.id)}
                  className={`group relative min-h-[290px] overflow-hidden rounded-2xl border p-7 text-left transition-all sm:p-8 ${
                    isV2
                      ? 'border-[#8b5cf6]/60 bg-[#11101a] shadow-[0_20px_65px_rgba(0,0,0,0.35)] hover:-translate-y-1 hover:border-[#a78bfa] hover:shadow-[0_24px_80px_rgba(139,92,246,0.18)]'
                      : 'border-[#8f6c28]/70 bg-[#12110e] shadow-[0_20px_65px_rgba(0,0,0,0.35)] hover:-translate-y-1 hover:border-[#d6ad54] hover:shadow-[0_24px_80px_rgba(183,132,35,0.16)]'
                  }`}
                >
                  <div
                    className={`pointer-events-none absolute inset-0 ${
                      isV2
                        ? 'bg-[radial-gradient(circle_at_80%_20%,rgba(139,92,246,0.20),transparent_45%),linear-gradient(145deg,rgba(139,92,246,0.08),transparent_55%)]'
                        : 'bg-[radial-gradient(circle_at_78%_18%,rgba(214,173,84,0.18),transparent_42%),linear-gradient(145deg,rgba(214,173,84,0.08),transparent_52%)]'
                    }`}
                  />
                  <div className={`pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full border ${isV2 ? 'border-[#a78bfa]/10' : 'border-[#d6ad54]/10'}`} />
                  <div className={`pointer-events-none absolute -right-2 -top-2 h-28 w-28 rounded-full border ${isV2 ? 'border-[#a78bfa]/10' : 'border-[#d6ad54]/10'}`} />

                  <div className="relative flex h-full flex-col">
                    <div className="flex items-start justify-between gap-4">
                      <div
                        className={`flex h-16 w-16 items-center justify-center rounded-2xl border text-2xl font-black shadow-inner ${
                          isV2
                            ? 'border-[#a78bfa]/55 bg-[#8b5cf6]/10 text-[#c4b5fd]'
                            : 'border-[#d6ad54]/55 bg-[#d6ad54]/10 text-[#e6be67]'
                        }`}
                      >
                        {server.shortName}
                      </div>

                      <div className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] ${
                        isV2
                          ? 'border-[#a78bfa]/35 bg-[#8b5cf6]/10 text-[#c4b5fd]'
                          : 'border-[#d6ad54]/30 bg-[#d6ad54]/10 text-[#d6ad54]'
                      }`}>
                        {isV2 ? 'Official Launch' : 'Available'}
                      </div>
                    </div>

                    <div className="mt-auto pt-14">
                      <h2 className="text-2xl font-black text-[#f2eee6] sm:text-3xl">{server.name}</h2>
                      <p className={`mt-2 text-sm font-semibold ${isV2 ? 'text-[#a78bfa]' : 'text-[#c9aa68]'}`}>
                        {server.description}
                      </p>

                      <div
                        className={`mt-7 flex h-11 items-center justify-center rounded-xl border text-xs font-black uppercase tracking-[0.16em] transition-all ${
                          isV2
                            ? 'border-[#a78bfa]/60 bg-gradient-to-r from-[#6d45c5] to-[#a78bfa] text-[#090a0c] group-hover:brightness-110'
                            : 'border-[#d6ad54]/60 bg-gradient-to-r from-[#8c6624] to-[#d0a650] text-[#090a0c] group-hover:brightness-110'
                        }`}
                      >
                        Enter WEB Shop
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          <p className="mt-7 text-center text-xs text-[#66635e]">Please verify your server before completing payment. Orders are fulfilled only on the selected server.</p>
        </section>
      </main>
    </div>
  )
}
