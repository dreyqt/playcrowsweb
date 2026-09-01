import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import CrowLogo from '../assets/playcrows-icon.jpg'
import { supabase } from '../lib/supabase'

type Locale = 'en' | 'ko' | 'th' | 'pt' | 'zh-TW' | 'ru'
type EventType = 'share_fb' | 'invite_discord' | 'share_livestream'
type PublicResult = { discord_id:string; event_type:EventType; public_status:'pending'|'processed'|'rejected'; review_note:string|null }

const SITE_SHARE_LOCALES: Locale[] = ['ko', 'zh-TW', 'ru']

const PROMOTIONAL_TEXT: Record<'ko'|'zh-TW'|'ru', string> = {
  ko: `⚔️ PLAYCROWS V2 베타 테스트 오픈! ⚔️

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
http://download.playcrows.com/pv2/PlayAZ-v2-tw-3.apk`,
  'zh-TW': `⚔️ PLAYCROWS V2 BETA 測試現已開放！⚔️

PlayCrows 的全新篇章已經展開！🐦‍⬛🔥

PlayCrows V2 Beta 測試現已正式開放！

立即加入測試、探索伺服器、嘗試不同流派，並協助我們在正式推出前改善 V2。

⚔️ V2 伺服器設定
🔹 經驗值倍率：50倍
🔹 掉落倍率：30倍
🔹 強化機率：3倍

💎 2,000,000 BETA 鑽石
每位 Beta 測試玩家都可以使用 2,000,000 鑽石！

自由使用鑽石測試裝備、流派、成長進度及其他 V2 內容。

📝 V2 註冊
https://account002.playcrows.com/register.php

💻 V2 PC 下載
🇺🇸 English
http://download.playcrows.com/pv2/PlayV2-PC-en-3.zip
🇰🇷 Korean
http://download.playcrows.com/pv2/PlayV2-PC-kr-3.zip
🇹🇼 Taiwan
http://download.playcrows.com/pv2/PlayV2-PC-tw-3.zip

📱 V2 Android 下載
🇺🇸 English
http://download.playcrows.com/pv2/PlayAZ-v2-en-3.apk
🇰🇷 Korean
http://download.playcrows.com/pv2/PlayAZ-v2-kr-3.apk
🇹🇼 Taiwan
http://download.playcrows.com/pv2/PlayAZ-v2-tw-3.apk`,
  ru: `⚔️ БЕТА-ТЕСТ PLAYCROWS V2 УЖЕ ОТКРЫТ! ⚔️

Началась новая глава PlayCrows! 🐦‍⬛🔥

Бета-тест PlayCrows V2 официально открыт!

Присоединяйтесь к тестированию, исследуйте сервер, пробуйте разные сборки и помогите нам улучшить V2 до официального запуска.

⚔️ НАСТРОЙКИ СЕРВЕРА V2
🔹 Опыт: 50x
🔹 Шанс выпадения: 30x
🔹 Шанс улучшения: 3x

💎 2 000 000 БЕТА-АЛМАЗОВ
Каждый участник бета-теста получит доступ к 2 000 000 алмазов!

Используйте их для свободного тестирования экипировки, сборок, развития и другого контента V2.

📝 РЕГИСТРАЦИЯ V2
https://account002.playcrows.com/register.php

💻 СКАЧАТЬ V2 ДЛЯ ПК
🇺🇸 English
http://download.playcrows.com/pv2/PlayV2-PC-en-3.zip
🇰🇷 Korean
http://download.playcrows.com/pv2/PlayV2-PC-kr-3.zip
🇹🇼 Taiwan
http://download.playcrows.com/pv2/PlayV2-PC-tw-3.zip

📱 СКАЧАТЬ V2 ДЛЯ ANDROID
🇺🇸 English
http://download.playcrows.com/pv2/PlayAZ-v2-en-3.apk
🇰🇷 Korean
http://download.playcrows.com/pv2/PlayAZ-v2-kr-3.apk
🇹🇼 Taiwan
http://download.playcrows.com/pv2/PlayAZ-v2-tw-3.apk`,
}

type Copy = {
  title:string; subtitle:string; warning:string; closed:string; choose:string; daily:string; fb:string; promotion:string; invite:string; live:string
  mechanics:string; player:string; playerId:string; nickname:string; discord:string; fbTitle:string; fbBody:string; official:string
  promotionTitle:string; promotionBody:string; copyLink:string; copied:string; fbProof:string; siteProof:string; inviteBody:string; inviteLink:string
  screenshot:string; fileHint:string; liveBody:string; liveLink:string; confirm:string; submit:string; submitting:string; success:string; pending:string
  another:string; invalid:string; duplicateLinks:string; badFile:string; unavailable:string
}

