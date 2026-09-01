import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import CrowLogo from '../assets/playcrows-icon.jpg'
import { supabase } from '../lib/supabase'

type Locale = 'en' | 'ko'
type EventType = 'share_fb' | 'invite_discord' | 'share_livestream'

const SERVER_INFO_KO = `⚔️ PLAYCROWS V2 베타 테스트 오픈! ⚔️

PlayCrows의 새로운 장이 시작되었습니다! 🐦‍⬛🔥
PlayCrows V2 베타 테스트가 정식으로 시작되었습니다!

서버 테스트에 참여해 다양한 빌드와 콘텐츠를 체험하고, 정식 출시 전 V2를 개선할 수 있도록 여러분의 의견을 들려주세요.

⚔️ V2 서버 설정
🔹 경험치 획득률: 50배
🔹 아이템 드롭률: 30배
🔹 강화 확률: 3배

💎 베타 다이아 2,000,000개
모든 베타 테스트 참여자는 다이아 2,000,000개를 사용할 수 있습니다!
장비, 빌드, 성장 과정 및 V2의 다양한 콘텐츠를 자유롭게 테스트해 보세요.

📝 V2 회원가입
https://account002.playcrows.com/register.php

💻 V2 PC 다운로드
🇺🇸 English
http://download.playcrows.com/pv2/PlayV2-PC-en-3.zip
🇰🇷 Korean
http://download.playcrows.com/pv2/PlayV2-PC-kr-3.zip
🇹🇼 Taiwan
http://download.playcrows.com/pv2/PlayV2-PC-tw-3.zip

📱 V2 Android 다운로드
🇺🇸 English
http://download.playcrows.com/pv2/PlayAZ-v2-en-3.apk
🇰🇷 Korean
http://download.playcrows.com/pv2/PlayAZ-v2-kr-3.apk
🇹🇼 Taiwan
http://download.playcrows.com/pv2/PlayAZ-v2-tw-3.apk`

