export interface GiftReward {
  name: string
  quantity?: number
}

export type GiftPackageCategory = 'currency' | 'support' | 'august-supply'

export interface GiftPackage {
  id: string
  category: GiftPackageCategory
  title: string
  amount: number
  /** Shows a prominent NEW badge on the package card. */
  isNew?: boolean
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
    { name: 'Gold Chest (Bound)', quantity: 500 },
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
    { name: 'Gold Chest (Bound)', quantity: 1_000 },
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
    { name: 'Gold Chest (Bound)', quantity: 3_000 },
    { name: 'Sunset Splendid Weapon Style Summon x11 (Bound)', quantity: 200 },
    { name: 'Sunset Splendid Mount Summon x11 (Bound)', quantity: 200 },
    { name: 'Morion (Bound)', quantity: 500 },
    { name: 'Time Recharger - Masarta Special Dungeon (Bound)', quantity: 10 },
  ],
},
{
  id: 'currency-500',
  category: 'currency',
  title: 'Diamond Package',
  amount: 500,
  rewards: [
    { name: 'Diamond', quantity: 3_000_000 },
    { name: 'Gold Chest (Bound)', quantity: 5_000 },
    { name: 'Sunset Splendid Weapon Style Summon x11 (Bound)', quantity: 500 },
    { name: 'Sunset Splendid Mount Summon x11 (Bound)', quantity: 500 },
    { name: 'Morion (Bound)', quantity: 2_000 },
    { name: 'Time Recharger - Masarta Special Dungeon (Bound)', quantity: 30 },
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
    { name: 'Gold Chest (Bound)', quantity: 10_000 },
    { name: 'Sunset Splendid Weapon Style Summon x11 (Bound)', quantity: 1_000 },
    { name: 'Sunset Splendid Mount Summon x11 (Bound)', quantity: 1_000 },
    { name: 'Morion (Bound)', quantity: 5_000 },
    { name: 'Time Recharger - Masarta Special Dungeon (Bound)', quantity: 100 },
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
  {
    id: 'support-alchemy-pack', isNew: true, category: 'support', title: 'ALCHEMY PACK', amount: 20,
    rewards: [
      { name: 'Mileage', quantity: 20_000 },
      { name: 'Contribution Coin', quantity: 20_000 },
      { name: 'Elemental Extraction of   Fusion 11 times (attribution)', quantity: 20 },
      { name: 'Chaos Fragment (Bound)', quantity: 500 },
      { name: 'Primal Essence (Bound)', quantity: 1_000 },
      { name: 'Gold Chest (Bound)', quantity: 500 },
      { name: 'NightCrows Stimulant of Growth (Bound)', quantity: 100 },
      { name: 'Time Recharger - Land of Prosperty (Bound)', quantity: 5 },
      { name: 'Time Recharger - Forest of Training (Bound)', quantity: 5 },
      { name: 'Time Recharger - Irletta Temple (Bound)', quantity: 5 },
      { name: 'Time Recharger - Sancona Ruins (Bound)', quantity: 5 },
    ],
  },
  {
    id: 'support-nc-gears-starter', isNew: true, category: 'support', title: 'NC GEARS STARTER', amount: 100,
    rewards: [
      { name: 'Mileage', quantity: 80_000 },
      { name: 'Contibution Coin', quantity: 50_000 },
      { name: '+10 Night Crows Claw Talisman (Bound)', quantity: 1 },
      { name: '+10 Night Crows Feather Brooch (Bound)', quantity: 1 },
      { name: '+10 Night Crows Beak Circlet (Bound)', quantity: 1 },
      { name: '+10 nighthawk Taileather Whistle (attributed)', quantity: 1 },
      { name: '+10 nighthawk Mask (Attributed)', quantity: 1 },
      { name: '+10 Night Crows Flight Feather Jewel (Bound)', quantity: 1 },
      { name: 'Brilliant Accessory Refinement Stone (Bound)', quantity: 1_000 },
      { name: 'Moonlight Protection Talisman (Bound)', quantity: 100 },
      { name: 'Sun Battle Talisman (Bound)', quantity: 100 },
      { name: 'Gold Chest (Bound)', quantity: 2_000 },
      { name: 'Time Recharger - Land of Prosperty (Bound)', quantity: 20 },
      { name: 'Time Recharger - Forest of Training (Bound)', quantity: 20 },
      { name: 'Time Recharger - Irletta Temple (Bound)', quantity: 20 },
      { name: 'Time Recharger - Sancona Ruins (Bound)', quantity: 20 },
    ],
  },
  {
    id: 'support-4th-job-advance', isNew: true, category: 'support', title: '4TH JOB ADVANCE PACK', amount: 200,
    rewards: [
      { name: 'Mileage', quantity: 100_000 },
      { name: 'Contribution Coin', quantity: 100_000 },
      { name: 'superlative predicate (attribution)', quantity: 1 },
      { name: 'Torn Invoices (Attribution)', quantity: 1_000 },
      { name: 'Torn Seniority Letter (Attribution)', quantity: 1_000 },
      { name: "Star's Memory (Bound)", quantity: 1_350 },
      { name: 'Gold Chest (Bound)', quantity: 10_000 },
      { name: 'Time Recharger - Land of Prosperty (Bound)', quantity: 50 },
      { name: 'Time Recharger - Forest of Training (Bound)', quantity: 50 },
      { name: 'Time Recharger - Irletta Temple (Bound)', quantity: 50 },
      { name: 'Time Recharger - Sancona Ruins (Bound)', quantity: 50 },
    ],
  },
  {
    id: 'august-supply-50', category: 'august-supply', title: 'AUGUST SUPPLY PACKAGE', amount: 50,
    rewards: [
      { name: 'Diamonds', quantity: 150_000 },
      { name: 'Mileage', quantity: 25_000 },
      { name: 'Crusade Loot Chest (Attributed)', quantity: 1 },
      { name: 'Total War Supply Crates (Attributed)', quantity: 10 },
      { name: 'Shining Armor Enhancement Scroll Chest (Bound)', quantity: 50 },
      { name: 'Shining Weapon Enhancement Scroll Chest (Bound)', quantity: 50 },
      { name: 'Shining Accessory Enhancement Scroll Chest (Bound)', quantity: 50 },
    ],
  },
  {
    id: 'august-supply-100', category: 'august-supply', title: 'AUGUST SUPPLY PACKAGE', amount: 100,
    rewards: [
      { name: 'Diamonds', quantity: 330_000 },
      { name: 'Mileage', quantity: 50_000 },
      { name: 'Crusade Loot Chest (Attributed)', quantity: 2 },
      { name: "Guardian's Scepter (Attribution)", quantity: 1_500 },
      { name: 'Total War Supply Crates (Attributed)', quantity: 50 },
      { name: 'Shining Armor Enhancement Scroll Chest (Bound)', quantity: 150 },
      { name: 'Shining Weapon Enhancement Scroll Chest (Bound)', quantity: 150 },
      { name: 'Shining Accessory Enhancement Scroll Chest (Bound)', quantity: 150 },
      { name: 'Wind Orb Chest (Attributed)', quantity: 5 },
    ],
  },
  {
    id: 'august-supply-500', category: 'august-supply', title: 'AUGUST SUPPLY PACKAGE', amount: 500,
    rewards: [
      { name: 'Diamonds', quantity: 2_500_000 },
      { name: 'Mileage', quantity: 250_000 },
      { name: 'Crusade Loot Chest (Attributed)', quantity: 12 },
      { name: "Guardian's Scepter (Attribution)", quantity: 10_000 },
      { name: 'Total War Supply Crates (Attributed)', quantity: 150 },
      { name: 'Shining Armor Enhancement Scroll Chest (Bound)', quantity: 1_000 },
      { name: 'Shining Weapon Enhancement Scroll Chest (Bound)', quantity: 1_000 },
      { name: 'Shining Accessory Enhancement Scroll Chest (Bound)', quantity: 1_000 },
      { name: 'Higher Arcane Scroll of Enlightenment (Bound)', quantity: 25 },
      { name: 'Wind Orb Chest (Attributed)', quantity: 50 },
      { name: 'Draught of Vigilance (Bound)', quantity: 100 },
      { name: 'Superior Draught of Fury (Bound)', quantity: 20 },
      { name: 'Superior Draught of Overcoming (Bound)', quantity: 20 },
      { name: 'Superior Draught of Antagonism (Bound)', quantity: 20 },
    ],
  },
  {
    id: 'august-supply-1000', category: 'august-supply', title: 'AUGUST SUPPLY PACKAGE', amount: 1000,
    rewards: [
      { name: 'Diamonds', quantity: 6_000_000 },
      { name: 'Mileage', quantity: 500_000 },
      { name: 'Crusade Loot Chest (Attributed)', quantity: 30 },
      { name: "Guardian's Scepter (Attribution)", quantity: 25_000 },
      { name: 'Total War Supply Crates (Attributed)', quantity: 300 },
      { name: 'Shining Armor Enhancement Scroll Chest (Bound)', quantity: 2_500 },
      { name: 'Shining Weapon Enhancement Scroll Chest (Bound)', quantity: 2_500 },
      { name: 'Shining Accessory Enhancement Scroll Chest (Bound)', quantity: 2_500 },
      { name: 'Higher Arcane Scroll of Enlightenment (Bound)', quantity: 75 },
      { name: 'Wind Orb Chest (Attributed)', quantity: 150 },
      { name: "Forgotten One's Remnant Selection Chest (Bound)", quantity: 20 },
      { name: 'Draught of Vigilance (Bound)', quantity: 200 },
      { name: 'Superior Draught of Fury (Bound)', quantity: 50 },
      { name: 'Superior Draught of Overcoming (Bound)', quantity: 50 },
      { name: 'Superior Draught of Antagonism (Bound)', quantity: 50 },
    ],
  },

]

export function findGiftPackage(id: string | null) {
  return giftPackages.find(item => item.id === id) ?? null
}
