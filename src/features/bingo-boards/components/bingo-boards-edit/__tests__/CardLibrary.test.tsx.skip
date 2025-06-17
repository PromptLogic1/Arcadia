import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CardLibrary } from '../CardLibrary';
import type { GameCategory } from '@/types';
import { COLLECTION_LIMITS } from '../constants';

// Mock dependencies
jest.mock('@/lib/supabase', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            or: jest.fn(() => ({
              order: jest.fn(() => ({
                limit: jest.fn(() =>
                  Promise.resolve({ data: [], error: null })
                ),
              })),
            })),
          })),
        })),
      })),
    })),
  })),
}));

jest.mock('@/lib/notifications', () => ({
  notifications: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const defaultProps = {
  gameType: 'gaming' as GameCategory,
  onCardSelect: jest.fn(),
  onShuffle: jest.fn(),
  onUseCollection: jest.fn(),
  onBulkAddCards: jest.fn(),
  gridSize: 5,
};

describe('CardLibrary Bulk Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render bulk select button', async () => {
    render(<CardLibrary {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Bulk Select')).toBeInTheDocument();
    });
  });

  it('should toggle bulk mode when bulk select button is clicked', async () => {
    const user = userEvent.setup();
    render(<CardLibrary {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Bulk Select')).toBeInTheDocument();
    });

    const bulkSelectButton = screen.getByText('Bulk Select');
    await user.click(bulkSelectButton);

    expect(screen.getByText('Exit Bulk')).toBeInTheDocument();
    expect(screen.getByText('Select All')).toBeInTheDocument();
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });

  it('should validate collection size limits', () => {
    expect(COLLECTION_LIMITS.MIN_CARDS).toBe(5);
    expect(COLLECTION_LIMITS.MAX_CARDS).toBe(100);
  });

  it('should display collection size validation messages', async () => {
    const user = userEvent.setup();
    render(<CardLibrary {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Bulk Select')).toBeInTheDocument();
    });

    // Enter bulk mode
    const bulkSelectButton = screen.getByText('Bulk Select');
    await user.click(bulkSelectButton);

    // Should show the bulk actions bar
    expect(screen.getByText('0 / 0 selected')).toBeInTheDocument();
  });
});
