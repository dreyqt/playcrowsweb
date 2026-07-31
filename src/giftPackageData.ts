export interface GiftReward {
  name: string
  quantity?: number
}

export interface GiftPackage {
  amount: number
  rewards: GiftReward[]
}

export const giftPackages: GiftPackage[] = [
    {
    amount: 5,
    rewards: [
      { name: 'Diamond', quantity: 20_000 },
    ],
  },
  {
    amount: 10,
    rewards: [
      { name: 'Diamond', quantity: 10_000 },
      { name: 'Black Wing Special Supply' },
    ],
  },
  {
    amount: 50,
    rewards: [
      { name: 'Diamond', quantity: 210_000 },
      { name: 'Gold Chest', quantity: 500 },
      {
        name: 'Sunset Splendid Weapon Style Summon x11 (Bound)',
        quantity: 50,
      },
      {
        name: 'Sunset Splendid Mount Summon x11 (Bound)',
        quantity: 50,
      },
    ],
  },
  {
    amount: 100,
    rewards: [
      { name: 'Diamond', quantity: 450_000 },
      { name: 'Gold Chest', quantity: 1_000 },
      {
        name: 'Sunset Splendid Weapon Style Summon x11 (Bound)',
        quantity: 100,
      },
      {
        name: 'Sunset Splendid Mount Summon x11 (Bound)',
        quantity: 100,
      },
    ],
  },
  {
    amount: 200,
    rewards: [
      { name: 'Diamond', quantity: 1_000_000 },
      { name: 'Gold Chest', quantity: 3_000 },
      {
        name: 'Sunset Splendid Weapon Style Summon x11 (Bound)',
        quantity: 200,
      },
      {
        name: 'Sunset Splendid Mount Summon x11 (Bound)',
        quantity: 200,
      },
      { name: 'Morion', quantity: 500 },
      {
        name: 'Time Recharger - Masarta Special Dungeon',
        quantity: 10,
      },
    ],
  },
  {
    amount: 500,
    rewards: [
      { name: 'Diamond', quantity: 3_000_000 },
      { name: 'Gold Chest', quantity: 5_000 },
      {
        name: 'Sunset Splendid Weapon Style Summon x11 (Bound)',
        quantity: 500,
      },
      {
        name: 'Sunset Splendid Mount Summon x11 (Bound)',
        quantity: 500,
      },
      { name: 'Morion', quantity: 2_000 },
      {
        name: 'Time Recharger - Masarta Special Dungeon',
        quantity: 30,
      },
      {
        name: 'Element Extraction of Harmony (Bound)',
        quantity: 1_000,
      },
    ],
  },
  {
    amount: 1_000,
    rewards: [
      { name: 'Diamond', quantity: 8_000_000 },
      { name: 'Gold Chest', quantity: 10_000 },
      {
        name: 'Sunset Splendid Weapon Style Summon x11 (Bound)',
        quantity: 1_000,
      },
      {
        name: 'Sunset Splendid Mount Summon x11 (Bound)',
        quantity: 1_000,
      },
      { name: 'Morion', quantity: 5_000 },
      {
        name: 'Time Recharger - Masarta Special Dungeon',
        quantity: 100,
      },
      {
        name: 'Element Extraction of Harmony (Bound)',
        quantity: 2_000,
      },
    ],
  },
]