const EN: Copy = {
  title:'V2 Beta Claim Event',subtitle:'Choose a beta promotion event, complete its requirements, and submit your proof.',warning:'This claim page is exclusively for PlayCrows V2 Beta. V1 accounts and characters will be rejected.',closed:'Beta claims are currently closed.',choose:'Choose an Event',daily:'Only one pending or processed claim per event is allowed each day (GMT+8). Rejected claims may be corrected and submitted again.',fb:'Share Facebook',promotion:'Share Server Link',invite:'Invite Discord',live:'Share Livestream',mechanics:'Mechanics',player:'Player Information',playerId:'V2 Player ID',nickname:'V2 Nickname',discord:'Discord ID / Username',fbTitle:'Share the official Facebook post',fbBody:'Share the official post in 5 different public and active Facebook gaming/community groups. Submit the direct link to each shared post—not only the group homepage. Duplicate, private, deleted, or unavailable posts will not count.',official:'Open Official Facebook Post',promotionTitle:'Promote the PlayCrows V2 server link',promotionBody:'Copy the V2 server link below and post it on 5 different active promotional or gaming-community websites. Submit the direct URL to each promotional post. Duplicate, private, deleted, or unavailable posts will not count.',copyLink:'Copy V2 Server Link',copied:'Copied!',fbProof:'Facebook Shared Post Link',siteProof:'Promotional Post Link',inviteBody:'Invite 5 unique users using your personal Discord invite link. Fake, alternate, duplicate, or suspicious accounts will not count, and invited users must remain in the server during verification.',inviteLink:'Your Unique Discord Invite Link',screenshot:'Invite Tracker Screenshot',fileHint:'JPG, PNG, or WEBP · maximum 5 MB',liveBody:'Livestream PlayCrows V2 gameplay for at least 4 hours. The livestream or replay must remain publicly accessible during review.',liveLink:'Livestream / Replay Link',confirm:'I confirm that my information is correct, this claim is for V2 Beta, and I completed the selected event requirements.',submit:'Submit Beta Claim',submitting:'Submitting…',success:'Claim Submitted!',pending:'Your claim is pending review. Save this reference code:',another:'Submit Another Event',invalid:'Please complete all required fields.',duplicateLinks:'Every proof link must be unique.',badFile:'Upload one JPG, PNG, or WEBP image no larger than 5 MB.',unavailable:'Unable to load the claim page. Please try again.'
}

