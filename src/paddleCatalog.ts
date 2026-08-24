export const PADDLE_PRICE_IDS: Record<string, string> = {
  'currency-5': 'pri_01m0tyf0an4wzsysvj93cdpn6f',
  'currency-10': 'pri_01m0tyf0y3v5the8hamkqjzbcm',
  'currency-50': 'pri_01m0tyf1hqzsjfqmfhwhnv2skv',
  'currency-100': 'pri_01m0tyf2xasmpebmkgamabc9gt',
  'currency-200': 'pri_01m0tyf3hccknnc6vcv3y9xy4z',
  'currency-500': 'pri_01m0tyf45dkrmgakznkj84qnwh',
  'currency-1000': 'pri_01m0tyf4re07pznry47eqvfwjc',
  'support-skill-bundle': 'pri_01m0tyf5bvnjpmjx0g79qkebaf',
  'support-guild-bundle': 'pri_01m0tyf5ykdqz7x3fbawrp46nt',
  'support-job-advance': 'pri_01m0tyf6k1t5ws9azawwtght69',
  'support-awakening': 'pri_01m0tyf776pbzjff42kkfrgj01',
  'support-alchemy-pack': 'pri_01m0tyf7tbgrx1jscb9n8t98xw',
  'support-nc-gears-starter': 'pri_01m0tyf8dy080x7ckghd5re3h6',
  'support-4th-job-advance': 'pri_01m0tyf9201fg5myfpc1kz20vy',
  'august-supply-50': 'pri_01m0tyf9qc5zc8aafmfwqpgy4q',
  'august-supply-100': 'pri_01m0tyfaakbkjrnp6b8a7r7f0h',
  'august-supply-500': 'pri_01m0tyfaz1szkmn54p7910ncdr',
  'august-supply-1000': 'pri_01m0tyfbkffjknx97jz64hkmz6',
}

export function getPaddlePriceId(packageId: string | null) {
  if (!packageId) return null
  return PADDLE_PRICE_IDS[packageId] ?? null
}
