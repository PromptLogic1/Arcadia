/**
 * Board Collections Store Tests
 * 
 * Comprehensive tests for the board-collections-store Zustand store.
 * Following Context7 best practices - testing public APIs only.
 */

import { renderHook, act } from '@testing-library/react';
import { 
  useBoardCollectionsStore,
  useBoardCollectionsState,
  useBoardCollectionsActions
} from '../board-collections-store';
import type { BoardCollectionFilters } from '@/services/board-collections.service';

describe('BoardCollectionsStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useBoardCollectionsStore.setState({
      filters: {
        search: '',
        difficulty: 'all',
        sortBy: 'popular',
        gameType: 'All Games',
      },
      isShuffling: false,
    });
  });

  describe('initial state', () => {
    it('should have correct initial filters', () => {
      const { result } = renderHook(() => useBoardCollectionsState());
      
      expect(result.current.filters).toEqual({
        search: '',
        difficulty: 'all',
        sortBy: 'popular',
        gameType: 'All Games',
      });
    });

    it('should have isShuffling set to false initially', () => {
      const { result } = renderHook(() => useBoardCollectionsState());
      
      expect(result.current.isShuffling).toBe(false);
    });
  });

  describe('filter actions', () => {
    it('should update filters with setFilters', () => {
      const { result } = renderHook(() => useBoardCollectionsStore());
      
      act(() => {
        result.current.setFilters({
          search: 'test',
          difficulty: 'hard',
        });
      });

      expect(result.current.filters.search).toBe('test');
      expect(result.current.filters.difficulty).toBe('hard');
      expect(result.current.filters.sortBy).toBe('popular'); // unchanged
      expect(result.current.filters.gameType).toBe('All Games'); // unchanged
    });

    it('should merge partial filters without removing existing values', () => {
      const { result } = renderHook(() => useBoardCollectionsStore());
      
      // Set initial filters
      act(() => {
        result.current.setFilters({
          search: 'initial',
          difficulty: 'easy',
          sortBy: 'newest',
        });
      });

      // Update only some filters
      act(() => {
        result.current.setFilters({
          search: 'updated',
        });
      });

      expect(result.current.filters).toEqual({
        search: 'updated',
        difficulty: 'easy',
        sortBy: 'newest',
        gameType: 'All Games',
      });
    });

    it('should reset filters with resetFilters and preserve gameType', () => {
      const { result } = renderHook(() => useBoardCollectionsStore());
      
      // Modify filters
      act(() => {
        result.current.setFilters({
          search: 'test',
          difficulty: 'expert',
          sortBy: 'trending',
        });
      });

      // Reset with specific game type
      act(() => {
        result.current.resetFilters('Minecraft');
      });

      expect(result.current.filters).toEqual({
        search: '',
        difficulty: 'all',
        sortBy: 'popular',
        gameType: 'Minecraft',
      });
    });

    it('should update individual filter with updateFilter', () => {
      const { result } = renderHook(() => useBoardCollectionsStore());
      
      act(() => {
        result.current.updateFilter('search', 'bingo');
      });

      expect(result.current.filters.search).toBe('bingo');
      
      act(() => {
        result.current.updateFilter('difficulty', 'medium');
      });

      expect(result.current.filters.difficulty).toBe('medium');
      
      act(() => {
        result.current.updateFilter('sortBy', 'bookmarks');
      });

      expect(result.current.filters.sortBy).toBe('bookmarks');
    });

    it('should handle all valid sort options', () => {
      const { result } = renderHook(() => useBoardCollectionsStore());
      const sortOptions: BoardCollectionFilters['sortBy'][] = ['newest', 'popular', 'trending', 'bookmarks'];
      
      sortOptions.forEach(sortOption => {
        act(() => {
          result.current.updateFilter('sortBy', sortOption);
        });
        
        expect(result.current.filters.sortBy).toBe(sortOption);
      });
    });

    it('should handle all valid difficulty options', () => {
      const { result } = renderHook(() => useBoardCollectionsStore());
      const difficultyOptions: BoardCollectionFilters['difficulty'][] = ['all', 'beginner', 'easy', 'medium', 'hard', 'expert'];
      
      difficultyOptions.forEach(difficulty => {
        act(() => {
          result.current.updateFilter('difficulty', difficulty);
        });
        
        expect(result.current.filters.difficulty).toBe(difficulty);
      });
    });

    it('should handle different game categories', () => {
      const { result } = renderHook(() => useBoardCollectionsStore());
      const gameCategories = ['All Games', 'Minecraft', 'Fortnite', 'Among Us'] as const;
      
      gameCategories.forEach(gameType => {
        act(() => {
          result.current.updateFilter('gameType', gameType);
        });
        
        expect(result.current.filters.gameType).toBe(gameType);
      });
    });
  });

  describe('UI actions', () => {
    it('should update isShuffling state', () => {
      const { result } = renderHook(() => useBoardCollectionsStore());
      
      expect(result.current.isShuffling).toBe(false);
      
      act(() => {
        result.current.setIsShuffling(true);
      });
      
      expect(result.current.isShuffling).toBe(true);
      
      act(() => {
        result.current.setIsShuffling(false);
      });
      
      expect(result.current.isShuffling).toBe(false);
    });
  });

  describe('selector hooks', () => {
    it('should return only state with useBoardCollectionsState', () => {
      const { result } = renderHook(() => useBoardCollectionsState());
      
      expect(result.current).toHaveProperty('filters');
      expect(result.current).toHaveProperty('isShuffling');
      expect(result.current).not.toHaveProperty('setFilters');
      expect(result.current).not.toHaveProperty('resetFilters');
      expect(result.current).not.toHaveProperty('updateFilter');
      expect(result.current).not.toHaveProperty('setIsShuffling');
    });

    it('should return only actions with useBoardCollectionsActions', () => {
      const { result } = renderHook(() => useBoardCollectionsActions());
      
      expect(result.current).toHaveProperty('setFilters');
      expect(result.current).toHaveProperty('resetFilters');
      expect(result.current).toHaveProperty('updateFilter');
      expect(result.current).toHaveProperty('setIsShuffling');
      expect(result.current).not.toHaveProperty('filters');
      expect(result.current).not.toHaveProperty('isShuffling');
    });

    it('should maintain referential equality for actions', () => {
      const { result, rerender } = renderHook(() => useBoardCollectionsActions());
      
      const actions1 = result.current;
      
      // Trigger re-render
      rerender();
      
      const actions2 = result.current;
      
      expect(actions1).toBe(actions2);
    });

    it('should update state references when state changes', () => {
      const { result, rerender } = renderHook(() => useBoardCollectionsState());
      
      const state1 = result.current;
      
      // Change state
      act(() => {
        useBoardCollectionsStore.getState().setFilters({ search: 'test' });
      });
      
      rerender();
      
      const state2 = result.current;
      
      expect(state1).not.toBe(state2);
      expect(state2.filters.search).toBe('test');
    });
  });

  describe('complex scenarios', () => {
    it('should handle rapid filter updates', () => {
      const { result } = renderHook(() => useBoardCollectionsStore());
      
      act(() => {
        result.current.setFilters({ search: 'test1' });
        result.current.setFilters({ search: 'test2' });
        result.current.setFilters({ search: 'test3' });
      });
      
      expect(result.current.filters.search).toBe('test3');
    });

    it('should handle concurrent UI state and filter updates', () => {
      const { result } = renderHook(() => useBoardCollectionsStore());
      
      act(() => {
        result.current.setIsShuffling(true);
        result.current.setFilters({ difficulty: 'hard' });
        result.current.updateFilter('sortBy', 'newest');
      });
      
      expect(result.current.isShuffling).toBe(true);
      expect(result.current.filters.difficulty).toBe('hard');
      expect(result.current.filters.sortBy).toBe('newest');
    });

    it('should persist other filters when resetting with different game type', () => {
      const { result } = renderHook(() => useBoardCollectionsStore());
      
      // Set custom filters
      act(() => {
        result.current.setFilters({
          search: 'custom',
          difficulty: 'expert',
          sortBy: 'trending',
          gameType: 'Fortnite',
        });
      });
      
      // Reset with different game type
      act(() => {
        result.current.resetFilters('League of Legends');
      });
      
      expect(result.current.filters).toEqual({
        search: '',
        difficulty: 'all',
        sortBy: 'popular',
        gameType: 'League of Legends',
      });
    });

    it('should handle empty search string', () => {
      const { result } = renderHook(() => useBoardCollectionsStore());
      
      act(() => {
        result.current.setFilters({ search: 'test' });
      });
      
      expect(result.current.filters.search).toBe('test');
      
      act(() => {
        result.current.setFilters({ search: '' });
      });
      
      expect(result.current.filters.search).toBe('');
    });

    it('should maintain isShuffling state across filter changes', () => {
      const { result } = renderHook(() => useBoardCollectionsStore());
      
      act(() => {
        result.current.setIsShuffling(true);
      });
      
      act(() => {
        result.current.setFilters({ search: 'test' });
        result.current.updateFilter('difficulty', 'hard');
        result.current.resetFilters('Minecraft');
      });
      
      expect(result.current.isShuffling).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle undefined in partial filter updates', () => {
      const { result } = renderHook(() => useBoardCollectionsStore());
      
      const initialFilters = { ...result.current.filters };
      
      act(() => {
        result.current.setFilters({});
      });
      
      expect(result.current.filters).toEqual(initialFilters);
    });

    it('should handle special characters in search filter', () => {
      const { result } = renderHook(() => useBoardCollectionsStore());
      
      const specialSearches = ['test@#$', 'hello%world', 'bingo!', '<script>alert()</script>'];
      
      specialSearches.forEach(search => {
        act(() => {
          result.current.updateFilter('search', search);
        });
        
        expect(result.current.filters.search).toBe(search);
      });
    });

    it('should handle very long search strings', () => {
      const { result } = renderHook(() => useBoardCollectionsStore());
      
      const longSearch = 'a'.repeat(1000);
      
      act(() => {
        result.current.updateFilter('search', longSearch);
      });
      
      expect(result.current.filters.search).toBe(longSearch);
    });

    it('should handle filter reset on same game type', () => {
      const { result } = renderHook(() => useBoardCollectionsStore());
      
      act(() => {
        result.current.setFilters({
          search: 'test',
          difficulty: 'hard',
          sortBy: 'newest',
          gameType: 'All Games',
        });
      });
      
      act(() => {
        result.current.resetFilters('All Games');
      });
      
      expect(result.current.filters).toEqual({
        search: '',
        difficulty: 'all',
        sortBy: 'popular',
        gameType: 'All Games',
      });
    });
  });

  describe('persistence across component lifecycles', () => {
    it('should maintain state across multiple hook instances', () => {
      const { result: hook1 } = renderHook(() => useBoardCollectionsStore());
      const { result: hook2 } = renderHook(() => useBoardCollectionsStore());
      
      act(() => {
        hook1.current.setFilters({ search: 'shared' });
      });
      
      expect(hook2.current.filters.search).toBe('shared');
    });

    it('should reflect state changes across selector hooks', () => {
      const { result: stateHook } = renderHook(() => useBoardCollectionsState());
      const { result: actionsHook } = renderHook(() => useBoardCollectionsActions());
      
      act(() => {
        actionsHook.current.setFilters({ difficulty: 'expert' });
      });
      
      expect(stateHook.current.filters.difficulty).toBe('expert');
    });
  });
});