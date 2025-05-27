// This file defines types related to board generation.
// Adjust the properties below to match your actual generator statistics.

export interface GeneratorStats {
  // Time taken (in ms) to generate the board.
  generationTime: number;
  // Number of attempts taken to generate a valid board.
  attempts: number;
  // Optional balance score computed during generation.
  balanceScore?: number;
} 