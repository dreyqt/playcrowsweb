import CrowLogo from '../assets/playcrows-icon.jpg'
import type { PlayCrowsServer } from '../server'
import { PLAYCROWS_SERVERS } from '../server'
import { LanguageSelector } from './LanguageSelector'
import { useI18n } from '../i18n'

export function ServerSelection({ onSelect }: { onSelect: (server: PlayCrowsServer) => void }) {
  const { t } = useI18n()

  return (
    <div className="min-h-screen bg-[#0a0b0d] text-[#eee9df]">
      <header className="border-b border-[#171a20] bg-[#0a0b0d]">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <img src={CrowLogo} alt="PlayCrows logo" className="h-10 w-10 rounded-full object-cover" />
            <div>
              <div className="text-base font-bold leading-tight tracking-tight text-[#eee9df]">PLAYCROWS</div>
              <div className="text-[10px] uppercase tracking-widest text-[#77746e]">{t('developmentTeam')}</div>
            </div>
          </div>
          <LanguageSelector />
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-150px)] max-w-4xl items-center px-4 py-12">
        <section className="w-full">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-xs font-black uppercase tracking-[0.22em] text-[#c9aa68]">Donation Center</div>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Select Your Server</h1>
            <p className="mt-3 text-sm leading-6 text-[#8f8b84]">
              Choose the server where your character is located. Packages, transactions, player IDs, and one-time rewards are processed separately for each server.
            </p>
          </div>

          <div className="mx-auto mt-8 grid max-w-3xl gap-4 sm:grid-cols-2">
            {(Object.keys(PLAYCROWS_SERVERS) as PlayCrowsServer[]).map(serverId => {
              const server = PLAYCROWS_SERVERS[serverId]
              return (
                <button
                  key={server.id}
                  type="button"
                  onClick={() => onSelect(server.id)}
                  className="group rounded-2xl border border-[#292d34] bg-[#111318] p-6 text-left transition-all hover:-translate-y-0.5 hover:border-[#c9aa68]/70 hover:bg-[#15181e] hover:shadow-[0_16px_50px_rgba(0,0,0,0.28)]"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#c9aa68]/35 bg-[#c9aa68]/10 text-lg font-black text-[#c9aa68]">
                      {server.shortName}
                    </div>
                    <span className="text-xl text-[#5f636c] transition-transform group-hover:translate-x-1 group-hover:text-[#c9aa68]">→</span>
                  </div>
                  <h2 className="mt-5 text-xl font-black text-[#eee9df]">{server.name}</h2>
                  <p className="mt-1 text-sm text-[#8f8b84]">{server.description}</p>
                  <div className="mt-5 text-xs font-bold uppercase tracking-widest text-[#c9aa68]">Enter WEB Shop</div>
                </button>
              )
            })}
          </div>

          <p className="mt-6 text-center text-xs text-[#66635e]">Please verify your server before completing payment. Orders are fulfilled only on the selected server.</p>
        </section>
      </main>
    </div>
  )
}
