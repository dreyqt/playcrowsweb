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
                  disabled={isV2}
                  onClick={() => !isV2 && onSelect(server.id)}
                  className={`group relative min-h-[290px] overflow-hidden rounded-2xl border p-7 text-left transition-all sm:p-8 ${
                    isV2
                      ? 'cursor-not-allowed border-[#30343b] bg-[#101217] opacity-75'
                      : 'border-[#8f6c28]/70 bg-[#12110e] shadow-[0_20px_65px_rgba(0,0,0,0.35)] hover:-translate-y-1 hover:border-[#d6ad54] hover:shadow-[0_24px_80px_rgba(183,132,35,0.16)]'
                  }`}
                >
                  <div
                    className={`pointer-events-none absolute inset-0 ${
                      isV2
                        ? 'bg-[radial-gradient(circle_at_80%_20%,rgba(103,110,123,0.13),transparent_45%),linear-gradient(145deg,rgba(255,255,255,0.025),transparent_55%)]'
                        : 'bg-[radial-gradient(circle_at_78%_18%,rgba(214,173,84,0.18),transparent_42%),linear-gradient(145deg,rgba(214,173,84,0.08),transparent_52%)]'
                    }`}
                  />
                  <div className={`pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full border ${isV2 ? 'border-white/5' : 'border-[#d6ad54]/10'}`} />
                  <div className={`pointer-events-none absolute -right-2 -top-2 h-28 w-28 rounded-full border ${isV2 ? 'border-white/5' : 'border-[#d6ad54]/10'}`} />

                  <div className="relative flex h-full flex-col">
                    <div className="flex items-start justify-between gap-4">
                      <div
                        className={`flex h-16 w-16 items-center justify-center rounded-2xl border text-2xl font-black shadow-inner ${
                          isV2
                            ? 'border-[#5b6069]/60 bg-[#1a1d22] text-[#9298a2]'
                            : 'border-[#d6ad54]/55 bg-[#d6ad54]/10 text-[#e6be67]'
                        }`}
                      >
                        {server.shortName}
                      </div>

                      {isV2 ? (
                        <div className="flex items-center gap-2 rounded-full border border-[#555b65]/50 bg-[#15181d] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#9298a2]">
                          <span aria-hidden="true">🔒</span>
                          Coming Soon
                        </div>
                      ) : (
                        <div className="rounded-full border border-[#d6ad54]/30 bg-[#d6ad54]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#d6ad54]">
                          Available
                        </div>
                      )}
                    </div>

                    <div className="mt-auto pt-14">
                      <h2 className={`text-2xl font-black sm:text-3xl ${isV2 ? 'text-[#a0a4ab]' : 'text-[#f2eee6]'}`}>{server.name}</h2>
                      <p className={`mt-2 text-sm font-semibold ${isV2 ? 'text-[#70757e]' : 'text-[#c9aa68]'}`}>
                        {server.description}
                      </p>

                      <div
                        className={`mt-7 flex h-11 items-center justify-center rounded-xl border text-xs font-black uppercase tracking-[0.16em] transition-all ${
                          isV2
                            ? 'border-[#343840] bg-[#17191e] text-[#686d76]'
                            : 'border-[#d6ad54]/60 bg-gradient-to-r from-[#8c6624] to-[#d0a650] text-[#090a0c] group-hover:brightness-110'
                        }`}
                      >
                        {isV2 ? 'Coming Soon' : 'Enter WEB Shop'}
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
