export const PADDLE_PRICE_IDS: Record<string, string> = {
  'currency-5': 'pri_01m0treavfrj468fhbz05n2fr0',
  'currency-10': 'pri_01m0tsfrsc0va1pwe7c5mkyz8h',
  'currency-50': 'pri_01m0tsfsddqxc06mdm70j2d5db',
  'currency-100': 'pri_01m0tsft0ey5r3pbs15qqrvmkj',
  'currency-200': 'pri_01m0tsftjnzfesrf2jgwsaj4jj',
  'currency-500': 'pri_01m0tsfvw2dsgsrnjnced24ye9',
  'currency-1000': 'pri_01m0tsfwgc7cj77apwbscftsm4',
  'support-skill-bundle': 'pri_01m0tsfx31x58vt0mt2tmrr55x',
  'support-guild-bundle': 'pri_01m0tsfxpc08c1mm5h95rb2696',
  'support-job-advance': 'pri_01m0tsfy9d9zvea92k77e49brt',
  'support-awakening': 'pri_01m0tsfyws9we5te20c17seej3',
  'support-alchemy-pack': 'pri_01m0tsfzg1ca7fcbwedck0e049',
  'support-nc-gears-starter': 'pri_01m0tsg02tb22zemw8w456kvx0',
  'support-4th-job-advance': 'pri_01m0tsg0nr8cdwb6sf87h4jxcc',
  'august-supply-50': 'pri_01m0tsg18hwd53vx089dbrg6w6',
  'august-supply-100': 'pri_01m0tsg1v3w4tav3mw51wpzw0h',
  'august-supply-500': 'pri_01m0tsg2d7jk0dmejnyz9pn8m5',
  'august-supply-1000': 'pri_01m0tsg30797v7mg9xdg0x9xt8',
}

export function getPaddlePriceId(packageId: string | null) {
  if (!packageId) return null
  return PADDLE_PRICE_IDS[packageId] ?? null
}
