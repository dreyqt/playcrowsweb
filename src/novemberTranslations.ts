const en = {
  novemberPackages: 'November Packages',
  novemberPackage: 'November Package',
  novemberPackagesDesc: 'Five November packages with resources, summon tickets and enhancement materials.',
}

type NovemberTranslation = Record<keyof typeof en, string>

export const novemberTranslations: Record<'en' | 'ko' | 'th' | 'pt' | 'zh-TW' | 'ru', NovemberTranslation> = {
  en,
  ko: {
    novemberPackages: '11월 패키지',
    novemberPackage: '11월 패키지',
    novemberPackagesDesc: '재화, 소환 도전권 및 강화 재료가 포함된 다섯 가지 11월 패키지입니다.',
  },
  th: {
    novemberPackages: 'แพ็กเกจเดือนพฤศจิกายน',
    novemberPackage: 'แพ็กเกจเดือนพฤศจิกายน',
    novemberPackagesDesc: 'แพ็กเกจเดือนพฤศจิกายน 5 แบบ พร้อมทรัพยากร ตั๋วอัญเชิญ และวัสดุเสริมพลัง',
  },
  pt: {
    novemberPackages: 'Pacotes de Novembro',
    novemberPackage: 'Pacote de Novembro',
    novemberPackagesDesc: 'Cinco pacotes de novembro com recursos, bilhetes de invocação e materiais de melhoria.',
  },
  'zh-TW': {
    novemberPackages: '十一月方案',
    novemberPackage: '十一月方案',
    novemberPackagesDesc: '五款十一月方案，內含資源、召喚券與強化材料。',
  },
  ru: {
    novemberPackages: 'Ноябрьские пакеты',
    novemberPackage: 'Ноябрьский пакет',
    novemberPackagesDesc: 'Пять ноябрьских пакетов с ресурсами, билетами призыва и материалами усиления.',
  },
}
