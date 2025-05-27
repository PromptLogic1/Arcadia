// Define the structure for card pool size limits
export interface CardPoolSizeLimits {
  Small: number; // Placeholder, adjust as needed
  Medium: number; // Placeholder, adjust as needed
  Large: number; // Placeholder, adjust as needed
}

// Define the generator configuration
export const GENERATOR_CONFIG = {
  CARDPOOLSIZE_LIMITS: {
    Small: 50,  // Example value
    Medium: 100, // Example value
    Large: 200   // Example value
  } as CardPoolSizeLimits,
  // Add other generator configurations here if needed
};

// Define the type for a single card category
// This could be a string, or a more complex object if categories have more properties
export type CardCategory = string;

// Define an array of available card categories
// These are example categories, replace with actual categories
export const CARD_CATEGORIES: CardCategory[] = [
  'Action',
  'Adventure',
  'Puzzle',
  'Strategy',
  'RPG',
  'Indie',
  // Add more categories as needed
];

// Example of a more complex CardCategory if needed:
// export interface CardCategory {
//   id: string;
//   name: string;
//   description?: string;
// }
//
// export const CARD_CATEGORIES: CardCategory[] = [
//   { id: 'action', name: 'Action' },
//   { id: 'adventure', name: 'Adventure' },
// ]; 