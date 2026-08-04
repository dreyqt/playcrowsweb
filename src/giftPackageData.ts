export interface GiftReward {
  name: string
  quantity?: number
}

export type GiftPackageCategory = 'currency' | 'support'

export interface GiftPackage {
  id: string
  category: GiftPackageCategory
  title: string
  amount: number
  rewards: GiftReward[]
}

export const giftPackages: GiftPackage[] = [
{
  id: 'currency-5',
  category: 'currency',
  title: 'Diamond Package',
  amount: 5,
  rewards: [
    { name: 'Diamond', quantity: 20_000 },
  ],
},
{
  id: 'currency-10',
  category: 'currency',
  title: 'Diamond Package',
  amount: 10,
  rewards: [
    { name: 'Diamond', quantity: 10_000 },
    { name: 'Black Wing Special Supply', quantity: 1 },
  ],
},
{
  id: 'currency-50',
  category: 'currency',
  title: 'Diamond Package',
  amount: 50,
  rewards: [
    { name: 'Diamond', quantity: 210_000 },
    { name: 'Gold Chest', quantity: 500 },
    { name: 'Sunset Splendid Weapon Style Summon x11 (Bound)', quantity: 50 },
    { name: 'Sunset Splendid Mount Summon x11 (Bound)', quantity: 50 },
  ],
},
{
  id: 'currency-100',
  category: 'currency',
  title: 'Diamond Package',
  amount: 100,
  rewards: [
    { name: 'Diamond', quantity: 450_000 },
    { name: 'Gold Chest', quantity: 1_000 },
    { name: 'Sunset Splendid Weapon Style Summon x11 (Bound)', quantity: 100 },
    { name: 'Sunset Splendid Mount Summon x11 (Bound)', quantity: 100 },
  ],
},
{
  id: 'currency-200',
  category: 'currency',
  title: 'Diamond Package',
  amount: 200,
  rewards: [
    { name: 'Diamond', quantity: 1_000_000 },
    { name: 'Gold Chest', quantity: 3_000 },
    { name: 'Sunset Splendid Weapon Style Summon x11 (Bound)', quantity: 200 },
    { name: 'Sunset Splendid Mount Summon x11 (Bound)', quantity: 200 },
    { name: 'Morion', quantity: 500 },
    { name: 'Time Recharger - Masarta Special Dungeon', quantity: 10 },
  ],
},
{
  id: 'currency-500',
  category: 'currency',
  title: 'Diamond Package',
  amount: 500,
  rewards: [
    { name: 'Diamond', quantity: 3_000_000 },
    { name: 'Gold Chest', quantity: 5_000 },
    { name: 'Sunset Splendid Weapon Style Summon x11 (Bound)', quantity: 500 },
    { name: 'Sunset Splendid Mount Summon x11 (Bound)', quantity: 500 },
    { name: 'Morion', quantity: 2_000 },
    { name: 'Time Recharger - Masarta Special Dungeon', quantity: 30 },
    { name: 'Element Extraction of Harmony (Bound)', quantity: 1_000 },
  ],
},
{
  id: 'currency-1000',
  category: 'currency',
  title: 'Diamond Package',
  amount: 1000,
  rewards: [
    { name: 'Diamond', quantity: 8_000_000 },
    { name: 'Gold Chest', quantity: 10_000 },
    { name: 'Sunset Splendid Weapon Style Summon x11 (Bound)', quantity: 1_000 },
    { name: 'Sunset Splendid Mount Summon x11 (Bound)', quantity: 1_000 },
    { name: 'Morion', quantity: 5_000 },
    { name: 'Time Recharger - Masarta Special Dungeon', quantity: 100 },
    { name: 'Element Extraction of Harmony (Bound)', quantity: 2_000 },
  ],
},
  {
    id: 'support-skill-bundle', category: 'support', title: 'SKILL BUNDLE', amount: 15,
    rewards: [
      { name: 'Source of Wisdom (Bound)', quantity: 10 },
      { name: 'Source of Growth (Bound)', quantity: 400 },
      { name: 'Gold Chest (Bound)', quantity: 200 },
    ],
  },
  {
    id: 'support-guild-bundle', category: 'support', title: 'GUILD BUNDLE', amount: 20,
    rewards: [
      { name: 'Treasure Guild Coin Chest (Bound)', quantity: 50 },
      { name: 'Sturdy Bundle of Yarn Box (Attributed)', quantity: 20 },
      { name: 'Moonlight Protection Talisman (Bound)', quantity: 10 },
      { name: 'Sun Battle Talisman (Bound)', quantity: 10 },
    ],
  },
  {
    id: 'support-job-advance', category: 'support', title: 'JOB ADVANCE PACKAGE', amount: 25,
    rewards: [
      { name: 'High Seal of Advancement (Bound)', quantity: 75 },
      { name: 'Seal of Advancement (Bound)', quantity: 1_200 },
      { name: 'Gold Chest (Bound)', quantity: 200 },
      { name: 'Torn Invoices (Attribution)', quantity: 100 },
      { name: 'Torn Seniority Letter (Attribution)', quantity: 100 },
      { name: "Star's Memory (Bound)", quantity: 450 },
    ],
  },
  {
    id: 'support-awakening', category: 'support', title: 'AWAKENING PACKAGE', amount: 25,
    rewards: [
      { name: 'Aura of Intense Expression (Attribution)', quantity: 1 },
      { name: 'Aura of Serene Manifestation (Attribution)', quantity: 2 },
      { name: 'Cyclical Manifestation Energy (Attribution)', quantity: 2 },
    ],
  },
]

export function findGiftPackage(id: string | null) {
  return giftPackages.find(item => item.id === id) ?? null
}
