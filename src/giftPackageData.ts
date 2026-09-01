import type { PlayCrowsServer } from './server'

export interface GiftReward {
  name: string
  quantity?: number
}

export type GiftPackageCategory = 'currency' | 'support' | 'august-supply' | 'september-supply'

export interface GiftPackage {
  id: string
  category: GiftPackageCategory
  title: string
  amount: number
  /** Shows a prominent NEW badge on the package card. */
  isNew?: boolean
  /** Optional event reward granted once per eligible player/account, not once per package quantity. */
  oneTimeEventBonus?: string
  rewards: GiftReward[]
}

export const v1GiftPackages: GiftPackage[] = [
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

  {
    id: 'september-supply-50', category: 'september-supply', title: 'SEPTEMBER SUPPLY PACKAGE', amount: 50,
    rewards: [
      { name: 'Diamonds', quantity: 150_000 },
      { name: 'Mileage', quantity: 25_000 },
      { name: 'Crusade Loot Chest (Attributed)', quantity: 2 },
      { name: 'Total War Supply Crates (Attributed)', quantity: 50 },
      { name: '[C] Crafting Material*40 Selection Chest (Bound)', quantity: 100 },
      { name: '[R] Arcane Scroll Selection Chest (Bound)', quantity: 100 },
      { name: "Mercenaries' Lost Gear Chest (Bound)", quantity: 100 },
    ],
  },
  {
    id: 'september-supply-100', category: 'september-supply', title: 'SEPTEMBER SUPPLY PACKAGE', amount: 100,
    rewards: [
      { name: 'Diamonds', quantity: 330_000 },
      { name: 'Mileage', quantity: 50_000 },
      { name: 'Crusade Loot Chest (Attributed)', quantity: 5 },
      { name: "Guardian's Scepter (Attribution)", quantity: 1_500 },
      { name: 'Total War Supply Crates (Attributed)', quantity: 150 },
      { name: '[UC] Crafting Material Selection Chest (Bound)', quantity: 300 },
      { name: '[C] Crafting Material*40 Selection Chest (Bound)', quantity: 300 },
      { name: '[R] Arcane Scroll Selection Chest (Bound)', quantity: 300 },
      { name: "Knight's Lost Gear Chest (Bound)", quantity: 100 },
    ],
  },
  {
    id: 'september-supply-500', category: 'september-supply', title: 'SEPTEMBER SUPPLY PACKAGE', amount: 500,
    oneTimeEventBonus: 'Rare Monster Weapon Style SET',
    rewards: [
      { name: 'Diamonds', quantity: 2_500_000 },
      { name: 'Mileage', quantity: 250_000 },
      { name: 'Crusade Loot Chest (Attributed)', quantity: 30 },
      { name: "Guardian's Scepter (Attribution)", quantity: 10_000 },
      { name: 'Total War Supply Crates (Attributed)', quantity: 1_000 },
      { name: 'Shining Armor Enhancement Scroll Chest (Bound)', quantity: 1_000 },
      { name: 'Shining Weapon Enhancement Scroll Chest (Bound)', quantity: 1_000 },
      { name: 'Shining Accessory Enhancement Scroll Chest (Bound)', quantity: 1_000 },
      { name: 'Higher Arcane Scroll of Enlightenment (Bound)', quantity: 25 },
      { name: 'Wind Orb Chest (Attributed)', quantity: 50 },
      { name: 'Brilliant Weapon Refinement Stone (Bound)', quantity: 300 },
      { name: 'Brilliant Armor Refinement Stone (Bound)', quantity: 500 },
      { name: 'Brilliant Accessory Refinement Stone (Bound)', quantity: 1_500 },
    ],
  },
  {
    id: 'september-supply-1000', category: 'september-supply', title: 'SEPTEMBER SUPPLY PACKAGE', amount: 1000,
    oneTimeEventBonus: 'Epic Monster Weapon Style',
    rewards: [
      { name: 'Diamonds', quantity: 6_000_000 },
      { name: 'Mileage', quantity: 500_000 },
      { name: 'Crusade Loot Chest (Attributed)', quantity: 80 },
      { name: "Guardian's Scepter (Attribution)", quantity: 25_000 },
      { name: 'Total War Supply Crates (Attributed)', quantity: 2_500 },
      { name: 'Shining Armor Enhancement Scroll Chest (Bound)', quantity: 2_500 },
      { name: 'Shining Weapon Enhancement Scroll Chest (Bound)', quantity: 2_500 },
      { name: 'Shining Accessory Enhancement Scroll Chest (Bound)', quantity: 2_500 },
      { name: 'Higher Arcane Scroll of Enlightenment (Bound)', quantity: 75 },
      { name: 'Wind Orb Chest (Attributed)', quantity: 150 },
      { name: "Forgotten One's Remnant Selection Chest (Bound)", quantity: 20 },
      { name: 'Brilliant Weapon Refinement Stone (Bound)', quantity: 750 },
      { name: 'Brilliant Armor Refinement Stone (Bound)', quantity: 1_300 },
      { name: 'Brilliant Accessory Refinement Stone (Bound)', quantity: 4_000 },
    ],
  },

]

// V2 currently starts with its own copy of the V1 catalog so the two servers can
// diverge safely as new V2-only packages/rewards are introduced.
export const v2GiftPackages: GiftPackage[] = v1GiftPackages.map(item => ({
  ...item,
  rewards: item.rewards.map(reward => ({ ...reward })),
}))

export const giftPackagesByServer: Record<PlayCrowsServer, GiftPackage[]> = {
  v1: v1GiftPackages,
  v2: v2GiftPackages,
}

export function getGiftPackages(server: PlayCrowsServer) {
  return giftPackagesByServer[server]
}

export function findGiftPackage(server: PlayCrowsServer, id: string | null) {
  return getGiftPackages(server).find(item => item.id === id) ?? null
}