const TEXT = {
  en: {
    title: 'V2 Beta Claim Event', subtitle: 'Complete a beta promotion mission and submit your proof.', warning: 'This claim page is exclusively for PlayCrows V2 Beta. V1 accounts and characters will be rejected.', closed: 'Beta claims are currently closed.', player: 'Player Information', playerId: 'V2 Player ID', nickname: 'V2 Nickname', discord: 'Discord User ID', select: 'Choose an Event', daily: 'You may submit each event only once per day (GMT+8).', fb: 'Share Facebook', invite: 'Invite Discord', live: 'Share Livestream', fbTitle: 'Share the official Facebook post', fbBody: 'Share the official post in 5 different public and active Facebook gaming/community groups. Submit the direct link to each shared post—not only the group homepage. Duplicate, private, deleted, or unavailable posts will not count.', official: 'Open Official Facebook Post', proof: 'Shared Post Link', inviteBody: 'Invite 5 unique users using your personal Discord invite link. Fake, alternate, duplicate, or suspicious accounts will not count, and invited users must remain in the server during verification.', inviteLink: 'Your Unique Discord Invite Link', screenshot: 'Invite Tracker Screenshot', fileHint: 'JPG, PNG, or WEBP · maximum 5 MB', liveBody: 'Livestream PlayCrows V2 gameplay for at least 4 hours. The livestream or replay must remain publicly accessible during review.', liveLink: 'Livestream / Replay Link', confirm: 'I confirm that my information is correct, this claim is for V2 Beta, and I completed the selected event requirements.', submit: 'Submit Beta Claim', submitting: 'Submitting…', success: 'Claim Submitted!', pending: 'Your claim is pending review. Save this reference code:', another: 'Submit Another Event', copy: 'Copy Korean Server Information', copied: 'Copied!', koMechanics: '', invalid: 'Please complete all required fields.', duplicateLinks: 'Every proof link must be unique.', badFile: 'Upload one JPG, PNG, or WEBP image no larger than 5 MB.', unavailable: 'Unable to load the claim page. Please try again.'
  },
  ko: {
    title: 'V2 베타 보상 신청 이벤트', subtitle: '베타 홍보 미션을 완료하고 인증 자료를 제출해 주세요.', warning: '본 신청 페이지는 PlayCrows V2 베타 전용입니다. V1 계정 및 캐릭터로 신청할 경우 반려됩니다.', closed: '현재 베타 보상 신청이 마감되었습니다.', player: '플레이어 정보', playerId: 'V2 Player ID', nickname: 'V2 캐릭터명', discord: 'Discord 사용자 ID', select: '이벤트 선택', daily: '각 이벤트는 하루에 한 번만 신청할 수 있습니다(GMT+8 기준).', fb: 'Facebook 공유', invite: 'Discord 초대', live: '라이브 방송 공유', fbTitle: 'V2 서버 정보를 Facebook에 공유해 주세요', fbBody: '아래의 한국어 V2 서버 정보를 서로 다른 공개·활성 Facebook 게임/커뮤니티 그룹 5곳에 공유해 주세요. 그룹 메인 링크가 아닌 실제 공유 게시물의 직접 링크를 제출해야 합니다. 중복, 비공개, 삭제 또는 확인할 수 없는 게시물은 인정되지 않습니다.', official: '', proof: '공유 게시물 링크', inviteBody: '본인의 Discord 초대 링크로 서로 다른 신규 사용자 5명을 초대해 주세요. 가짜·부계정·중복·의심 계정은 인정되지 않으며, 확인 시점까지 서버에 남아 있어야 합니다.', inviteLink: '개인 Discord 초대 링크', screenshot: 'Invite Tracker 스크린샷', fileHint: 'JPG, PNG 또는 WEBP · 최대 5MB', liveBody: 'PlayCrows V2 플레이 화면을 최소 4시간 라이브 방송해 주세요. 검토 시 라이브 방송 또는 다시보기 링크가 공개 상태여야 합니다.', liveLink: '라이브 방송 / 다시보기 링크', confirm: '입력한 정보가 정확하고, V2 베타 신청이며, 선택한 이벤트 조건을 모두 완료했음을 확인합니다.', submit: '베타 보상 신청', submitting: '제출 중…', success: '신청 완료!', pending: '신청이 검토 대기 중입니다. 아래 참조 코드를 보관해 주세요:', another: '다른 이벤트 신청', copy: '한국어 서버 정보 복사', copied: '복사 완료!', koMechanics: '복사한 전체 내용을 Facebook 게시물 본문에 그대로 붙여넣어 공유하세요.', invalid: '필수 항목을 모두 입력해 주세요.', duplicateLinks: '각 인증 링크는 서로 달라야 합니다.', badFile: '5MB 이하의 JPG, PNG 또는 WEBP 이미지 1개를 업로드해 주세요.', unavailable: '신청 페이지를 불러올 수 없습니다. 다시 시도해 주세요.'
  },
} as const

const inputClass = 'mt-2 w-full rounded-xl border border-[#343840] bg-[#0d0f12] px-4 py-3 text-sm text-[#eee9df] outline-none transition focus:border-[#d3ad62]'