const TEXT: Record<Locale, Copy> = {
  en: EN,
  ko: {...EN,title:'V2 베타 보상 신청 이벤트',subtitle:'베타 홍보 이벤트를 선택하고 조건을 완료한 후 인증 자료를 제출해 주세요.',warning:'본 신청 페이지는 PlayCrows V2 베타 전용입니다. V1 계정 및 캐릭터로 신청할 경우 반려됩니다.',closed:'현재 베타 보상 신청이 마감되었습니다.',choose:'이벤트 선택',daily:'각 이벤트는 하루에 대기 중 또는 처리 완료 신청 1건만 허용됩니다(GMT+8 기준). 반려된 신청은 수정 후 다시 제출할 수 있습니다.',promotion:'서버 정보 홍보',invite:'Discord 초대',live:'라이브 방송 공유',mechanics:'참여 방법',player:'플레이어 정보',playerId:'V2 Player ID',nickname:'V2 캐릭터명',discord:'Discord ID / 사용자명',promotionTitle:'PlayCrows V2 서버 정보를 홍보해 주세요',promotionBody:'아래의 전체 V2 홍보 문구를 복사하여 서로 다른 활성 홍보 사이트 또는 게임 커뮤니티 5곳에 게시해 주세요. 사이트 메인 링크가 아닌 실제 홍보 게시물의 직접 URL을 제출해야 합니다. 중복, 비공개, 삭제 또는 확인할 수 없는 게시물은 인정되지 않습니다.',copyLink:'전체 홍보 문구 복사',copied:'복사 완료!',siteProof:'홍보 게시물 링크',inviteBody:'본인의 Discord 초대 링크로 서로 다른 신규 사용자 5명을 초대해 주세요. 가짜·부계정·중복·의심 계정은 인정되지 않으며, 확인 시점까지 서버에 남아 있어야 합니다.',inviteLink:'개인 Discord 초대 링크',screenshot:'Invite Tracker 스크린샷',fileHint:'JPG, PNG 또는 WEBP · 최대 5MB',liveBody:'PlayCrows V2 플레이 화면을 최소 4시간 라이브 방송해 주세요. 검토 시 라이브 방송 또는 다시보기 링크가 공개 상태여야 합니다.',liveLink:'라이브 방송 / 다시보기 링크',confirm:'입력한 정보가 정확하고, V2 베타 신청이며, 선택한 이벤트 조건을 모두 완료했음을 확인합니다.',submit:'베타 보상 신청',submitting:'제출 중…',success:'신청 완료!',pending:'신청이 검토 대기 중입니다. 아래 참조 코드를 보관해 주세요:',another:'다른 이벤트 신청',invalid:'필수 항목을 모두 입력해 주세요.',duplicateLinks:'각 인증 링크는 서로 달라야 합니다.',badFile:'5MB 이하의 JPG, PNG 또는 WEBP 이미지 1개를 업로드해 주세요.',unavailable:'신청 페이지를 불러올 수 없습니다. 다시 시도해 주세요.'},
  th: {...EN,title:'กิจกรรมรับรางวัล V2 Beta',subtitle:'เลือกกิจกรรม ทำตามเงื่อนไข และส่งหลักฐานของคุณ',warning:'แบบฟอร์มนี้สำหรับ PlayCrows V2 Beta เท่านั้น การใช้บัญชีหรือตัวละคร V1 จะถูกปฏิเสธ',closed:'ขณะนี้ปิดรับคำขอ Beta แล้ว',choose:'เลือกกิจกรรม',daily:'อนุญาตเพียง 1 คำขอที่รอดำเนินการหรือดำเนินการแล้วต่อกิจกรรมต่อวัน (GMT+8) คำขอที่ถูกปฏิเสธสามารถแก้ไขและส่งใหม่ได้',fb:'แชร์ Facebook',invite:'เชิญ Discord',live:'แชร์ไลฟ์สตรีม',mechanics:'กติกา',player:'ข้อมูลผู้เล่น',playerId:'V2 Player ID',nickname:'ชื่อตัวละคร V2',discord:'Discord ID / ชื่อผู้ใช้',fbTitle:'แชร์โพสต์ Facebook อย่างเป็นทางการ',fbBody:'แชร์โพสต์อย่างเป็นทางการไปยังกลุ่มเกมหรือชุมชน Facebook ที่เป็นสาธารณะและใช้งานอยู่ 5 กลุ่ม ส่งลิงก์ตรงของแต่ละโพสต์ที่แชร์ ไม่ใช่หน้าหลักของกลุ่ม ลิงก์ซ้ำ ส่วนตัว ถูกลบ หรือเปิดดูไม่ได้จะไม่นับ',official:'เปิดโพสต์ Facebook',fbProof:'ลิงก์โพสต์ Facebook ที่แชร์',inviteBody:'เชิญผู้ใช้ใหม่ 5 คนด้วยลิงก์เชิญ Discord ส่วนตัวของคุณ บัญชีปลอม บัญชีสำรอง บัญชีซ้ำ หรือน่าสงสัยจะไม่นับ และผู้ที่ได้รับเชิญต้องอยู่ในเซิร์ฟเวอร์ระหว่างการตรวจสอบ',inviteLink:'ลิงก์เชิญ Discord ของคุณ',screenshot:'ภาพหน้าจอ Invite Tracker',fileHint:'JPG, PNG หรือ WEBP · สูงสุด 5 MB',liveBody:'ไลฟ์สตรีมการเล่น PlayCrows V2 อย่างน้อย 4 ชั่วโมง ไลฟ์หรือวิดีโอย้อนหลังต้องเปิดเป็นสาธารณะระหว่างการตรวจสอบ',liveLink:'ลิงก์ไลฟ์ / วิดีโอย้อนหลัง',confirm:'ฉันยืนยันว่าข้อมูลถูกต้อง คำขอนี้สำหรับ V2 Beta และฉันทำตามเงื่อนไขครบถ้วน',submit:'ส่งคำขอ Beta',submitting:'กำลังส่ง…',success:'ส่งคำขอแล้ว!',pending:'คำขออยู่ระหว่างการตรวจสอบ โปรดเก็บรหัสอ้างอิงนี้:',another:'ส่งกิจกรรมอื่น',invalid:'โปรดกรอกข้อมูลที่จำเป็นให้ครบถ้วน',duplicateLinks:'ลิงก์หลักฐานทุกลิงก์ต้องไม่ซ้ำกัน',badFile:'อัปโหลดไฟล์ JPG, PNG หรือ WEBP 1 ไฟล์ ขนาดไม่เกิน 5 MB',unavailable:'ไม่สามารถโหลดหน้าส่งคำขอได้ กรุณาลองใหม่'},
  pt: {...EN,title:'Evento de Recompensa V2 Beta',subtitle:'Escolha um evento, conclua os requisitos e envie suas provas.',warning:'Esta página é exclusiva para o PlayCrows V2 Beta. Contas e personagens V1 serão rejeitados.',closed:'As solicitações Beta estão fechadas no momento.',choose:'Escolha um evento',daily:'É permitida apenas uma solicitação pendente ou processada por evento a cada dia (GMT+8). Solicitações rejeitadas podem ser corrigidas e reenviadas.',fb:'Compartilhar no Facebook',invite:'Convidar no Discord',live:'Compartilhar transmissão',mechanics:'Mecânica',player:'Informações do jogador',playerId:'V2 Player ID',nickname:'Apelido no V2',discord:'Discord ID / usuário',fbTitle:'Compartilhe a publicação oficial no Facebook',fbBody:'Compartilhe a publicação oficial em 5 grupos públicos e ativos de jogos/comunidades no Facebook. Envie o link direto de cada publicação compartilhada, não apenas a página do grupo. Links duplicados, privados, excluídos ou indisponíveis não serão aceitos.',official:'Abrir publicação oficial',fbProof:'Link da publicação compartilhada',inviteBody:'Convide 5 usuários únicos usando seu link pessoal do Discord. Contas falsas, alternativas, duplicadas ou suspeitas não serão aceitas, e os convidados devem permanecer no servidor durante a verificação.',inviteLink:'Seu link exclusivo do Discord',screenshot:'Captura do Invite Tracker',fileHint:'JPG, PNG ou WEBP · máximo de 5 MB',liveBody:'Transmita o PlayCrows V2 por pelo menos 4 horas. A transmissão ou replay deve permanecer público durante a análise.',liveLink:'Link da transmissão / replay',confirm:'Confirmo que as informações estão corretas, que esta solicitação é para o V2 Beta e que concluí os requisitos.',submit:'Enviar solicitação Beta',submitting:'Enviando…',success:'Solicitação enviada!',pending:'Sua solicitação aguarda análise. Guarde este código:',another:'Enviar outro evento',invalid:'Preencha todos os campos obrigatórios.',duplicateLinks:'Todos os links de prova devem ser diferentes.',badFile:'Envie uma imagem JPG, PNG ou WEBP de até 5 MB.',unavailable:'Não foi possível carregar a página. Tente novamente.'},
  'zh-TW': {...EN,title:'V2 Beta 獎勵申請活動',subtitle:'選擇活動、完成要求並提交證明。',warning:'此申請頁面僅適用於 PlayCrows V2 Beta。使用 V1 帳號或角色的申請將被拒絕。',closed:'目前已關閉 Beta 獎勵申請。',choose:'選擇活動',daily:'每項活動每天只允許一筆待處理或已處理申請（GMT+8）。被退回的申請可修正後重新提交。',promotion:'分享伺服器資訊',invite:'邀請 Discord',live:'分享直播',mechanics:'活動方式',player:'玩家資料',playerId:'V2 Player ID',nickname:'V2 角色名稱',discord:'Discord ID／使用者名稱',promotionTitle:'宣傳 PlayCrows V2 伺服器資訊',promotionBody:'複製下方完整的 V2 宣傳內容，並發布到 5 個不同且活躍的宣傳網站或遊戲社群。請提交每篇宣傳貼文的直接網址，而不是網站首頁。重複、私人、已刪除或無法查看的貼文不予計算。',copyLink:'複製完整宣傳內容',copied:'已複製！',siteProof:'宣傳貼文連結',inviteBody:'使用你的個人 Discord 邀請連結邀請 5 位不同的新使用者。假帳號、小號、重複或可疑帳號不予計算，受邀者在審核時必須仍留在伺服器。',inviteLink:'你的 Discord 邀請連結',screenshot:'Invite Tracker 截圖',fileHint:'JPG、PNG 或 WEBP · 最大 5 MB',liveBody:'直播 PlayCrows V2 遊戲內容至少 4 小時。審核期間直播或重播必須公開可見。',liveLink:'直播／重播連結',confirm:'我確認資料正確、本申請適用於 V2 Beta，且已完成所選活動要求。',submit:'提交 Beta 申請',submitting:'提交中…',success:'申請已提交！',pending:'申請正在等待審核，請保存此參考代碼：',another:'申請其他活動',invalid:'請填寫所有必填欄位。',duplicateLinks:'每個證明連結必須不同。',badFile:'請上傳一張不超過 5 MB 的 JPG、PNG 或 WEBP 圖片。',unavailable:'無法載入申請頁面，請重試。'},
  ru: {...EN,title:'Заявка на награду V2 Beta',subtitle:'Выберите событие, выполните условия и отправьте подтверждения.',warning:'Эта форма предназначена только для PlayCrows V2 Beta. Заявки с аккаунтами и персонажами V1 будут отклонены.',closed:'Приём заявок Beta сейчас закрыт.',choose:'Выберите событие',daily:'Для каждого события допускается только одна ожидающая или обработанная заявка в день (GMT+8). Отклонённую заявку можно исправить и отправить повторно.',promotion:'Публикация информации',invite:'Приглашение в Discord',live:'Прямая трансляция',mechanics:'Условия',player:'Данные игрока',playerId:'V2 Player ID',nickname:'Имя персонажа V2',discord:'Discord ID / имя пользователя',promotionTitle:'Опубликуйте информацию о сервере PlayCrows V2',promotionBody:'Скопируйте полный рекламный текст V2 ниже и разместите его на 5 разных активных рекламных сайтах или игровых сообществах. Отправьте прямую ссылку на каждую публикацию, а не на главную страницу сайта. Дубликаты, приватные, удалённые или недоступные публикации не учитываются.',copyLink:'Копировать весь текст',copied:'Скопировано!',siteProof:'Ссылка на рекламную публикацию',inviteBody:'Пригласите 5 уникальных пользователей по своей ссылке Discord. Фальшивые, дополнительные, повторные или подозрительные аккаунты не учитываются; приглашённые должны оставаться на сервере во время проверки.',inviteLink:'Ваша ссылка-приглашение Discord',screenshot:'Скриншот Invite Tracker',fileHint:'JPG, PNG или WEBP · максимум 5 МБ',liveBody:'Проведите трансляцию PlayCrows V2 не менее 4 часов. Трансляция или запись должна оставаться общедоступной во время проверки.',liveLink:'Ссылка на трансляцию / запись',confirm:'Я подтверждаю правильность данных, что заявка относится к V2 Beta и все условия выполнены.',submit:'Отправить заявку',submitting:'Отправка…',success:'Заявка отправлена!',pending:'Заявка ожидает проверки. Сохраните код:',another:'Отправить другое событие',invalid:'Заполните все обязательные поля.',duplicateLinks:'Все ссылки на подтверждения должны быть уникальными.',badFile:'Загрузите одно изображение JPG, PNG или WEBP размером не более 5 МБ.',unavailable:'Не удалось загрузить страницу. Попробуйте снова.'}
}

