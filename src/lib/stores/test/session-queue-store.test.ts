/**
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react';
import useSessionQueueStore, {
  useSessionQueueState,
  useSessionQueueActions,
} from '@/lib/stores/session-queue-store';

// Mock navigator.clipboard
const mockClipboard = {
  writeText: jest.fn(),
};

describe('SessionQueueStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useSessionQueueStore.setState({
      showInviteDialog: false,
      showQueueDialog: false,
      inviteLink: '',
      playerFormData: null,
      isGeneratingLink: false,
      isCopyingLink: false,
      autoRefreshEnabled: true,
      refreshInterval: 30000,
      queueFilters: {
        showOnlyWaiting: false,
        sortBy: 'requested_at',
        sortOrder: 'asc',
      },
    });

    // Reset mocks
    jest.clearAllMocks();
    Object.defineProperty(navigator, 'clipboard', {
      value: mockClipboard,
      writable: true,
    });
    
    // Mock window.location only if window is defined
    if (typeof window !== 'undefined') {
      Object.defineProperty(window, 'location', {
        value: {
          origin: 'https://test.example.com',
        },
        writable: true,
      });
    }
  });

  describe('Modal Management', () => {
    it('should toggle invite dialog visibility', () => {
      const { result } = renderHook(() => useSessionQueueStore());

      expect(result.current.showInviteDialog).toBe(false);

      act(() => {
        result.current.setShowInviteDialog(true);
      });

      expect(result.current.showInviteDialog).toBe(true);

      act(() => {
        result.current.setShowInviteDialog(false);
      });

      expect(result.current.showInviteDialog).toBe(false);
    });

    it('should toggle queue dialog visibility', () => {
      const { result } = renderHook(() => useSessionQueueStore());

      expect(result.current.showQueueDialog).toBe(false);

      act(() => {
        result.current.setShowQueueDialog(true);
      });

      expect(result.current.showQueueDialog).toBe(true);

      act(() => {
        result.current.setShowQueueDialog(false);
      });

      expect(result.current.showQueueDialog).toBe(false);
    });
  });

  describe('Invite Link Management', () => {
    it('should set invite link directly', () => {
      const { result } = renderHook(() => useSessionQueueStore());
      const testLink = 'https://test.example.com/join/test-session-123';

      act(() => {
        result.current.setInviteLink(testLink);
      });

      expect(result.current.inviteLink).toBe(testLink);
    });

    it('should generate invite link for a session', async () => {
      const { result } = renderHook(() => useSessionQueueStore());
      const sessionId = 'test-session-123';

      await act(async () => {
        await result.current.generateInviteLink(sessionId);
      });

      expect(result.current.inviteLink).toBe(
        `https://test.example.com/join/${sessionId}`
      );
      expect(result.current.showInviteDialog).toBe(true);
      expect(result.current.isGeneratingLink).toBe(false);
    });

    it('should handle window undefined during SSR', async () => {
      // Test the store behavior when window.location is undefined
      const { result } = renderHook(() => useSessionQueueStore());

      // Store original location
      const originalLocationDescriptor = Object.getOwnPropertyDescriptor(window, 'location');
      
      await act(async () => {
        // Mock window.location to be undefined
        Object.defineProperty(window, 'location', {
          value: undefined,
          writable: true,
          configurable: true,
        });
        
        await result.current.generateInviteLink('test-session');
      });
      
      // Restore window.location
      if (originalLocationDescriptor) {
        Object.defineProperty(window, 'location', originalLocationDescriptor);
      }

      // When window.location is undefined, baseUrl should be empty string
      expect(result.current.inviteLink).toBe('/join/test-session');
      expect(result.current.showInviteDialog).toBe(true);
    });

    it('should copy invite link to clipboard', async () => {
      const { result } = renderHook(() => useSessionQueueStore());
      const testLink = 'https://test.example.com/join/test-session-123';
      mockClipboard.writeText.mockResolvedValueOnce(undefined);

      act(() => {
        result.current.setInviteLink(testLink);
      });

      let copyResult = false;
      await act(async () => {
        copyResult = await result.current.copyInviteLink();
      });

      expect(copyResult).toBe(true);
      expect(mockClipboard.writeText).toHaveBeenCalledWith(testLink);
      expect(result.current.isCopyingLink).toBe(false);
    });

    it('should return false when copying empty invite link', async () => {
      const { result } = renderHook(() => useSessionQueueStore());

      let copyResult = false;
      await act(async () => {
        copyResult = await result.current.copyInviteLink();
      });

      expect(copyResult).toBe(false);
      expect(mockClipboard.writeText).not.toHaveBeenCalled();
    });

    it('should handle clipboard API not available', async () => {
      const { result } = renderHook(() => useSessionQueueStore());
      // @ts-expect-error - Simulating missing clipboard API
      navigator.clipboard = undefined;

      act(() => {
        result.current.setInviteLink('https://test.example.com/join/test');
      });

      let copyResult = false;
      await act(async () => {
        copyResult = await result.current.copyInviteLink();
      });

      expect(copyResult).toBe(false);
      expect(result.current.isCopyingLink).toBe(false);
    });

    it('should handle clipboard write error', async () => {
      const { result } = renderHook(() => useSessionQueueStore());
      mockClipboard.writeText.mockRejectedValueOnce(new Error('Clipboard error'));

      act(() => {
        result.current.setInviteLink('https://test.example.com/join/test');
      });

      let copyResult = false;
      await act(async () => {
        copyResult = await result.current.copyInviteLink();
      });

      expect(copyResult).toBe(false);
      expect(result.current.isCopyingLink).toBe(false);
    });

    it('should track generating link state', () => {
      const { result } = renderHook(() => useSessionQueueStore());

      act(() => {
        result.current.setIsGeneratingLink(true);
      });

      expect(result.current.isGeneratingLink).toBe(true);

      act(() => {
        result.current.setIsGeneratingLink(false);
      });

      expect(result.current.isGeneratingLink).toBe(false);
    });

    it('should track copying link state', () => {
      const { result } = renderHook(() => useSessionQueueStore());

      act(() => {
        result.current.setIsCopyingLink(true);
      });

      expect(result.current.isCopyingLink).toBe(true);

      act(() => {
        result.current.setIsCopyingLink(false);
      });

      expect(result.current.isCopyingLink).toBe(false);
    });
  });

  describe('Player Form Management', () => {
    it('should set complete player form data', () => {
      const { result } = renderHook(() => useSessionQueueStore());
      const formData = {
        playerName: 'TestPlayer',
        color: '#FF0000',
        team: 1,
      };

      act(() => {
        result.current.setPlayerFormData(formData);
      });

      expect(result.current.playerFormData).toEqual(formData);
    });

    it('should update individual form fields', () => {
      const { result } = renderHook(() => useSessionQueueStore());

      act(() => {
        result.current.setPlayerFormData({
          playerName: 'Player1',
          color: '#00FF00',
        });
      });

      act(() => {
        result.current.updatePlayerFormField('playerName', 'UpdatedPlayer');
      });

      expect(result.current.playerFormData).toEqual({
        playerName: 'UpdatedPlayer',
        color: '#00FF00',
      });

      act(() => {
        result.current.updatePlayerFormField('team', 2);
      });

      expect(result.current.playerFormData).toEqual({
        playerName: 'UpdatedPlayer',
        color: '#00FF00',
        team: 2,
      });
    });

    it('should create form data when updating field on null form', () => {
      const { result } = renderHook(() => useSessionQueueStore());

      expect(result.current.playerFormData).toBeNull();

      act(() => {
        result.current.updatePlayerFormField('playerName', 'NewPlayer');
      });

      expect(result.current.playerFormData).toEqual({
        playerName: 'NewPlayer',
        color: '',
      });
    });

    it('should reset player form data', () => {
      const { result } = renderHook(() => useSessionQueueStore());

      act(() => {
        result.current.setPlayerFormData({
          playerName: 'TestPlayer',
          color: '#FF0000',
          team: 1,
        });
      });

      act(() => {
        result.current.resetPlayerForm();
      });

      expect(result.current.playerFormData).toBeNull();
    });
  });

  describe('Auto-refresh Management', () => {
    it('should toggle auto-refresh enabled state', () => {
      const { result } = renderHook(() => useSessionQueueStore());

      expect(result.current.autoRefreshEnabled).toBe(true);

      act(() => {
        result.current.setAutoRefreshEnabled(false);
      });

      expect(result.current.autoRefreshEnabled).toBe(false);

      act(() => {
        result.current.setAutoRefreshEnabled(true);
      });

      expect(result.current.autoRefreshEnabled).toBe(true);
    });

    it('should update refresh interval', () => {
      const { result } = renderHook(() => useSessionQueueStore());

      expect(result.current.refreshInterval).toBe(30000);

      act(() => {
        result.current.setRefreshInterval(60000);
      });

      expect(result.current.refreshInterval).toBe(60000);

      act(() => {
        result.current.setRefreshInterval(15000);
      });

      expect(result.current.refreshInterval).toBe(15000);
    });
  });

  describe('Queue Filter Management', () => {
    it('should update queue filters partially', () => {
      const { result } = renderHook(() => useSessionQueueStore());

      act(() => {
        result.current.setQueueFilters({ showOnlyWaiting: true });
      });

      expect(result.current.queueFilters).toEqual({
        showOnlyWaiting: true,
        sortBy: 'requested_at',
        sortOrder: 'asc',
      });

      act(() => {
        result.current.setQueueFilters({
          sortBy: 'player_name',
          sortOrder: 'desc',
        });
      });

      expect(result.current.queueFilters).toEqual({
        showOnlyWaiting: true,
        sortBy: 'player_name',
        sortOrder: 'desc',
      });
    });

    it('should reset queue filters to defaults', () => {
      const { result } = renderHook(() => useSessionQueueStore());

      act(() => {
        result.current.setQueueFilters({
          showOnlyWaiting: true,
          sortBy: 'status',
          sortOrder: 'desc',
        });
      });

      act(() => {
        result.current.resetQueueFilters();
      });

      expect(result.current.queueFilters).toEqual({
        showOnlyWaiting: false,
        sortBy: 'requested_at',
        sortOrder: 'asc',
      });
    });

    it('should handle all sort by options', () => {
      const { result } = renderHook(() => useSessionQueueStore());
      const sortOptions: Array<'requested_at' | 'player_name' | 'status'> = [
        'requested_at',
        'player_name',
        'status',
      ];

      sortOptions.forEach(sortBy => {
        act(() => {
          result.current.setQueueFilters({ sortBy });
        });

        expect(result.current.queueFilters.sortBy).toBe(sortBy);
      });
    });
  });

  describe('Utility Actions', () => {
    it('should reset entire store to initial state', () => {
      const { result } = renderHook(() => useSessionQueueStore());

      // Modify multiple state values
      act(() => {
        result.current.setShowInviteDialog(true);
        result.current.setShowQueueDialog(true);
        result.current.setInviteLink('https://test.com/join/123');
        result.current.setPlayerFormData({
          playerName: 'Test',
          color: '#FF0000',
        });
        result.current.setAutoRefreshEnabled(false);
        result.current.setRefreshInterval(60000);
        result.current.setQueueFilters({
          showOnlyWaiting: true,
          sortBy: 'status',
          sortOrder: 'desc',
        });
      });

      // Reset everything
      act(() => {
        result.current.reset();
      });

      // Verify all state is back to initial
      expect(result.current.showInviteDialog).toBe(false);
      expect(result.current.showQueueDialog).toBe(false);
      expect(result.current.inviteLink).toBe('');
      expect(result.current.playerFormData).toBeNull();
      expect(result.current.isGeneratingLink).toBe(false);
      expect(result.current.isCopyingLink).toBe(false);
      expect(result.current.autoRefreshEnabled).toBe(true);
      expect(result.current.refreshInterval).toBe(30000);
      expect(result.current.queueFilters).toEqual({
        showOnlyWaiting: false,
        sortBy: 'requested_at',
        sortOrder: 'asc',
      });
    });
  });

  describe('Selectors', () => {
    it('should provide state through useSessionQueueState selector', () => {
      const { result: storeResult } = renderHook(() => useSessionQueueStore());
      const { result: stateResult } = renderHook(() => useSessionQueueState());

      // Verify initial state matches
      expect(stateResult.current.showInviteDialog).toBe(
        storeResult.current.showInviteDialog
      );
      expect(stateResult.current.inviteLink).toBe(storeResult.current.inviteLink);
      expect(stateResult.current.playerFormData).toBe(
        storeResult.current.playerFormData
      );
      expect(stateResult.current.queueFilters).toEqual(
        storeResult.current.queueFilters
      );

      // Update store and verify selector reflects changes
      act(() => {
        storeResult.current.setInviteLink('https://test.com/join/456');
        storeResult.current.setShowInviteDialog(true);
      });

      expect(stateResult.current.inviteLink).toBe('https://test.com/join/456');
      expect(stateResult.current.showInviteDialog).toBe(true);
    });

    it('should provide actions through useSessionQueueActions selector', () => {
      const { result } = renderHook(() => useSessionQueueActions());

      // Verify all actions are available
      expect(typeof result.current.setShowInviteDialog).toBe('function');
      expect(typeof result.current.setShowQueueDialog).toBe('function');
      expect(typeof result.current.setInviteLink).toBe('function');
      expect(typeof result.current.generateInviteLink).toBe('function');
      expect(typeof result.current.copyInviteLink).toBe('function');
      expect(typeof result.current.setPlayerFormData).toBe('function');
      expect(typeof result.current.updatePlayerFormField).toBe('function');
      expect(typeof result.current.resetPlayerForm).toBe('function');
      expect(typeof result.current.setAutoRefreshEnabled).toBe('function');
      expect(typeof result.current.setRefreshInterval).toBe('function');
      expect(typeof result.current.setQueueFilters).toBe('function');
      expect(typeof result.current.resetQueueFilters).toBe('function');
      expect(typeof result.current.reset).toBe('function');

      // Test that actions work correctly
      const { result: storeResult } = renderHook(() => useSessionQueueStore());

      act(() => {
        result.current.setShowInviteDialog(true);
      });

      expect(storeResult.current.showInviteDialog).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent state updates', () => {
      const { result } = renderHook(() => useSessionQueueStore());

      act(() => {
        result.current.setShowInviteDialog(true);
        result.current.setShowQueueDialog(true);
        result.current.setInviteLink('test-link');
        result.current.setIsGeneratingLink(true);
        result.current.setIsCopyingLink(true);
      });

      expect(result.current.showInviteDialog).toBe(true);
      expect(result.current.showQueueDialog).toBe(true);
      expect(result.current.inviteLink).toBe('test-link');
      expect(result.current.isGeneratingLink).toBe(true);
      expect(result.current.isCopyingLink).toBe(true);
    });

    it('should handle rapid filter updates', () => {
      const { result } = renderHook(() => useSessionQueueStore());

      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.setQueueFilters({
            sortOrder: i % 2 === 0 ? 'asc' : 'desc',
          });
        }
      });

      // After 10 iterations (0-9), the last iteration is i=9 (odd), so sortOrder should be 'desc'
      expect(result.current.queueFilters.sortOrder).toBe('desc');
    });

    it('should maintain state consistency after errors', async () => {
      const { result } = renderHook(() => useSessionQueueStore());
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock window.location.origin to throw an error
      const originalLocationDescriptor = Object.getOwnPropertyDescriptor(window, 'location');
      const mockLocation = {
        get origin() {
          throw new Error('Window access error');
        }
      };

      await act(async () => {
        try {
          // Override window.location
          Object.defineProperty(window, 'location', {
            value: mockLocation,
            writable: true,
            configurable: true,
          });
          
          await result.current.generateInviteLink('test-session');
        } catch {
          // Expected error
        }
      });

      // Restore original location
      if (originalLocationDescriptor) {
        Object.defineProperty(window, 'location', originalLocationDescriptor);
      }

      expect(result.current.isGeneratingLink).toBe(false);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Performance', () => {
    it('should not trigger unnecessary re-renders with selectors', () => {
      const stateRenderCount = jest.fn();
      const actionsRenderCount = jest.fn();

      const StateComponent = () => {
        useSessionQueueState();
        stateRenderCount();
        return null;
      };

      const ActionsComponent = () => {
        useSessionQueueActions();
        actionsRenderCount();
        return null;
      };

      renderHook(() => StateComponent());
      renderHook(() => ActionsComponent());

      const { result } = renderHook(() => useSessionQueueStore());

      // Actions should not trigger state component re-render
      act(() => {
        result.current.setShowInviteDialog(true);
      });

      expect(stateRenderCount).toHaveBeenCalledTimes(2); // Initial + update
      expect(actionsRenderCount).toHaveBeenCalledTimes(1); // Only initial
    });
  });
});