import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import CrowLogo from '../assets/playcrows-icon.jpg'
import { LanguageSelector } from '../components/LanguageSelector'
import { I18nProvider, useI18n, type LanguageCode } from '../i18n'
import { supabase } from '../lib/supabase'
import type { EventAnswerValue, EventFormField, EventSubmission, PlayCrowsEvent } from './types'

type UiText = {
  eventCenter: string; webShop: string; events: string; intro: string; loading: string; noEvents: string; unableLoad: string
  starts: string; ends: string; active: string; ended: string; allEvents: string; mechanicsClaim: string; results: string; checkClaim: string
  mechanics: string; rewards: string; submitClaim: string; discord: string; character: string; playerId: string; required: string
  addLink: string; remove: string; linkPlaceholder: string; submitting: string; submitEventClaim: string; claimSubmitted: string; pendingSave: string
  submissionsClosed: string; closedDesc: string; checkStatus: string; checkStatusDesc: string; checking: string; enterReference: string
  claimNotFound: string; approvedSent: string; rejected: string; pendingReview: string; reason: string; approvedClaims: string; rejectedClaims: string
  noReviewed: string; noApproved: string; noRejected: string; onceRule: string; weeklyRule: string; duplicateHint: string; cooldownHint: string
}

const UI: Record<LanguageCode, UiText> = {
  en: { eventCenter:'Event Center', webShop:'Web Shop', events:'Events', intro:'View active events, read the requirements, submit your claim, and check event results in one place.', loading:'Loading events…', noEvents:'No published events are available yet.', unableLoad:'Unable to load events', starts:'Starts', ends:'Ends', active:'Active', ended:'Ended', allEvents:'All Events', mechanicsClaim:'Mechanics & Claim', results:'Results', checkClaim:'Check Claim', mechanics:'Mechanics', rewards:'Rewards', submitClaim:'Submit Claim', discord:'Discord Username', character:'Character Name', playerId:'Player ID / UID', required:'is required.', addLink:'+ Add Link', remove:'Remove', linkPlaceholder:'https://…', submitting:'Submitting…', submitEventClaim:'Submit Event Claim', claimSubmitted:'Claim Submitted', pendingSave:'Your claim is now pending review. Save your reference code.', submissionsClosed:'Submissions Closed', closedDesc:'This event is not currently accepting claims.', checkStatus:'Check Claim Status', checkStatusDesc:'Enter the reference code you received after submitting your claim.', checking:'Checking…', enterReference:'Enter your claim reference code.', claimNotFound:'No claim was found with that reference code.', approvedSent:'Approved · Reward Sent', rejected:'Rejected', pendingReview:'Pending Review', reason:'Reason', approvedClaims:'Approved · Rewards Sent', rejectedClaims:'Rejected Claims', noReviewed:'No reviewed claims have been published yet.', noApproved:'No approved claims yet.', noRejected:'No rejected claims yet.', onceRule:'One approved or pending claim is allowed for this event.', weeklyRule:'One approved or pending claim is allowed per weekly claim period.', duplicateHint:'Duplicate checks use Discord username and, when provided/required, character name and Player ID / UID.', cooldownHint:'Global cooldown: one pending or approved Event Center claim every 12 hours. A rejected claim releases the cooldown immediately.' },
  ko: { eventCenter:'이벤트 센터', webShop:'WEB 상점', events:'이벤트', intro:'진행 중인 이벤트와 참여 조건을 확인하고, 보상을 신청하며 결과까지 한 곳에서 확인하세요.', loading:'이벤트 불러오는 중…', noEvents:'현재 공개된 이벤트가 없습니다.', unableLoad:'이벤트를 불러올 수 없습니다', starts:'시작', ends:'종료', active:'진행 중', ended:'종료됨', allEvents:'전체 이벤트', mechanicsClaim:'진행 방식 및 신청', results:'결과', checkClaim:'신청 확인', mechanics:'참여 방법', rewards:'보상', submitClaim:'보상 신청', discord:'Discord 사용자명', character:'캐릭터명', playerId:'Player ID / UID', required:'항목은 필수입니다.', addLink:'+ 링크 추가', remove:'삭제', linkPlaceholder:'https://…', submitting:'제출 중…', submitEventClaim:'이벤트 보상 신청', claimSubmitted:'신청 완료', pendingSave:'신청이 검토 대기 중입니다. 참조 코드를 보관해 주세요.', submissionsClosed:'신청 마감', closedDesc:'현재 이 이벤트는 신청을 받고 있지 않습니다.', checkStatus:'신청 상태 확인', checkStatusDesc:'신청 후 받은 참조 코드를 입력하세요.', checking:'확인 중…', enterReference:'참조 코드를 입력하세요.', claimNotFound:'해당 참조 코드의 신청을 찾을 수 없습니다.', approvedSent:'승인됨 · 보상 지급 완료', rejected:'반려됨', pendingReview:'검토 대기', reason:'사유', approvedClaims:'승인됨 · 보상 지급 완료', rejectedClaims:'반려된 신청', noReviewed:'아직 공개된 검토 결과가 없습니다.', noApproved:'아직 승인된 신청이 없습니다.', noRejected:'아직 반려된 신청이 없습니다.', onceRule:'이 이벤트는 승인 또는 대기 중인 신청을 1개만 허용합니다.', weeklyRule:'매주 신청 기간마다 승인 또는 대기 중인 신청을 1개만 허용합니다.', duplicateHint:'중복 신청은 Discord 사용자명과 필요 시 캐릭터명 및 Player ID / UID로 확인됩니다.', cooldownHint:'전체 이벤트 센터 쿨다운: 대기 중 또는 승인된 신청은 12시간마다 1회만 가능합니다. 신청이 반려되면 쿨다운이 즉시 해제됩니다.' },
  th: { eventCenter:'ศูนย์กิจกรรม', webShop:'WEB Shop', events:'กิจกรรม', intro:'ดูกิจกรรม เงื่อนไข ส่งคำขอรับรางวัล และตรวจสอบผลได้ในที่เดียว', loading:'กำลังโหลดกิจกรรม…', noEvents:'ยังไม่มีกิจกรรมที่เผยแพร่', unableLoad:'ไม่สามารถโหลดกิจกรรมได้', starts:'เริ่ม', ends:'สิ้นสุด', active:'กำลังดำเนินการ', ended:'สิ้นสุดแล้ว', allEvents:'กิจกรรมทั้งหมด', mechanicsClaim:'กติกาและการรับรางวัล', results:'ผลลัพธ์', checkClaim:'ตรวจสอบคำขอ', mechanics:'กติกา', rewards:'รางวัล', submitClaim:'ส่งคำขอ', discord:'ชื่อผู้ใช้ Discord', character:'ชื่อตัวละคร', playerId:'Player ID / UID', required:'จำเป็นต้องกรอก', addLink:'+ เพิ่มลิงก์', remove:'ลบ', linkPlaceholder:'https://…', submitting:'กำลังส่ง…', submitEventClaim:'ส่งคำขอรับรางวัล', claimSubmitted:'ส่งคำขอแล้ว', pendingSave:'คำขอของคุณกำลังรอตรวจสอบ โปรดเก็บรหัสอ้างอิงไว้', submissionsClosed:'ปิดรับคำขอ', closedDesc:'กิจกรรมนี้ยังไม่เปิดรับคำขอในขณะนี้', checkStatus:'ตรวจสอบสถานะ', checkStatusDesc:'กรอกรหัสอ้างอิงที่ได้รับหลังส่งคำขอ', checking:'กำลังตรวจสอบ…', enterReference:'กรอกรหัสอ้างอิง', claimNotFound:'ไม่พบคำขอด้วยรหัสนี้', approvedSent:'อนุมัติ · ส่งรางวัลแล้ว', rejected:'ไม่ผ่าน', pendingReview:'รอตรวจสอบ', reason:'เหตุผล', approvedClaims:'อนุมัติ · ส่งรางวัลแล้ว', rejectedClaims:'คำขอที่ไม่ผ่าน', noReviewed:'ยังไม่มีผลการตรวจสอบ', noApproved:'ยังไม่มีคำขอที่อนุมัติ', noRejected:'ยังไม่มีคำขอที่ไม่ผ่าน', onceRule:'อนุญาตคำขอที่รอตรวจสอบหรืออนุมัติได้หนึ่งครั้งสำหรับกิจกรรมนี้', weeklyRule:'อนุญาตหนึ่งคำขอต่อรอบสัปดาห์', duplicateHint:'ระบบตรวจคำขอซ้ำจาก Discord และเมื่อมีการใช้ จะตรวจชื่อตัวละครและ Player ID / UID ด้วย', cooldownHint:'คูลดาวน์รวมของ Event Center: ส่งคำขอที่รอตรวจสอบหรืออนุมัติได้ 1 ครั้งทุก 12 ชั่วโมง หากคำขอถูกปฏิเสธ คูลดาวน์จะถูกยกเลิกทันที' },
  pt: { eventCenter:'Central de Eventos', webShop:'WEB Shop', events:'Eventos', intro:'Veja eventos ativos, requisitos, envie sua solicitação e acompanhe os resultados em um só lugar.', loading:'Carregando eventos…', noEvents:'Nenhum evento publicado no momento.', unableLoad:'Não foi possível carregar os eventos', starts:'Início', ends:'Fim', active:'Ativo', ended:'Encerrado', allEvents:'Todos os Eventos', mechanicsClaim:'Mecânicas e Resgate', results:'Resultados', checkClaim:'Consultar Pedido', mechanics:'Mecânicas', rewards:'Recompensas', submitClaim:'Enviar Pedido', discord:'Usuário do Discord', character:'Nome do Personagem', playerId:'Player ID / UID', required:'é obrigatório.', addLink:'+ Adicionar Link', remove:'Remover', linkPlaceholder:'https://…', submitting:'Enviando…', submitEventClaim:'Enviar Pedido do Evento', claimSubmitted:'Pedido Enviado', pendingSave:'Seu pedido está aguardando análise. Guarde o código de referência.', submissionsClosed:'Pedidos Encerrados', closedDesc:'Este evento não está aceitando pedidos no momento.', checkStatus:'Consultar Status', checkStatusDesc:'Digite o código de referência recebido após enviar o pedido.', checking:'Consultando…', enterReference:'Digite seu código de referência.', claimNotFound:'Nenhum pedido encontrado com esse código.', approvedSent:'Aprovado · Recompensa Enviada', rejected:'Rejeitado', pendingReview:'Em Análise', reason:'Motivo', approvedClaims:'Aprovados · Recompensas Enviadas', rejectedClaims:'Pedidos Rejeitados', noReviewed:'Ainda não há pedidos analisados publicados.', noApproved:'Ainda não há pedidos aprovados.', noRejected:'Ainda não há pedidos rejeitados.', onceRule:'Apenas um pedido pendente ou aprovado é permitido neste evento.', weeklyRule:'Apenas um pedido pendente ou aprovado é permitido por período semanal.', duplicateHint:'A verificação de duplicidade usa o Discord e, quando informado/exigido, nome do personagem e Player ID / UID.', cooldownHint:'Cooldown global: apenas uma solicitação pendente ou aprovada no Event Center a cada 12 horas. Uma solicitação rejeitada libera o cooldown imediatamente.' },
  'zh-TW': { eventCenter:'活動中心', webShop:'WEB 商城', events:'活動', intro:'在同一處查看進行中的活動、參加條件、提交領獎申請並查詢結果。', loading:'正在載入活動…', noEvents:'目前沒有已發布的活動。', unableLoad:'無法載入活動', starts:'開始', ends:'結束', active:'進行中', ended:'已結束', allEvents:'所有活動', mechanicsClaim:'活動規則與申請', results:'結果', checkClaim:'查詢申請', mechanics:'活動規則', rewards:'獎勵', submitClaim:'提交申請', discord:'Discord 使用者名稱', character:'角色名稱', playerId:'Player ID / UID', required:'為必填項目。', addLink:'+ 新增連結', remove:'移除', linkPlaceholder:'https://…', submitting:'提交中…', submitEventClaim:'提交活動申請', claimSubmitted:'申請已提交', pendingSave:'你的申請正在等待審核，請保存參考代碼。', submissionsClosed:'申請已關閉', closedDesc:'此活動目前不接受申請。', checkStatus:'查詢申請狀態', checkStatusDesc:'輸入提交申請後取得的參考代碼。', checking:'查詢中…', enterReference:'請輸入參考代碼。', claimNotFound:'找不到此參考代碼的申請。', approvedSent:'已批准 · 獎勵已發送', rejected:'已拒絕', pendingReview:'等待審核', reason:'原因', approvedClaims:'已批准 · 獎勵已發送', rejectedClaims:'已拒絕申請', noReviewed:'目前尚無已發布的審核結果。', noApproved:'目前尚無已批准申請。', noRejected:'目前尚無已拒絕申請。', onceRule:'此活動只允許一筆待審核或已批准申請。', weeklyRule:'每個每週申請週期只允許一筆待審核或已批准申請。', duplicateHint:'系統會使用 Discord 使用者名稱，並在有提供/要求時使用角色名稱與 Player ID / UID 檢查重複申請。', cooldownHint:'全域冷卻：每 12 小時只能有一筆待審核或已批准的活動中心申請。申請被拒絕後，冷卻會立即解除。' },
  ru: { eventCenter:'Центр событий', webShop:'WEB Магазин', events:'События', intro:'Смотрите активные события, требования, отправляйте заявку и проверяйте результаты в одном месте.', loading:'Загрузка событий…', noEvents:'Опубликованных событий пока нет.', unableLoad:'Не удалось загрузить события', starts:'Начало', ends:'Окончание', active:'Активно', ended:'Завершено', allEvents:'Все события', mechanicsClaim:'Условия и заявка', results:'Результаты', checkClaim:'Проверить заявку', mechanics:'Условия', rewards:'Награды', submitClaim:'Отправить заявку', discord:'Имя в Discord', character:'Имя персонажа', playerId:'Player ID / UID', required:'обязательно.', addLink:'+ Добавить ссылку', remove:'Удалить', linkPlaceholder:'https://…', submitting:'Отправка…', submitEventClaim:'Отправить заявку', claimSubmitted:'Заявка отправлена', pendingSave:'Заявка ожидает проверки. Сохраните код заявки.', submissionsClosed:'Приём заявок закрыт', closedDesc:'Сейчас это событие не принимает заявки.', checkStatus:'Проверить статус', checkStatusDesc:'Введите код, полученный после отправки заявки.', checking:'Проверка…', enterReference:'Введите код заявки.', claimNotFound:'Заявка с таким кодом не найдена.', approvedSent:'Одобрено · Награда отправлена', rejected:'Отклонено', pendingReview:'На проверке', reason:'Причина', approvedClaims:'Одобрено · Награды отправлены', rejectedClaims:'Отклонённые заявки', noReviewed:'Опубликованных результатов проверки пока нет.', noApproved:'Одобренных заявок пока нет.', noRejected:'Отклонённых заявок пока нет.', onceRule:'Для этого события разрешена только одна активная или одобренная заявка.', weeklyRule:'Разрешена одна активная или одобренная заявка на каждый недельный период.', duplicateHint:'Проверка дублей использует Discord и, если указано/требуется, имя персонажа и Player ID / UID.', cooldownHint:'Общий кулдаун: одна ожидающая или одобренная заявка в Центре событий каждые 12 часов. При отклонении заявки кулдаун снимается сразу.' },
}