const LANGUAGES: Array<{code:Locale;short:string}> = [{code:'en',short:'EN'},{code:'ko',short:'KO'},{code:'th',short:'TH'},{code:'pt',short:'PT'},{code:'zh-TW',short:'TW'},{code:'ru',short:'RU'}]
const inputClass='mt-2 w-full rounded-xl border border-[#343840] bg-[#0d0f12] px-4 py-3 text-sm text-[#eee9df] outline-none transition focus:border-[#d3ad62]'

const RESULT_TEXT:Record<Locale,{title:string;desc:string;discord:string;event:string;status:string;review:string;pending:string;processed:string;rejected:string;empty:string;refresh:string}>={
  en:{title:'Claim Results',desc:'Discord ID, event, processing status, and rejection corrections are shown publicly.',discord:'Discord ID',event:'Event',status:'Status',review:'Review Note',pending:'Pending',processed:'Processed',rejected:'Rejected',empty:'No claims have been submitted yet.',refresh:'Refresh'},
  ko:{title:'신청 결과',desc:'Discord ID, 이벤트, 처리 상태 및 반려 수정 사항이 공개됩니다.',discord:'Discord ID',event:'이벤트',status:'상태',review:'검토 메모',pending:'대기 중',processed:'처리 완료',rejected:'반려됨',empty:'아직 제출된 신청이 없습니다.',refresh:'새로고침'},
  th:{title:'ผลการส่งคำขอ',desc:'แสดง Discord ID กิจกรรม สถานะ และคำแนะนำสำหรับคำขอที่ถูกปฏิเสธ',discord:'Discord ID',event:'กิจกรรม',status:'สถานะ',review:'หมายเหตุการตรวจสอบ',pending:'รอดำเนินการ',processed:'ดำเนินการแล้ว',rejected:'ปฏิเสธ',empty:'ยังไม่มีคำขอ',refresh:'รีเฟรช'},
  pt:{title:'Resultados das solicitações',desc:'Discord ID, evento, status e correções de solicitações rejeitadas são exibidos publicamente.',discord:'Discord ID',event:'Evento',status:'Status',review:'Nota da análise',pending:'Pendente',processed:'Processado',rejected:'Rejeitado',empty:'Nenhuma solicitação foi enviada.',refresh:'Atualizar'},
  'zh-TW':{title:'申請結果',desc:'公開顯示 Discord ID、活動、處理狀態及退回修改原因。',discord:'Discord ID',event:'活動',status:'狀態',review:'審核備註',pending:'待處理',processed:'已處理',rejected:'已退回',empty:'目前尚無申請。',refresh:'重新整理'},
  ru:{title:'Результаты заявок',desc:'Публично отображаются Discord ID, событие, статус и причина отклонения.',discord:'Discord ID',event:'Событие',status:'Статус',review:'Комментарий',pending:'В ожидании',processed:'Обработано',rejected:'Отклонено',empty:'Заявок пока нет.',refresh:'Обновить'},
}

