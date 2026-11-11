export type MountPreorderStat = {
  label: string
  value: string
}

export type MountPreorderStep = {
  id: string
  name: string
  image: string
  stepPrice: number
  requiredTotal: number
  accent: string
  glow: string
  stats: readonly MountPreorderStat[]
}

/** Display data only. These bonuses are earned with gift packages, never sold as products. */
export const MOUNT_PREORDER_STEPS: readonly MountPreorderStep[] = [
  {
    id: 'rodrigos-flame-horse',
    name: "Rodrigo's Flame Horse",
    image: '/images/mount-preorder/rodrigos-flame-horse.png',
    stepPrice: 500,
    requiredTotal: 500,
    accent: '#ffae78',
    glow: 'rgba(226, 108, 47, 0.16)',
    stats: [
      { label: 'ATK SPD', value: '250%' },
      { label: 'Skill SPD', value: '165%' },
      { label: 'DEF', value: '80' },
      { label: 'DMG RED', value: '90' },
      { label: 'Skill DMG Tolerance', value: '15%' },
      { label: 'MAX HP', value: '30,000' },
      { label: 'INC DMG RED Rate', value: '15%' },
      { label: 'Basic DMG', value: '50' },
      { label: 'ACC', value: '20' },
      { label: '+Status Effect RES', value: '25%' },
    ],
  },
  {
    id: 'supreme-conquerors-qilin',
    name: "Supreme Conqueror's Qilin",
    image: '/images/mount-preorder/supreme-conquerors-qilin.png',
    stepPrice: 1000,
    requiredTotal: 1500,
    accent: '#8de3d6',
    glow: 'rgba(73, 183, 167, 0.14)',
    stats: [
      { label: 'ATK SPD', value: '250%' },
      { label: 'Skill SPD', value: '165%' },
      { label: 'DEF', value: '90' },
      { label: 'DMG RED', value: '100' },
      { label: 'Skill DMG Tolerance', value: '15%' },
      { label: 'MAX HP', value: '35,000' },
      { label: 'INC DMG RED Rate', value: '15%' },
      { label: 'Status Effect RES', value: '30%' },
      { label: 'Status Effect Duration RED Rate', value: '30%' },
      { label: '+ACC', value: '30' },
      { label: '+Status Effect ACC', value: '35%' },
    ],
  },
  {
    id: 'golden-jackal-ramses-ii',
    name: 'Golden Jackal of Ramses II',
    image: '/images/mount-preorder/golden-jackal-ramses-ii.png',
    stepPrice: 2000,
    requiredTotal: 3500,
    accent: '#e9c780',
    glow: 'rgba(155, 108, 222, 0.19)',
    stats: [
      { label: 'ATK SPD', value: '250%' },
      { label: 'Skill SPD', value: '165%' },
      { label: 'DEF', value: '100' },
      { label: 'DMG RED', value: '120' },
      { label: 'Skill DMG Tolerance', value: '15%' },
      { label: 'MAX HP', value: '40,000' },
      { label: 'INC DMG RED Rate', value: '15%' },
      { label: 'Basic DMG', value: '60' },
      { label: 'DMG Boost Rate', value: '10%' },
      { label: 'Status Effect RES', value: '30%' },
      { label: '+ACC', value: '30' },
      { label: '+Status Effect ACC', value: '35%' },
      { label: '+Debuff Rate', value: '15%' },
      { label: '+Debuff Res', value: '12%' },
    ],
  },
]

export const MOUNT_PREORDER_TOTAL = MOUNT_PREORDER_STEPS[MOUNT_PREORDER_STEPS.length - 1].requiredTotal