const dateLabel = (value: string | null) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function localizeEvent(event: PlayCrowsEvent, language: LanguageCode): PlayCrowsEvent {
  if (language === 'en') return event
  const tr = event.translations?.[language]
  if (!tr) return event
  // Locale claim configuration is intentionally independent. If an older translation has
  // not been upgraded yet, fall back to English until the admin saves that locale once.
  const actionLinks = tr.action_links !== undefined ? tr.action_links : event.action_links
  const formFields = tr.form_fields !== undefined ? tr.form_fields : event.form_fields
  return {
    ...event,
    title: tr.title?.trim() || event.title,
    short_description: tr.short_description?.trim() || event.short_description,
    description: tr.description?.trim() || event.description,
    mechanics: tr.mechanics?.length ? tr.mechanics : event.mechanics,
    rewards: tr.rewards?.length ? tr.rewards : event.rewards,
    action_links: actionLinks ?? [],
    form_fields: formFields ?? [],
    require_character_name: tr.require_character_name ?? event.require_character_name,
    require_player_id: tr.require_player_id ?? event.require_player_id,
  }
}

function RichText({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g)
  return <>{parts.map((part, index) => /^https?:\/\//i.test(part) ? <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="break-all font-semibold text-[#c9aa68] underline decoration-[#c9aa68]/35 underline-offset-2 hover:text-[#e1c88d]">{part}</a> : <span key={index}>{part}</span>)}</>
}


const TEXT_PLACEHOLDER: Record<LanguageCode, string> = {
  en: 'Enter your answer…',
  ko: '답변을 입력하세요…',
  th: 'กรอกคำตอบของคุณ…',
  pt: 'Digite sua resposta…',
  'zh-TW': '請輸入您的答案…',
  ru: 'Введите ваш ответ…',
}

function defaultFieldPlaceholder(field: EventFormField, ui: UiText, language?: LanguageCode): string {
  if (field.placeholder?.trim()) return field.placeholder.trim()
  if (field.type === 'url' || field.type === 'links') return ui.linkPlaceholder
  return language ? TEXT_PLACEHOLDER[language] : 'Enter your answer…'
}

function localizeField(field: EventFormField, language: LanguageCode): EventFormField {
  if (language === 'en') return field
  const tr = field.translations?.[language]
  if (!tr) return field
  return { ...field, label: tr.label?.trim() || field.label, placeholder: tr.placeholder?.trim() || field.placeholder, helpText: tr.helpText?.trim() || field.helpText }
}

const statusBadge = (status: PlayCrowsEvent['status']) => status === 'active' ? 'border-[#22c55e]/40 bg-[#22c55e]/10 text-[#22c55e]' : status === 'ended' ? 'border-[#77746e]/40 bg-[#77746e]/10 text-[#aaa49a]' : 'border-[#d3ad62]/40 bg-[#d3ad62]/10 text-[#d3ad62]'

function PublicHeader() {
  const { language } = useI18n(); const ui = UI[language]
  return <header className="sticky top-0 z-50 border-b border-[#171a20] bg-[#0a0b0d]"><div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4"><a href="/events" className="flex min-w-0 items-center gap-3 no-underline"><img src={CrowLogo} alt="PlayCrows logo" className="h-10 w-10 rounded-full object-cover" /><div><div className="text-base font-bold leading-tight text-[#eee9df]">PLAYCROWS</div><div className="text-[10px] uppercase tracking-[0.18em] text-[#77746e]">{ui.eventCenter}</div></div></a><nav className="flex items-center gap-2 text-xs font-bold"><LanguageSelector /><a href="/" className="rounded-lg border border-[#292d34] px-3 py-2 text-[#aaa49a] no-underline hover:border-[#c9aa68] hover:text-[#c9aa68]">{ui.webShop}</a><a href="/events" className="rounded-lg border border-[#c9aa68]/50 bg-[#c9aa68]/10 px-3 py-2 text-[#c9aa68] no-underline">{ui.events}</a></nav></div></header>
}

function EmptyState({ message }: { message: string }) { return <div className="rounded-2xl border border-[#292d34] bg-[#111318] px-6 py-14 text-center text-sm text-[#77746e]">{message}</div> }

function EventList() {
  const { language } = useI18n(); const ui = UI[language]
  const [events, setEvents] = useState<PlayCrowsEvent[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('')
  useEffect(() => { void (async () => { const { data, error: loadError } = await supabase.from('events').select('*').in('status', ['active','ended']).not('published_at','is',null).order('published_at',{ ascending:false }); if (loadError) setError(loadError.message); else setEvents((data ?? []) as PlayCrowsEvent[]); setLoading(false) })() }, [])
  return <div className="min-h-screen bg-[#0a0b0d] text-[#eee9df]"><PublicHeader /><main className="mx-auto max-w-5xl px-4 py-10"><section className="mb-9 overflow-hidden rounded-2xl border border-[#c9aa68]/25 bg-[#111318] p-6 sm:p-8"><div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#c9aa68]">PlayCrows Community</div><h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{ui.eventCenter}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#8f8b84]">{ui.intro}</p></section>{loading && <EmptyState message={ui.loading} />}{error && <EmptyState message={`${ui.unableLoad}: ${error}`} />}{!loading && !error && events.length === 0 && <EmptyState message={ui.noEvents} />}<div className="grid gap-5 md:grid-cols-2">{events.map(raw => { const event = localizeEvent(raw, language); return <a key={event.id} href={`/events/${encodeURIComponent(event.slug)}`} className="group rounded-2xl border border-[#292d34] bg-[#111318] p-6 text-inherit no-underline transition hover:-translate-y-0.5 hover:border-[#c9aa68]/50"><div className="flex items-start justify-between gap-4"><div><div className="text-xs font-bold uppercase tracking-[0.15em] text-[#c9aa68]">Event #{event.event_number}</div><h2 className="mt-2 text-xl font-bold group-hover:text-[#e1c88d]">{event.title}</h2></div><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${statusBadge(event.status)}`}>{event.status === 'active' ? ui.active : ui.ended}</span></div><p className="mt-4 min-h-12 text-sm leading-6 text-[#8f8b84]">{event.short_description || event.description || ''}</p><div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-[#292d34] pt-4 text-xs text-[#77746e]">{dateLabel(event.starts_at) && <span>{ui.starts}: {dateLabel(event.starts_at)}</span>}{dateLabel(event.ends_at) && <span>{ui.ends}: {dateLabel(event.ends_at)}</span>}</div></a> })}</div></main></div>
}

function LinkGroup({ field, value, onChange, inputClass, ui }: { field: EventFormField; value: string[]; onChange: (value: string[]) => void; inputClass: string; ui: UiText }) {
  const min = Math.max(1, field.minItems ?? (field.required ? 1 : 1)); const max = Math.max(min, Math.min(20, field.maxItems ?? 10)); const links = value.length ? value : Array(min).fill('')
  const update = (i: number, next: string) => onChange(links.map((v, idx) => idx === i ? next : v))
  return <div className="mt-2 space-y-2">{links.map((link, i) => <div key={i} className="flex gap-2"><input type="url" value={link} onChange={e => update(i, e.target.value)} placeholder={defaultFieldPlaceholder(field, ui)} className={`${inputClass} mt-0 flex-1`} /><button type="button" disabled={links.length <= min} onClick={() => onChange(links.filter((_, idx) => idx !== i))} className="rounded-lg border border-[#ef4444]/30 px-3 text-xs text-[#ef4444] disabled:opacity-30">{ui.remove}</button></div>)}{links.length < max && <button type="button" onClick={() => onChange([...links, ''])} className="rounded-lg border border-[#c9aa68]/40 px-3 py-2 text-xs font-bold text-[#c9aa68]">{ui.addLink}</button>}</div>
}

const normalizeProofUrl=(value:string)=>{try{const u=new URL(value.trim());u.hash='';u.protocol='https:';u.hostname=u.hostname.toLowerCase().replace(/^www\./,'');if(u.hostname==='m.facebook.com'||u.hostname==='web.facebook.com')u.hostname='facebook.com';u.pathname=u.pathname.replace(/\/+$/,'');return `${u.hostname}${u.pathname}${u.search}`}catch{return value.trim().toLowerCase()}}

function SubmissionForm({ event }: { event: PlayCrowsEvent }) {
  const { language } = useI18n(); const ui = UI[language]; const fields = (event.form_fields ?? []).map(f => localizeField(f, language))
  const [discord,setDiscord]=useState(''); const [character,setCharacter]=useState(''); const [playerId,setPlayerId]=useState(''); const [answers,setAnswers]=useState<Record<string,EventAnswerValue>>({}); const [submitting,setSubmitting]=useState(false); const [error,setError]=useState(''); const [reference,setReference]=useState('')
  const updateAnswer = (field: EventFormField, value: EventAnswerValue) => setAnswers(current => ({ ...current, [field.id]: value }))
  const submit = async (e: FormEvent) => { e.preventDefault(); if (submitting) return; setError(''); if (!discord.trim()) return setError(`${ui.discord} ${ui.required}`); if (event.require_character_name && !character.trim()) return setError(`${ui.character} ${ui.required}`); if (event.require_player_id && !playerId.trim()) return setError(`${ui.playerId} ${ui.required}`); for (const field of fields) { const raw = answers[field.id]; if (field.type === 'links') { const values = Array.isArray(raw) ? raw.map(v => v.trim()).filter(Boolean) : []; const min = field.minItems ?? (field.required ? 1 : 0); if (values.length < min) return setError(`${field.label}: minimum ${min} link${min === 1 ? '' : 's'}.`) } else if (field.required && !String(raw ?? '').trim()) return setError(`${field.label} ${ui.required}`) } const proofLinks=fields.flatMap(field=>{const raw=answers[field.id];if(field.type==='links')return Array.isArray(raw)?raw.map(v=>v.trim()).filter(Boolean):[];if(field.type==='url'){const value=String(raw??'').trim();return value?[value]:[]}return []});const normalized=proofLinks.map(normalizeProofUrl);if(new Set(normalized).size!==normalized.length)return setError('Duplicate links detected. Please submit each proof link only once.');setSubmitting(true); const cleanAnswers = Object.fromEntries(Object.entries(answers).map(([k,v]) => [k, Array.isArray(v) ? v.map((x: string) => x.trim()).filter(Boolean) : String(v).trim()])); const { data,error:submitError } = await supabase.rpc('submit_event_claim_localized',{ p_event_id:event.id,p_language:language,p_discord_username:discord.trim(),p_character_name:character.trim()||null,p_player_id:playerId.trim()||null,p_answers:cleanAnswers }); setSubmitting(false); if (submitError) return setError(submitError.message); const result=Array.isArray(data)?data[0]:data; setReference(result?.reference_code ?? '') }
  if (reference) return <div className="rounded-2xl border border-[#22c55e]/30 bg-[#22c55e]/5 p-6 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#22c55e]/40 text-2xl text-[#22c55e]">✓</div><h3 className="mt-4 text-xl font-bold">{ui.claimSubmitted}</h3><p className="mt-2 text-sm text-[#8f8b84]">{ui.pendingSave}</p><div className="mt-4 rounded-xl border border-[#c9aa68]/25 bg-black/20 p-4 font-mono text-lg font-bold text-[#c9aa68]">{reference}</div></div>
  const inputClass='mt-2 w-full rounded-lg border border-[#292d34] bg-[#0d0f12] px-3 py-3 text-sm font-normal text-[#eee9df] outline-none focus:border-[#c9aa68]'
  return <form onSubmit={submit} className="rounded-2xl border border-[#292d34] bg-[#111318] p-5 sm:p-6"><div className="mb-5"><div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#c9aa68]">{ui.submitClaim}</div><h3 className="mt-2 text-xl font-bold">Event #{event.event_number}</h3><p className="mt-2 text-[11px] leading-5 text-[#77746e]">{event.claim_frequency === 'weekly' ? ui.weeklyRule : ui.onceRule} {ui.duplicateHint}</p><p className="mt-2 rounded-lg border border-[#c9aa68]/20 bg-[#c9aa68]/5 px-3 py-2 text-[11px] leading-5 text-[#c9aa68]">⏱ {ui.cooldownHint}</p></div><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold text-[#aaa49a]">{ui.discord} *<input value={discord} onChange={e=>setDiscord(e.target.value)} className={inputClass} placeholder="yourname" autoComplete="off" /></label><label className="text-xs font-bold text-[#aaa49a]">{ui.character}{event.require_character_name?' *':''}<input value={character} onChange={e=>setCharacter(e.target.value)} className={inputClass} /></label><label className="text-xs font-bold text-[#aaa49a] sm:col-span-2">{ui.playerId}{event.require_player_id?' *':''}<input value={playerId} onChange={e=>setPlayerId(e.target.value)} className={inputClass} /></label></div><div className="mt-4 grid gap-4">{fields.map(field => <label key={field.id} className="text-xs font-bold text-[#aaa49a]">{field.label}{field.required?' *':''}{field.type === 'links' ? <LinkGroup field={field} value={Array.isArray(answers[field.id]) ? answers[field.id] as string[] : []} onChange={v=>updateAnswer(field,v)} inputClass={inputClass} ui={ui} /> : field.type === 'textarea' ? <textarea rows={4} value={String(answers[field.id] ?? '')} onChange={e=>updateAnswer(field,e.target.value)} placeholder={defaultFieldPlaceholder(field, ui, language)} className={`${inputClass} resize-y`} /> : <input type={field.type === 'url' ? 'url' : 'text'} value={String(answers[field.id] ?? '')} onChange={e=>updateAnswer(field,e.target.value)} placeholder={defaultFieldPlaceholder(field, ui, language)} className={inputClass} />}{field.helpText && <span className="mt-1 block font-normal leading-5 text-[#77746e]">{field.helpText}</span>}</label>)}</div>{error && <div className="mt-4 rounded-lg border border-[#ef4444]/30 bg-[#ef4444]/8 px-3 py-2 text-xs text-[#ef4444]">{error}</div>}<button disabled={submitting} className="mt-5 w-full rounded-lg border border-[#c9aa68] bg-[#c9aa68] px-4 py-3 text-sm font-extrabold text-[#17120a] hover:bg-[#e1c88d] disabled:opacity-60">{submitting?ui.submitting:ui.submitEventClaim}</button></form>
}

function ClaimStatusLookup() {
  const { language }=useI18n(); const ui=UI[language]; const [reference,setReference]=useState(''); const [loading,setLoading]=useState(false); const [result,setResult]=useState<{reference_code:string;event_number:string;event_title:string;discord_username:string;status:string;rejection_reason:string|null;reward_sent_at:string|null;updated_at:string}|null>(null); const [message,setMessage]=useState('')
  const lookup=async()=>{ if(!reference.trim()) return setMessage(ui.enterReference); setLoading(true);setMessage('');setResult(null);const {data,error}=await supabase.rpc('get_event_claim_status',{p_reference_code:reference.trim()});setLoading(false);if(error)return setMessage(error.message);const row=Array.isArray(data)?data[0]:data;if(!row)return setMessage(ui.claimNotFound);setResult(row) }
  const statusClass=result?.status==='approved'?'text-[#22c55e]':result?.status==='rejected'?'text-[#ef4444]':'text-[#d3ad62]'
  return <div className="rounded-2xl border border-[#292d34] bg-[#111318] p-6"><h2 className="text-lg font-bold">🔎 {ui.checkStatus}</h2><p className="mt-2 text-sm text-[#77746e]">{ui.checkStatusDesc}</p><div className="mt-4 flex flex-col gap-2 sm:flex-row"><input value={reference} onChange={e=>setReference(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void lookup()}} placeholder="EV-XXXXXXXXXX" className="min-h-11 flex-1 rounded-lg border border-[#292d34] bg-[#0d0f12] px-3 font-mono text-sm outline-none focus:border-[#c9aa68]"/><button onClick={()=>void lookup()} disabled={loading} className="rounded-lg bg-[#c9aa68] px-5 py-3 text-xs font-bold text-[#17120a]">{loading?ui.checking:ui.checkStatus}</button></div>{message&&<div className="mt-4 text-xs text-[#aaa49a]">{message}</div>}{result&&<div className="mt-5 rounded-xl border border-[#292d34] bg-black/20 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><div className="text-[10px] uppercase tracking-widest text-[#77746e]">Event #{result.event_number}</div><div className="mt-1 font-bold">{result.event_title}</div></div><div className={`text-sm font-extrabold uppercase ${statusClass}`}>{result.status==='approved'?`✅ ${ui.approvedSent}`:result.status==='rejected'?`❌ ${ui.rejected}`:`⏳ ${ui.pendingReview}`}</div></div><div className="mt-4 grid gap-2 text-xs text-[#aaa49a] sm:grid-cols-2"><div>Discord: <strong className="text-[#eee9df]">{result.discord_username}</strong></div><div>Reference: <strong className="font-mono text-[#c9aa68]">{result.reference_code}</strong></div></div>{result.rejection_reason&&<div className="mt-4 rounded-lg border border-[#ef4444]/25 bg-[#ef4444]/5 px-3 py-2 text-xs text-[#ef4444]">{ui.reason}: {result.rejection_reason}</div>}</div>}</div>
}

function Results({eventId}:{eventId:string}) { const {language}=useI18n();const ui=UI[language];const [rows,setRows]=useState<EventSubmission[]>([]);useEffect(()=>{void(async()=>{const{data}=await supabase.from('event_public_results').select('*').eq('event_id',eventId).order('updated_at',{ascending:false});setRows((data??[]) as EventSubmission[])})()},[eventId]);const approved=rows.filter(r=>r.status==='approved'),rejected=rows.filter(r=>r.status==='rejected');if(!rows.length)return <p className="text-sm text-[#77746e]">{ui.noReviewed}</p>;return <div className="grid gap-5 md:grid-cols-2"><div className="rounded-xl border border-[#22c55e]/25 bg-[#22c55e]/5 p-5"><h3 className="font-bold text-[#22c55e]">🟢 {ui.approvedClaims}</h3><div className="mt-4 space-y-2 text-sm">{approved.length?approved.map(r=><div key={r.id}>✅ {r.discord_username}</div>):<div className="text-[#77746e]">{ui.noApproved}</div>}</div></div><div className="rounded-xl border border-[#ef4444]/25 bg-[#ef4444]/5 p-5"><h3 className="font-bold text-[#ef4444]">🔴 {ui.rejectedClaims}</h3><div className="mt-4 space-y-3 text-sm">{rejected.length?rejected.map(r=><div key={r.id}><div>❌ {r.discord_username}</div>{r.rejection_reason&&<div className="ml-5 mt-1 text-xs text-[#9f9890]">{r.rejection_reason}</div>}</div>):<div className="text-[#77746e]">{ui.noRejected}</div>}</div></div></div> }


function EventActionButtons({ links }: { links: NonNullable<PlayCrowsEvent['action_links']> }) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const copyAction = async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedId(id)
      window.setTimeout(() => setCopiedId(current => current === id ? null : current), 2200)
    } catch {
      // Fallback for browsers that block navigator.clipboard.
      const textarea = document.createElement('textarea')
      textarea.value = content
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.focus()
      textarea.select()
      document.execCommand('copy')
      textarea.remove()
      setCopiedId(id)
      window.setTimeout(() => setCopiedId(current => current === id ? null : current), 2200)
    }
  }

  const visible = links.filter(link => {
    const kind = link.kind ?? 'url'
    return kind === 'copy'
      ? Boolean(link.content?.trim())
      : /^https?:\/\//i.test(link.url ?? '')
  })

  if (!visible.length) return null

  return (
    <div className="mt-5 flex flex-wrap gap-2">
      {visible.map(link => {
        const kind = link.kind ?? 'url'

        if (kind === 'copy') {
          const copied = copiedId === link.id
          return (
            <button
              key={link.id}
              type="button"
              onClick={() => void copyAction(link.id, link.content ?? '')}
              className="inline-flex items-center gap-2 rounded-lg border border-[#c9aa68]/50 bg-[#c9aa68]/10 px-4 py-2.5 text-xs font-extrabold text-[#c9aa68] transition hover:border-[#e1c88d] hover:bg-[#c9aa68]/15 hover:text-[#e1c88d]"
            >
              {copied ? '✓ Copied!' : link.label}
              <span aria-hidden="true">{copied ? '' : '⧉'}</span>
            </button>
          )
        }

        return (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-[#c9aa68]/50 bg-[#c9aa68]/10 px-4 py-2.5 text-xs font-extrabold text-[#c9aa68] no-underline transition hover:border-[#e1c88d] hover:bg-[#c9aa68]/15 hover:text-[#e1c88d]"
          >
            {link.label} <span aria-hidden="true">↗</span>
          </a>
        )
      })}
    </div>
  )
}

function EventDetail({slug}:{slug:string}) {
  const {language}=useI18n();const ui=UI[language];const [rawEvent,setRawEvent]=useState<PlayCrowsEvent|null>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [tab,setTab]=useState<'details'|'results'|'status'>('details');useEffect(()=>{void(async()=>{const{data,error:loadError}=await supabase.from('events').select('*').eq('slug',slug).in('status',['active','ended']).not('published_at','is',null).maybeSingle();if(loadError)setError(loadError.message);else setRawEvent(data as PlayCrowsEvent|null);setLoading(false)})()},[slug]);const event=rawEvent?localizeEvent(rawEvent,language):null;const canSubmit=useMemo(()=>{if(!event||event.status!=='active')return false;const now=Date.now();if(event.starts_at&&new Date(event.starts_at).getTime()>now)return false;if(event.ends_at&&new Date(event.ends_at).getTime()<now)return false;return true},[event]);return <div className="min-h-screen bg-[#0a0b0d] text-[#eee9df]"><PublicHeader/><main className="mx-auto max-w-5xl px-4 py-8 sm:py-10"><a href="/events" className="text-xs font-bold text-[#c9aa68] no-underline">← {ui.allEvents}</a>{loading&&<div className="mt-6"><EmptyState message={ui.loading}/></div>}{error&&<div className="mt-6"><EmptyState message={`${ui.unableLoad}: ${error}`}/></div>}{!loading&&!event&&<div className="mt-6"><EmptyState message={ui.noEvents}/></div>}{event&&<><section className="mt-5 rounded-2xl border border-[#c9aa68]/25 bg-[#111318] p-6 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="text-xs font-bold uppercase tracking-[0.18em] text-[#c9aa68]">Event #{event.event_number}</div><h1 className="mt-2 text-3xl font-extrabold">{event.title}</h1></div><span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase ${statusBadge(event.status)}`}>{event.status==='active'?ui.active:ui.ended}</span></div>{event.description&&<p className="mt-5 max-w-3xl whitespace-pre-line text-sm leading-7 text-[#aaa49a]"><RichText text={event.description}/></p>}{(event.action_links??[]).length>0&&<EventActionButtons links={event.action_links??[]}/>}<div className="mt-5 flex flex-wrap gap-4 text-xs text-[#77746e]">{dateLabel(event.starts_at)&&<span>{ui.starts}: {dateLabel(event.starts_at)}</span>}{dateLabel(event.ends_at)&&<span>{ui.ends}: {dateLabel(event.ends_at)}</span>}</div></section><div className="mt-6 flex gap-2 rounded-xl border border-[#292d34] bg-[#0f1115] p-1"><button onClick={()=>setTab('details')} className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold ${tab==='details'?'bg-[#c9aa68]/12 text-[#c9aa68]':'text-[#77746e]'}`}>{ui.mechanicsClaim}</button><button onClick={()=>setTab('results')} className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold ${tab==='results'?'bg-[#c9aa68]/12 text-[#c9aa68]':'text-[#77746e]'}`}>{ui.results}</button><button onClick={()=>setTab('status')} className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold ${tab==='status'?'bg-[#c9aa68]/12 text-[#c9aa68]':'text-[#77746e]'}`}>{ui.checkClaim}</button></div>{tab==='details'?<div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.92fr]"><div className="space-y-6"><section className="rounded-2xl border border-[#292d34] bg-[#111318] p-6"><h2 className="text-lg font-bold">📌 {ui.mechanics}</h2><ol className="mt-4 space-y-3 text-sm leading-6 text-[#aaa49a]">{(event.mechanics??[]).map((item,i)=><li key={i} className="flex gap-3"><span className="font-bold text-[#c9aa68]">{i+1}.</span><span><RichText text={item}/></span></li>)}</ol></section><section className="rounded-2xl border border-[#292d34] bg-[#111318] p-6"><h2 className="text-lg font-bold">🎁 {ui.rewards}</h2><div className="mt-4 space-y-2 text-sm text-[#aaa49a]">{(event.rewards??[]).map((item,i)=><div key={i}>◆ <RichText text={item}/></div>)}</div></section></div><div>{canSubmit?<SubmissionForm event={event}/>:<div className="rounded-2xl border border-[#292d34] bg-[#111318] p-6 text-center"><div className="text-2xl">🔒</div><h3 className="mt-3 font-bold">{ui.submissionsClosed}</h3><p className="mt-2 text-sm text-[#77746e]">{ui.closedDesc}</p></div>}</div></div>:tab==='results'?<div className="mt-6"><Results eventId={event.id}/></div>:<div className="mt-6"><ClaimStatusLookup/></div>}</>}</main></div>
}

function EventCenterInner(){const path=window.location.pathname.replace(/\/+$/,'')||'/events';const match=path.match(/^\/events\/([^/]+)$/);return match?<EventDetail slug={decodeURIComponent(match[1])}/>:<EventList/>}
export function EventCenter(){return <I18nProvider><EventCenterInner/></I18nProvider>}