const TAB_TEXT:Record<Locale,{claim:string;results:string}>={
  en:{claim:'Submit Claim',results:'Results'},ko:{claim:'보상 신청',results:'신청 결과'},th:{claim:'ส่งคำขอ',results:'ผลลัพธ์'},pt:{claim:'Enviar solicitação',results:'Resultados'},'zh-TW':{claim:'提交申請',results:'申請結果'},ru:{claim:'Подать заявку',results:'Результаты'},
}

function PublicResults({locale}:{locale:Locale}){
  const copy=RESULT_TEXT[locale];const page=TEXT[locale];const[rows,setRows]=useState<PublicResult[]>([]);const[loading,setLoading]=useState(true);const[error,setError]=useState('')
  const load=async()=>{setLoading(true);setError('');const{data,error}=await supabase.rpc('get_v2_beta_public_results');if(error)setError(error.message);else setRows((data??[]) as PublicResult[]);setLoading(false)}
  useEffect(()=>{void load()},[])
  const eventLabel=(type:EventType)=>type==='share_fb'?(SITE_SHARE_LOCALES.includes(locale)?page.promotion:page.fb):type==='invite_discord'?page.invite:page.live
  return <section className="mt-8 rounded-2xl border border-[#292d34] bg-[#111318] p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[.15em] text-[#d3ad62]">PlayCrows V2</div><h2 className="mt-2 text-xl font-black">{copy.title}</h2><p className="mt-2 text-xs leading-5 text-[#77746e]">{copy.desc}</p></div><button type="button" disabled={loading} onClick={()=>void load()} className="rounded-lg border border-[#d3ad62]/40 px-3 py-2 text-xs font-bold text-[#d3ad62] disabled:opacity-50">↻ {copy.refresh}</button></div>{error&&<div className="mt-4 rounded-lg border border-[#ef4444]/30 bg-[#ef4444]/8 px-3 py-2 text-xs text-[#ef4444]">{error}</div>}<div className="mt-5 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-xs"><thead className="text-[#77746e]"><tr><th className="pb-3">{copy.discord}</th><th className="pb-3">{copy.event}</th><th className="pb-3">{copy.review}</th><th className="pb-3 text-right">{copy.status}</th></tr></thead><tbody>{rows.map((row,index)=><tr key={`${row.discord_id}-${row.event_type}-${index}`} className="border-t border-[#292d34] align-top"><td className="py-3 font-mono font-bold text-[#eee9df]">{row.discord_id}</td><td className="py-3 text-[#aaa49a]">{eventLabel(row.event_type)}</td><td className="max-w-[260px] py-3 pr-3 text-[#aaa49a]">{row.public_status==='rejected'?(row.review_note||copy.rejected):'—'}</td><td className="py-3 text-right"><span className={`rounded-full border px-2.5 py-1 font-bold ${row.public_status==='processed'?'border-[#22c55e]/40 text-[#22c55e]':row.public_status==='rejected'?'border-[#ef4444]/40 text-[#ef4444]':'border-[#d3ad62]/40 text-[#d3ad62]'}`}>{row.public_status==='processed'?copy.processed:row.public_status==='rejected'?copy.rejected:copy.pending}</span></td></tr>)}{!loading&&!rows.length&&<tr><td colSpan={4} className="border-t border-[#292d34] py-8 text-center text-[#77746e]">{copy.empty}</td></tr>}</tbody></table></div></section>
}