export function V2BetaClaim() {
  const [locale, setLocale] = useState<Locale>('en')
  const t = TEXT[locale]
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [eventType, setEventType] = useState<EventType>('share_fb')
  const [playerId, setPlayerId] = useState('')
  const [nickname, setNickname] = useState('')
  const [discordId, setDiscordId] = useState('')
  const [links, setLinks] = useState(['', '', '', '', ''])
  const [inviteLink, setInviteLink] = useState('')
  const [liveLink, setLiveLink] = useState('')
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [reference, setReference] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    void (async () => {
      const { data, error: configError } = await supabase.rpc('get_v2_beta_claim_status')
      if (configError) { setLoadError(true); setEnabled(false); return }
      const row = Array.isArray(data) ? data[0] : data
      setEnabled(Boolean(row?.enabled))
    })()
  }, [])

  const eventCards = useMemo(() => ([
    { id: 'share_fb' as const, icon: 'f', label: t.fb },
    { id: 'invite_discord' as const, icon: '◈', label: t.invite },
    { id: 'share_livestream' as const, icon: '●', label: t.live },
  ]), [t])

  const reset = () => { setReference(''); setError(''); setConfirmed(false); setScreenshot(null); setLinks(['','','','','']); setInviteLink(''); setLiveLink('') }

  const submit = async (e: FormEvent) => {
    e.preventDefault(); if (submitting) return; setError('')
    const cleanLinks = links.map(v => v.trim())
    if (!playerId.trim() || !nickname.trim() || !/^\d{15,22}$/.test(discordId.trim()) || !confirmed) return setError(t.invalid)
    if (eventType === 'share_fb' && (cleanLinks.some(v => !/^https?:\/\//i.test(v)) || new Set(cleanLinks.map(v => v.toLowerCase().replace(/\/$/, ''))).size !== 5)) return setError(cleanLinks.some(v => !v) ? t.invalid : t.duplicateLinks)
    if (eventType === 'invite_discord' && (!/^https?:\/\/(discord\.gg|discord\.com\/invite)\//i.test(inviteLink.trim()) || !screenshot)) return setError(t.invalid)
    if (eventType === 'share_livestream' && !/^https?:\/\//i.test(liveLink.trim())) return setError(t.invalid)
    if (screenshot && (!['image/jpeg','image/png','image/webp'].includes(screenshot.type) || screenshot.size <= 0 || screenshot.size > 5 * 1024 * 1024)) return setError(t.badFile)

    setSubmitting(true)
    let screenshotPath: string | null = null
    try {
      if (eventType === 'invite_discord' && screenshot) {
        const extension = screenshot.type === 'image/png' ? 'png' : screenshot.type === 'image/webp' ? 'webp' : 'jpg'
        screenshotPath = `${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}.${extension}`
        const { error: uploadError } = await supabase.storage.from('v2-beta-proofs').upload(screenshotPath, screenshot, { contentType: screenshot.type, upsert: false })
        if (uploadError) throw new Error(uploadError.message)
      }
      const { data, error: submitError } = await supabase.rpc('submit_v2_beta_claim', {
        p_player_id: playerId.trim(), p_nickname: nickname.trim(), p_discord_id: discordId.trim(), p_event_type: eventType,
        p_locale: locale, p_proof_links: eventType === 'share_fb' ? cleanLinks : eventType === 'invite_discord' ? [inviteLink.trim()] : [liveLink.trim()], p_screenshot_path: screenshotPath,
      })
      if (submitError) throw new Error(submitError.message)
      const row = Array.isArray(data) ? data[0] : data
      setReference(row?.reference_code ?? '')
    } catch (err) {
      if (screenshotPath) await supabase.storage.from('v2-beta-proofs').remove([screenshotPath])
      setError(err instanceof Error ? err.message : t.unavailable)
    } finally { setSubmitting(false) }
  }

  if (enabled === null) return <div className="flex min-h-screen items-center justify-center bg-[#0a0b0d] text-[#d3ad62]">Loading…</div>
  if (!enabled) return <div className="flex min-h-screen items-center justify-center bg-[#0a0b0d] p-4 text-[#eee9df]"><div className="max-w-lg rounded-2xl border border-[#292d34] bg-[#111318] p-8 text-center"><img src={CrowLogo} className="mx-auto h-16 w-16 rounded-full"/><h1 className="mt-5 text-2xl font-bold">{loadError ? t.unavailable : t.closed}</h1><a href="/" className="mt-6 inline-block text-sm font-bold text-[#d3ad62]">← PlayCrows</a></div></div>

  return <div className="min-h-screen bg-[#0a0b0d] text-[#eee9df]"><header className="sticky top-0 z-40 border-b border-[#171a20]"><div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4"><a href="/" className="flex items-center gap-3 text-inherit no-underline"><img src={CrowLogo} className="h-10 w-10 rounded-full"/><div><div className="font-extrabold">PLAYCROWS</div><div className="text-[10px] uppercase tracking-[.18em] text-[#77746e]">V2 BETA EVENT</div></div></a><div className="flex rounded-lg border border-[#343840] bg-[#111318] p-1 text-xs font-bold"><button type="button" onClick={()=>setLocale('en')} className={`rounded-md px-3 py-2 ${locale==='en'?'bg-[#d3ad62] text-black':'text-[#8f8b84]'}`}>EN</button><button type="button" onClick={()=>setLocale('ko')} className={`rounded-md px-3 py-2 ${locale==='ko'?'bg-[#d3ad62] text-black':'text-[#8f8b84]'}`}>한국어</button></div></div></header>
  <main className="mx-auto max-w-3xl px-4 py-10"><section className="overflow-hidden rounded-3xl border border-[#d3ad62]/30 bg-[#111318] p-6 sm:p-9"><div className="text-xs font-black uppercase tracking-[.2em] text-[#d3ad62]">PlayCrows V2</div><h1 className="mt-3 text-3xl font-black sm:text-4xl">{t.title}</h1><p className="mt-3 text-sm leading-6 text-[#9a958d]">{t.subtitle}</p><div className="mt-6 rounded-xl border border-[#ef4444]/30 bg-[#ef4444]/8 px-4 py-3 text-sm font-semibold leading-6 text-[#ff9b9b]">⚠ {t.warning}</div></section>
  {reference ? <section className="mt-6 rounded-2xl border border-[#22c55e]/35 bg-[#111318] p-8 text-center"><div className="text-4xl">✓</div><h2 className="mt-3 text-2xl font-bold text-[#5ee58a]">{t.success}</h2><p className="mt-3 text-sm text-[#9a958d]">{t.pending}</p><div className="mt-5 rounded-xl border border-[#d3ad62]/30 bg-black/25 p-4 font-mono text-xl font-bold text-[#d3ad62]">{reference}</div><button onClick={reset} className="mt-6 rounded-xl bg-[#d3ad62] px-5 py-3 text-sm font-bold text-black">{t.another}</button></section> :
  <form onSubmit={submit} className="mt-6 space-y-6"><section className="rounded-2xl border border-[#292d34] bg-[#111318] p-5 sm:p-6"><h2 className="text-lg font-bold">1. {t.player}</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold text-[#aaa49a]">{t.playerId} *<input value={playerId} onChange={e=>setPlayerId(e.target.value)} className={inputClass}/></label><label className="text-xs font-bold text-[#aaa49a]">{t.nickname} *<input value={nickname} onChange={e=>setNickname(e.target.value)} className={inputClass}/></label><label className="text-xs font-bold text-[#aaa49a] sm:col-span-2">{t.discord} *<input value={discordId} onChange={e=>setDiscordId(e.target.value.replace(/\D/g,''))} inputMode="numeric" placeholder="123456789012345678" className={inputClass}/></label></div></section>
  <section className="rounded-2xl border border-[#292d34] bg-[#111318] p-5 sm:p-6"><h2 className="text-lg font-bold">2. {t.select}</h2><p className="mt-2 text-xs text-[#d3ad62]">{t.daily}</p><div className="mt-4 grid gap-3 sm:grid-cols-3">{eventCards.map(card=><button key={card.id} type="button" onClick={()=>{setEventType(card.id);setError('')}} className={`rounded-xl border p-4 text-left transition ${eventType===card.id?'border-[#d3ad62] bg-[#d3ad62]/10 text-[#f0d69c]':'border-[#343840] bg-[#0d0f12] text-[#aaa49a] hover:border-[#706248]'}`}><span className="block text-2xl font-black">{card.icon}</span><span className="mt-2 block text-sm font-bold">{card.label}</span></button>)}</div></section>
  <section className="rounded-2xl border border-[#292d34] bg-[#111318] p-5 sm:p-6"><h2 className="text-lg font-bold">3. {eventType==='share_fb'?t.fb:eventType==='invite_discord'?t.invite:t.live}</h2>{eventType==='share_fb'&&<><h3 className="mt-4 font-bold text-[#d3ad62]">{t.fbTitle}</h3><p className="mt-2 text-sm leading-6 text-[#9a958d]">{t.fbBody}</p>{locale==='en'?<a href="https://www.facebook.com/share/p/1EsoFCFXef/" target="_blank" rel="noreferrer" className="mt-4 inline-block rounded-lg border border-[#1877f2]/50 bg-[#1877f2]/10 px-4 py-2.5 text-xs font-bold text-[#69a8ff] no-underline">{t.official} ↗</a>:<><div className="mt-4 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-[#343840] bg-[#0b0c0f] p-4 text-xs leading-5 text-[#aaa49a]">{SERVER_INFO_KO}</div><p className="mt-2 text-xs text-[#d3ad62]">{t.koMechanics}</p><button type="button" onClick={async()=>{await navigator.clipboard.writeText(SERVER_INFO_KO);setCopied(true);setTimeout(()=>setCopied(false),2000)}} className="mt-3 rounded-lg border border-[#d3ad62]/50 bg-[#d3ad62]/10 px-4 py-2.5 text-xs font-bold text-[#d3ad62]">{copied?t.copied:t.copy}</button></>}
  <div className="mt-5 space-y-3">{links.map((link,i)=><label key={i} className="block text-xs font-bold text-[#aaa49a]">{t.proof} #{i+1} *<input type="url" value={link} onChange={e=>setLinks(current=>current.map((v,idx)=>idx===i?e.target.value:v))} placeholder="https://facebook.com/groups/…/posts/…" className={inputClass}/></label>)}</div></>}
  {eventType==='invite_discord'&&<><p className="mt-4 text-sm leading-6 text-[#9a958d]">{t.inviteBody}</p><label className="mt-5 block text-xs font-bold text-[#aaa49a]">{t.inviteLink} *<input type="url" value={inviteLink} onChange={e=>setInviteLink(e.target.value)} placeholder="https://discord.gg/…" className={inputClass}/></label><label className="mt-4 block text-xs font-bold text-[#aaa49a]">{t.screenshot} *<span className="mt-2 flex min-h-24 cursor-pointer items-center justify-center rounded-xl border border-dashed border-[#565b65] bg-[#0d0f12] p-4 text-center text-[#aaa49a]"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setScreenshot(e.target.files?.[0]??null)}/>{screenshot?screenshot.name:t.fileHint}</span></label></>}
  {eventType==='share_livestream'&&<><p className="mt-4 text-sm leading-6 text-[#9a958d]">{t.liveBody}</p><label className="mt-5 block text-xs font-bold text-[#aaa49a]">{t.liveLink} *<input type="url" value={liveLink} onChange={e=>setLiveLink(e.target.value)} placeholder="https://…" className={inputClass}/></label></>}</section>
  <section className="rounded-2xl border border-[#292d34] bg-[#111318] p-5 sm:p-6"><label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-[#aaa49a]"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} className="mt-1 h-4 w-4 accent-[#d3ad62]"/><span>{t.confirm}</span></label>{error&&<div className="mt-4 rounded-lg border border-[#ef4444]/30 bg-[#ef4444]/8 px-4 py-3 text-sm text-[#ff8585]">{error}</div>}<button disabled={submitting} className="mt-5 w-full rounded-xl bg-[#d3ad62] px-5 py-3.5 text-sm font-black text-[#17120a] transition hover:bg-[#e4c77f] disabled:opacity-60">{submitting?t.submitting:t.submit}</button></section></form>}
  </main></div>
}
