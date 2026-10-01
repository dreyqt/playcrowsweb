const en = {
  octoberPackages: 'October Packages',
  octoberPackage: 'October Package',
  octoberPackagesDesc: 'October supply bundles with resources and enhancement materials.',
  newBadge: 'NEW',
  eventBonus: 'EVENT BONUS',
  oneTimeEventBonusTitle: 'Limited Event · One-Time Reward',
  oneTimeEventBonusRule: 'Granted once per eligible player/account. Buying multiple quantities does not grant additional copies of this event bonus.',
}

type OctoberTranslation = Record<keyof typeof en, string>

export const octoberTranslations: Record<'en' | 'ko' | 'th' | 'pt' | 'zh-TW' | 'ru', OctoberTranslation> = {
  en,
  ko: {
    octoberPackages: '10월 패키지',
    octoberPackage: '10월 패키지',
    octoberPackagesDesc: '재화와 강화 재료가 포함된 10월 보급 패키지입니다.',
    newBadge: '신규',
    eventBonus: '이벤트 보너스',
    oneTimeEventBonusTitle: '한정 이벤트 · 1회 보상',
    oneTimeEventBonusRule: '자격을 갖춘 플레이어/계정당 1회 지급됩니다. 여러 개를 구매해도 이 이벤트 보너스가 추가 지급되지 않습니다.',
  },
  th: {
    octoberPackages: 'แพ็กเกจเดือนตุลาคม',
    octoberPackage: 'แพ็กเกจเดือนตุลาคม',
    octoberPackagesDesc: 'แพ็กเกจเสบียงเดือนตุลาคมพร้อมทรัพยากรและวัสดุเสริมพลัง',
    newBadge: 'ใหม่',
    eventBonus: 'โบนัสกิจกรรม',
    oneTimeEventBonusTitle: 'กิจกรรมจำกัดเวลา · รางวัลครั้งเดียว',
    oneTimeEventBonusRule: 'มอบให้ผู้เล่น/บัญชีที่มีสิทธิ์เพียงครั้งเดียว การซื้อหลายชุดจะไม่ได้รับโบนัสกิจกรรมนี้เพิ่ม',
  },
  pt: {
    octoberPackages: 'Pacotes de Outubro',
    octoberPackage: 'Pacote de Outubro',
    octoberPackagesDesc: 'Pacotes de suprimentos de outubro com recursos e materiais de melhoria.',
    newBadge: 'NOVO',
    eventBonus: 'BÔNUS DO EVENTO',
    oneTimeEventBonusTitle: 'Evento Limitado · Recompensa Única',
    oneTimeEventBonusRule: 'Concedido uma vez por jogador/conta elegível. Comprar várias unidades não concede cópias adicionais deste bônus do evento.',
  },
  'zh-TW': {
    octoberPackages: '十月方案',
    octoberPackage: '十月方案',
    octoberPackagesDesc: '包含資源與強化材料的十月補給組合。',
    newBadge: '新品',
    eventBonus: '活動獎勵',
    oneTimeEventBonusTitle: '限定活動 · 一次性獎勵',
    oneTimeEventBonusRule: '每位符合資格的玩家／帳號僅可獲得一次。購買多份方案不會額外獲得此活動獎勵。',
  },
  ru: {
    octoberPackages: 'Октябрьские пакеты',
    octoberPackage: 'Октябрьский пакет',
    octoberPackagesDesc: 'Октябрьские наборы снабжения с ресурсами и материалами усиления.',
    newBadge: 'НОВИНКА',
    eventBonus: 'БОНУС СОБЫТИЯ',
    oneTimeEventBonusTitle: 'Ограниченное событие · Разовая награда',
    oneTimeEventBonusRule: 'Выдаётся один раз каждому подходящему игроку/аккаунту. Покупка нескольких пакетов не даёт дополнительных копий этой награды.',
  },
}