export function V2BetaClaim(){
  const[locale,setLocale]=useState<Locale>('en');const t=TEXT[locale];const siteShare=SITE_SHARE_LOCALES.includes(locale);const promotionalText=siteShare?PROMOTIONAL_TEXT[locale as 'ko'|'zh-TW'|'ru']:''
  const[activeSection,setActiveSection]=useState<'claim'|'results'>('claim')
  const[enabled,setEnabled]=useState<boolean|null>(null);const[loadError,setLoadError]=useState(false);const[eventType,setEventType]=useState<EventType|null>(null)
  const[playerId,setPlayerId]=useState('');const[nickname,setNickname]=useState('');const[discordId,setDiscordId]=useState('');const[links,setLinks]=useState(['','','','',''])
  const[inviteLink,setInviteLink]=useState('');const[liveLink,setLiveLink]=useState('');const[screenshot,setScreenshot]=useState<File|null>(null);const[confirmed,setConfirmed]=useState(false)
  const[submitting,setSubmitting]=useState(false);const[error,setError]=useState('');const[reference,setReference]=useState('');const[copied,setCopied]=useState(false)
  useEffect(()=>{void(async()=>{const{data,error}=await supabase.rpc('get_v2_beta_claim_status');if(error){setLoadError(true);setEnabled(false);return}const row=Array.isArray(data)?data[0]:data;setEnabled(Boolean(row?.enabled))})()},[])
  const eventCards=useMemo(()=>[{id:'share_fb' as const,icon:siteShare?'↗':'f',label:siteShare?t.promotion:t.fb},{id:'invite_discord' as const,icon:'◈',label:t.invite},{id:'share_livestream' as const,icon:'●',label:t.live}],[siteShare,t])
  const reset=()=>{setReference('');setEventType(null);setError('');setConfirmed(false);setScreenshot(null);setLinks(['','','','','']);setInviteLink('');setLiveLink('')}
  const submit=async(e:FormEvent)=>{e.preventDefault();if(submitting||!eventType)return;setError('');const cleanLinks=links.map(v=>v.trim())
    if(!playerId.trim()||!nickname.trim()||!/[A-Za-z0-9]/.test(discordId)||!/^[A-Za-z0-9._-]{2,64}$/.test(discordId.trim())||!confirmed)return setError(t.invalid)
    if(eventType==='share_fb'&&(cleanLinks.some(v=>!/^https?:\/\//i.test(v))||new Set(cleanLinks.map(v=>v.toLowerCase().replace(/\/$/,''))).size!==5))return setError(cleanLinks.some(v=>!v)?t.invalid:t.duplicateLinks)
    if(eventType==='invite_discord'&&(!/^https?:\/\/(discord\.gg|discord\.com\/invite)\//i.test(inviteLink.trim())||!screenshot))return setError(t.invalid)
    if(eventType==='share_livestream'&&!/^https?:\/\//i.test(liveLink.trim()))return setError(t.invalid)
    if(screenshot&&(!['image/jpeg','image/png','image/webp'].includes(screenshot.type)||screenshot.size<=0||screenshot.size>5*1024*1024))return setError(t.badFile)
    setSubmitting(true);let screenshotPath:string|null=null
    try{if(eventType==='invite_discord'&&screenshot){const ext=screenshot.type==='image/png'?'png':screenshot.type==='image/webp'?'webp':'jpg';screenshotPath=`${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}.${ext}`;const{error}=await supabase.storage.from('v2-beta-proofs').upload(screenshotPath,screenshot,{contentType:screenshot.type,upsert:false});if(error)throw new Error(error.message)}
      const{data,error}=await supabase.rpc('submit_v2_beta_claim',{p_player_id:playerId.trim(),p_nickname:nickname.trim(),p_discord_id:discordId.trim(),p_event_type:eventType,p_locale:locale,p_proof_links:eventType==='share_fb'?cleanLinks:eventType==='invite_discord'?[inviteLink.trim()]:[liveLink.trim()],p_screenshot_path:screenshotPath});if(error)throw new Error(error.message);const row=Array.isArray(data)?data[0]:data;setReference(row?.reference_code??'')
    }catch(err){if(screenshotPath)await supabase.storage.from('v2-beta-proofs').remove([screenshotPath]);setError(err instanceof Error?err.message:t.unavailable)}finally{setSubmitting(false)}}
  if(enabled===null)return <div className="flex min-h-screen items-center justify-center bg-[#0a0b0d] text-[#d3ad62]">Loading…</div>
  if(!enabled)return <div className="flex min-h-screen items-center justify-center bg-[#0a0b0d] p-4 text-[#eee9df]"><div className="max-w-lg rounded-2xl border border-[#292d34] bg-[#111318] p-8 text-center"><img src={CrowLogo} className="mx-auto h-16 w-16 rounded-full"/><h1 className="mt-5 text-2xl font-bold">{loadError?t.unavailable:t.closed}</h1><a href="/" className="mt-6 inline-block text-sm font-bold text-[#d3ad62]">← PlayCrows</a></div></div>
  return <div className="min-h-screen bg-[#0a0b0d] text-[#eee9df]"><header className="sticky top-0 z-40 border-b border-[#171a20]"><div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-4"><a href="/" className="flex items-center gap-3 text-inherit no-underline"><img src={CrowLogo} className="h-10 w-10 rounded-full"/><div><div className="font-extrabold">PLAYCROWS</div><div className="text-[10px] uppercase tracking-[.18em] text-[#77746e]">V2 BETA EVENT</div></div></a><div className="flex flex-wrap rounded-lg border border-[#343840] bg-[#111318] p-1 text-[11px] font-bold">{LANGUAGES.map(lang=><button key={lang.code} type="button" onClick={()=>{setLocale(lang.code);setError('')}} className={`rounded-md px-2.5 py-2 ${locale===lang.code?'bg-[#d3ad62] text-black':'text-[#8f8b84]'}`}>{lang.short}</button>)}</div></div></header>
  <main className="mx-auto max-w-3xl px-4 py-10"><section className="overflow-hidden rounded-3xl border border-[#d3ad62]/30 bg-[#111318] p-6 sm:p-9"><div className="text-xs font-black uppercase tracking-[.2em] text-[#d3ad62]">PlayCrows V2</div><h1 className="mt-3 text-3xl font-black sm:text-4xl">{t.title}</h1><p className="mt-3 text-sm leading-6 text-[#9a958d]">{t.subtitle}</p><div className="mt-6 rounded-xl border border-[#ef4444]/30 bg-[#ef4444]/8 px-4 py-3 text-sm font-semibold leading-6 text-[#ff9b9b]">⚠ {t.warning}</div></section>
  <nav className="mt-6 grid grid-cols-2 rounded-xl border border-[#292d34] bg-[#111318] p-1" aria-label="Beta claim sections"><button type="button" onClick={()=>setActiveSection('claim')} className={`rounded-lg px-4 py-3 text-sm font-black transition ${activeSection==='claim'?'bg-[#d3ad62] text-[#17120a]':'text-[#aaa49a] hover:text-[#eee9df]'}`}>🎁 {TAB_TEXT[locale].claim}</button><button type="button" onClick={()=>setActiveSection('results')} className={`rounded-lg px-4 py-3 text-sm font-black transition ${activeSection==='results'?'bg-[#d3ad62] text-[#17120a]':'text-[#aaa49a] hover:text-[#eee9df]'}`}>📋 {TAB_TEXT[locale].results}</button></nav>
  {activeSection==='claim'?(reference?<section className="mt-6 rounded-2xl border border-[#22c55e]/35 bg-[#111318] p-8 text-center"><div className="text-4xl">✓</div><h2 className="mt-3 text-2xl font-bold text-[#5ee58a]">{t.success}</h2><p className="mt-3 text-sm text-[#9a958d]">{t.pending}</p><div className="mt-5 rounded-xl border border-[#d3ad62]/30 bg-black/25 p-4 font-mono text-xl font-bold text-[#d3ad62]">{reference}</div><button onClick={reset} className="mt-6 rounded-xl bg-[#d3ad62] px-5 py-3 text-sm font-bold text-black">{t.another}</button></section>:
  <form onSubmit={submit} className="mt-6 space-y-6"><section className="rounded-2xl border border-[#292d34] bg-[#111318] p-5 sm:p-6"><h2 className="text-lg font-bold">1. {t.choose}</h2><p className="mt-2 text-xs text-[#d3ad62]">{t.daily}</p><div className="mt-4 grid gap-3 sm:grid-cols-3">{eventCards.map(card=><button key={card.id} type="button" onClick={()=>{setEventType(card.id);setError('')}} className={`rounded-xl border p-4 text-left transition ${eventType===card.id?'border-[#d3ad62] bg-[#d3ad62]/10 text-[#f0d69c]':'border-[#343840] bg-[#0d0f12] text-[#aaa49a] hover:border-[#706248]'}`}><span className="block text-2xl font-black">{card.icon}</span><span className="mt-2 block text-sm font-bold">{card.label}</span></button>)}</div></section>
  {eventType&&<><section className="rounded-2xl border border-[#292d34] bg-[#111318] p-5 sm:p-6"><div className="text-[10px] font-black uppercase tracking-[.15em] text-[#77746e]">2. {t.mechanics}</div><h2 className="mt-2 text-lg font-bold">{eventType==='share_fb'?(siteShare?t.promotion:t.fb):eventType==='invite_discord'?t.invite:t.live}</h2>
  {eventType==='share_fb'&&<>{siteShare?<><h3 className="mt-4 font-bold text-[#d3ad62]">{t.promotionTitle}</h3><p className="mt-2 text-sm leading-6 text-[#9a958d]">{t.promotionBody}</p><div className="mt-4 max-h-80 overflow-auto whitespace-pre-wrap rounded-xl border border-[#343840] bg-[#0b0c0f] p-4 text-xs leading-5 text-[#aaa49a]">{promotionalText}</div><button type="button" onClick={async()=>{await navigator.clipboard.writeText(promotionalText);setCopied(true);setTimeout(()=>setCopied(false),2000)}} className="mt-3 rounded-lg border border-[#d3ad62]/50 bg-[#d3ad62]/10 px-4 py-2.5 text-xs font-bold text-[#d3ad62]">{copied?t.copied:t.copyLink}</button></>:<><h3 className="mt-4 font-bold text-[#d3ad62]">{t.fbTitle}</h3><p className="mt-2 text-sm leading-6 text-[#9a958d]">{t.fbBody}</p><a href="https://www.facebook.com/share/p/1EsoFCFXef/" target="_blank" rel="noreferrer" className="mt-4 inline-block rounded-lg border border-[#1877f2]/50 bg-[#1877f2]/10 px-4 py-2.5 text-xs font-bold text-[#69a8ff] no-underline">{t.official} ↗</a></>}
  <div className="mt-5 space-y-3">{links.map((link,i)=><label key={i} className="block text-xs font-bold text-[#aaa49a]">{siteShare?t.siteProof:t.fbProof} #{i+1} *<input type="url" value={link} onChange={e=>setLinks(c=>c.map((v,idx)=>idx===i?e.target.value:v))} placeholder="https://…" className={inputClass}/></label>)}</div></>}
  {eventType==='invite_discord'&&<><p className="mt-4 text-sm leading-6 text-[#9a958d]">{t.inviteBody}</p><label className="mt-5 block text-xs font-bold text-[#aaa49a]">{t.inviteLink} *<input type="url" value={inviteLink} onChange={e=>setInviteLink(e.target.value)} placeholder="https://discord.gg/…" className={inputClass}/></label><label className="mt-4 block text-xs font-bold text-[#aaa49a]">{t.screenshot} *<span className="mt-2 flex min-h-24 cursor-pointer items-center justify-center rounded-xl border border-dashed border-[#565b65] bg-[#0d0f12] p-4 text-center text-[#aaa49a]"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setScreenshot(e.target.files?.[0]??null)}/>{screenshot?screenshot.name:t.fileHint}</span></label></>}
  {eventType==='share_livestream'&&<><p className="mt-4 text-sm leading-6 text-[#9a958d]">{t.liveBody}</p><label className="mt-5 block text-xs font-bold text-[#aaa49a]">{t.liveLink} *<input type="url" value={liveLink} onChange={e=>setLiveLink(e.target.value)} placeholder="https://…" className={inputClass}/></label></>}</section>
  <section className="rounded-2xl border border-[#292d34] bg-[#111318] p-5 sm:p-6"><h2 className="text-lg font-bold">3. {t.player}</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold text-[#aaa49a]">{t.playerId} *<input value={playerId} onChange={e=>setPlayerId(e.target.value)} className={inputClass}/></label><label className="text-xs font-bold text-[#aaa49a]">{t.nickname} *<input value={nickname} onChange={e=>setNickname(e.target.value)} className={inputClass}/></label><label className="text-xs font-bold text-[#aaa49a] sm:col-span-2">{t.discord} *<input value={discordId} onChange={e=>setDiscordId(e.target.value)} autoComplete="off" placeholder="username or 123456789012345678" className={inputClass}/></label></div></section>
  <section className="rounded-2xl border border-[#292d34] bg-[#111318] p-5 sm:p-6"><label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-[#aaa49a]"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} className="mt-1 h-4 w-4 accent-[#d3ad62]"/><span>{t.confirm}</span></label>{error&&<div className="mt-4 rounded-lg border border-[#ef4444]/30 bg-[#ef4444]/8 px-4 py-3 text-sm text-[#ff8585]">{error}</div>}<button disabled={submitting} className="mt-5 w-full rounded-xl bg-[#d3ad62] px-5 py-3.5 text-sm font-black text-[#17120a] transition hover:bg-[#e4c77f] disabled:opacity-60">{submitting?t.submitting:t.submit}</button></section></>}</form>):<PublicResults key={`${locale}-${reference}`} locale={locale}/>}</main></div>
}
