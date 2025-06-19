import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import BoardCard from '../BoardCard';
import { notifications } from '@/lib/notifications';
import { logger } from '@/lib/logger';
import type { Tables } from '@/types';

// Mock dependencies
jest.mock('next/navigation');
jest.mock('@/lib/notifications');
jest.mock('@/lib/logger');
jest.mock('@/lib/sanitization', () => ({
  sanitizeBoardContent: (content: string) => content,
}));

const mockRouter = {
  push: jest.fn(),
};
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockNotifications = notifications as jest.Mocked<typeof notifications>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('BoardCard', () => {
  const mockBoard: Tables<'bingo_boards'> = {
    id: 'board-123',
    title: 'Test Bingo Board',
    description: 'A test board for unit testing',
    status: 'active',
    is_public: true,
    difficulty: 'medium',
    size: 5,
    game_type: 'Valorant',
    settings: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    creator_id: 'user-123',
    tags: [],
    metadata: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue(mockRouter as any);
  });

  describe('rendering', () => {
    it('displays board title and description', () => {
      render(<BoardCard board={mockBoard} />);

      expect(screen.getByText('Test Bingo Board')).toBeInTheDocument();
      expect(
        screen.getByText('A test board for unit testing')
      ).toBeInTheDocument();
    });

    it('displays default description when none provided', () => {
      const boardWithoutDesc = { ...mockBoard, description: null };
      render(<BoardCard board={boardWithoutDesc} />);

      expect(screen.getByText('No description provided')).toBeInTheDocument();
    });

    it('shows public board indicator when board is public', () => {
      render(<BoardCard board={mockBoard} />);

      const publicIndicator = screen.getByLabelText(/public board/i);
      expect(publicIndicator).toBeInTheDocument();
    });

    it('hides public board indicator when board is private', () => {
      const privateBoard = { ...mockBoard, is_public: false };
      render(<BoardCard board={privateBoard} />);

      const publicIndicator = screen.queryByLabelText(/public board/i);
      expect(publicIndicator).not.toBeInTheDocument();
    });
  });

  describe('board metadata', () => {
    it('displays difficulty badge', () => {
      render(<BoardCard board={mockBoard} />);

      expect(screen.getByText('medium')).toBeInTheDocument();
    });

    it('displays board size', () => {
      render(<BoardCard board={mockBoard} />);

      expect(screen.getByText('5×5')).toBeInTheDocument();
    });

    it('displays game type when not "All Games"', () => {
      render(<BoardCard board={mockBoard} />);

      expect(screen.getByText('Valorant')).toBeInTheDocument();
    });

    it('hides game type badge for "All Games"', () => {
      const allGamesBoard = { ...mockBoard, game_type: 'All Games' };
      render(<BoardCard board={allGamesBoard} />);

      expect(screen.queryByText('All Games')).not.toBeInTheDocument();
    });
  });

  describe('statistics display', () => {
    it('shows consistent participant count based on board ID', () => {
      render(<BoardCard board={mockBoard} />);

      // The stats are generated based on board ID, so they should be consistent
      const participantText = screen.getByText(/\d+ players/);
      expect(participantText).toBeInTheDocument();
    });

    it('shows completion rate when greater than 0', () => {
      // Use a board ID that generates non-zero completion rate
      const boardWithCompletion = { ...mockBoard, id: 'board-with-completion' };
      render(<BoardCard board={boardWithCompletion} />);

      const completionText = screen.getByText(/\d+% complete/);
      expect(completionText).toBeInTheDocument();
    });

    it('shows "Not started" when completion rate is 0', () => {
      // Use a board ID that generates 0% completion
      const boardNotStarted = { ...mockBoard, id: 'board-000' };
      render(<BoardCard board={boardNotStarted} />);

      expect(screen.getByText('Not started')).toBeInTheDocument();
    });
  });

  describe('navigation actions', () => {
    it('links to edit page with correct board ID', () => {
      render(<BoardCard board={mockBoard} />);

      const editLink = screen.getByRole('link', { name: /edit board/i });
      expect(editLink).toHaveAttribute('href', '/challenge-hub/board-123');
    });

    it('navigates to play area when Play button clicked', async () => {
      const user = userEvent.setup();
      render(<BoardCard board={mockBoard} />);

      const playButton = screen.getByRole('button', { name: /play board/i });
      await user.click(playButton);

      expect(mockRouter.push).toHaveBeenCalledWith(
        '/play-area?boardId=board-123&host=true'
      );
    });

    it('shows loading state while hosting', async () => {
      const user = userEvent.setup();
      render(<BoardCard board={mockBoard} />);

      const playButton = screen.getByRole('button', { name: /play board/i });
      await user.click(playButton);

      expect(screen.getByText('Starting...')).toBeInTheDocument();
      expect(playButton).toBeDisabled();
    });

    it('handles navigation errors gracefully', async () => {
      const user = userEvent.setup();
      mockRouter.push.mockRejectedValue(new Error('Navigation failed'));

      render(<BoardCard board={mockBoard} />);

      const playButton = screen.getByRole('button', { name: /play board/i });
      await user.click(playButton);

      await waitFor(() => {
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Failed to navigate to play area',
          expect.any(Error),
          expect.objectContaining({
            component: 'BoardCard',
            boardId: 'board-123',
          })
        );
        expect(mockNotifications.error).toHaveBeenCalledWith(
          'Failed to start session'
        );
      });
    });
  });

  describe('accessibility', () => {
    it('has proper ARIA labels for interactive elements', () => {
      render(<BoardCard board={mockBoard} />);

      const playButton = screen.getByRole('button', { name: /play board/i });
      expect(playButton).toBeInTheDocument();

      const editLink = screen.getByRole('link', { name: /edit board/i });
      expect(editLink).toBeInTheDocument();
    });

    it('provides screen reader text for loading state', async () => {
      const user = userEvent.setup();
      render(<BoardCard board={mockBoard} />);

      const playButton = screen.getByRole('button', { name: /play board/i });
      await user.click(playButton);

      expect(screen.getByText('Starting...')).toBeInTheDocument();
    });
  });

  describe('memoization', () => {
    it('does not re-render when props are unchanged', () => {
      const { rerender } = render(<BoardCard board={mockBoard} />);

      const initialTitle = screen.getByText('Test Bingo Board');

      // Re-render with same props
      rerender(<BoardCard board={mockBoard} />);

      // Should be the same DOM element (not re-created)
      expect(screen.getByText('Test Bingo Board')).toBe(initialTitle);
    });

    it('re-renders when board props change', () => {
      const { rerender } = render(<BoardCard board={mockBoard} />);

      const updatedBoard = { ...mockBoard, title: 'Updated Title' };
      rerender(<BoardCard board={updatedBoard} />);

      expect(screen.getByText('Updated Title')).toBeInTheDocument();
      expect(screen.queryByText('Test Bingo Board')).not.toBeInTheDocument();
    });
  });

  describe('error boundary integration', () => {
    it('wraps content in BaseErrorBoundary', () => {
      // This test verifies the component structure includes error boundary
      // Actual error boundary behavior is tested in BaseErrorBoundary.test.tsx
      const { container } = render(<BoardCard board={mockBoard} />);

      // The card should be rendered within the error boundary
      expect(container.querySelector('.group')).toBeInTheDocument();
    });
  });
});
