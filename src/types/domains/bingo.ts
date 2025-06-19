/**
 * Domain types for Bingo-related entities
 * 
 * These types represent the business domain layer with properly transformed
 * and validated data structures.
 */

import type { BingoBoard, BoardCell, BoardSettings } from '@/types';

/**
 * Domain representation of a Bingo Board with validated and transformed state
 */
export interface BingoBoardDomain extends Omit<BingoBoard, 'board_state' | 'settings'> {
  board_state: BoardCell[];
  settings: BoardSettings;
}