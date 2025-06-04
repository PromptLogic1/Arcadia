/**
 * Service Layer Index
 * 
 * This file exports all service modules that handle data fetching and mutations.
 * Services are pure functions that interact with external APIs (Supabase).
 * They don't manage state - that's handled by Zustand stores.
 */

export * from './auth.service';
export * from './bingo-cards.service';
export * from './bingo-boards.service';
export * from './sessions.service';
export * from './community.service';

// Common types used across services
export interface ServiceResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface FilterParams {
  search?: string;
  gameType?: string;
  difficulty?: string;
  tags?: string[];
}