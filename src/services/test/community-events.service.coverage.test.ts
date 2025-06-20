/**
 * @jest-environment node
 * 
 * Community Events Service Coverage Tests
 * Target coverage gaps in lines: 69-80, 162-163, 245-246, 296
 */

import { communityEventsService } from '../community-events.service';
import { createClient } from '@/lib/supabase';
import type { Enums } from '@/types/database.types';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('@/lib/logger');

type GameCategory = Enums<'game_category'>;
type EventStatus = Enums<'event_status'>;

const mockSupabase = {
  from: jest.fn(),
};

// Create a mock query builder that supports method chaining
const createMockQuery = () => {
  const mockQuery = {
    select: jest.fn(),
    order: jest.fn(),
    range: jest.fn(),
    eq: jest.fn(),
  };
  
  // Set up chaining - all methods return the same object
  mockQuery.select.mockReturnValue(mockQuery);
  mockQuery.order.mockReturnValue(mockQuery);
  mockQuery.range.mockReturnValue(mockQuery);
  mockQuery.eq.mockReturnValue(mockQuery);
  
  return mockQuery;
};

const mockQuery = createMockQuery();

const mockFrom = {
  select: jest.fn(),
};

describe('communityEventsService - Coverage Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    
    // Reset the mockQuery to a fresh state
    Object.assign(mockQuery, createMockQuery());
    
    // Setup the mock chain
    mockSupabase.from.mockReturnValue(mockFrom);
    mockFrom.select.mockReturnValue(mockQuery);
  });

  describe('getCommunityEvents - Filtering (lines 77-82)', () => {
    it('should apply game_type filter correctly', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          title: 'Minecraft Championship',
          description: 'Weekly Minecraft event',
          game_type: 'Minecraft' as GameCategory,
          status: 'active' as EventStatus,
          start_date: '2024-02-01T18:00:00Z',
          end_date: '2024-02-01T20:00:00Z',
          max_participants: 50,
          creator_id: 'user-123',
          created_at: '2024-01-25T00:00:00Z',
          updated_at: '2024-01-25T00:00:00Z',
          organizer: {
            username: 'minecraft_pro',
            avatar_url: null,
          },
          participants: [{ count: 25 }],
        },
      ];

      // Mock the final query execution to return a resolved promise
      const queryExecutionResult = Promise.resolve({
        data: mockEvents,
        error: null,
        count: 1,
      });
      
      // When .eq() is called, it should return a promise
      mockQuery.eq.mockReturnValueOnce(queryExecutionResult);

      const result = await communityEventsService.getCommunityEvents({
        game_type: 'Minecraft' as GameCategory,
      });

      expect(result.success).toBe(true);
      expect(mockQuery.eq).toHaveBeenCalledWith('game_type', 'Minecraft');
      expect(result.data?.items[0]?.game_type).toBe('Minecraft');
    });

    it('should apply status filter correctly', async () => {
      const mockEvents = [
        {
          id: 'event-2',
          title: 'Completed Tournament',
          description: 'Past tournament',
          game_type: 'Valorant' as GameCategory,
          status: 'completed' as EventStatus,
          start_date: '2024-01-01T18:00:00Z',
          end_date: '2024-01-01T20:00:00Z',
          max_participants: 32,
          creator_id: 'user-456',
          created_at: '2023-12-25T00:00:00Z',
          updated_at: '2024-01-01T20:00:00Z',
          organizer: {
            username: 'tournament_org',
            avatar_url: 'https://example.com/org.jpg',
          },
          participants: [{ count: 32 }],
        },
      ];

      // Mock the final query execution to return a resolved promise
      const queryExecutionResult = Promise.resolve({
        data: mockEvents,
        error: null,
        count: 1,
      });
      
      // When .eq() is called, it should return a promise
      mockQuery.eq.mockReturnValueOnce(queryExecutionResult);

      const result = await communityEventsService.getCommunityEvents({
        status: 'completed' as EventStatus,
      });

      expect(result.success).toBe(true);
      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'completed');
      expect(result.data?.items[0]?.status).toBe('completed');
    });

    it('should apply both game_type and status filters together', async () => {
      // Mock the final query execution to return a resolved promise
      const queryExecutionResult = Promise.resolve({
        data: [],
        error: null,
        count: 0,
      });
      
      // When the second .eq() is called, it should return a promise
      mockQuery.eq.mockReturnValueOnce(mockQuery).mockReturnValueOnce(queryExecutionResult);

      const result = await communityEventsService.getCommunityEvents({
        game_type: 'Fortnite' as GameCategory,
        status: 'upcoming' as EventStatus,
      });

      expect(result.success).toBe(true);
      expect(mockQuery.eq).toHaveBeenCalledWith('game_type', 'Fortnite');
      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'upcoming');
    });

    it('should ignore tags filter (not implemented)', async () => {
      // For tags filter (not implemented), the query ends at .range()
      const queryExecutionResult = Promise.resolve({
        data: [],
        error: null,
        count: 0,
      });
      
      // Since tags filter is not implemented, .range() is the final call
      mockQuery.range.mockReturnValueOnce(queryExecutionResult);

      const result = await communityEventsService.getCommunityEvents({
        tags: ['competitive', 'tournament'],
      });

      expect(result.success).toBe(true);
      // Tags filter is not implemented, so eq should not be called for tags
      expect(mockQuery.eq).not.toHaveBeenCalledWith('tags', expect.anything());
    });
  });

  describe('getCommunityEvents - Edge cases (lines 103-106)', () => {
    it('should handle participants as non-array', async () => {
      const mockEvents = [
        {
          id: 'event-3',
          title: 'Event with invalid participants',
          description: 'Test event',
          game_type: 'CS:GO' as GameCategory,
          status: 'active' as EventStatus,
          start_date: '2024-02-05T18:00:00Z',
          end_date: '2024-02-05T20:00:00Z',
          max_participants: 20,
          creator_id: 'user-789',
          created_at: '2024-01-30T00:00:00Z',
          updated_at: '2024-01-30T00:00:00Z',
          organizer: {
            username: 'csgo_master',
            avatar_url: null,
          },
          participants: 'invalid', // Non-array value
        },
      ];

      mockQuery.range.mockResolvedValueOnce({
        data: mockEvents,
        error: null,
        count: 1,
      });

      const result = await communityEventsService.getCommunityEvents();

      expect(result.success).toBe(true);
      expect(result.data?.items[0]?.participant_count).toBe(0);
    });

    it('should handle participants with missing count property', async () => {
      const mockEvents = [
        {
          id: 'event-4',
          title: 'Event with incomplete participants',
          description: 'Test event',
          game_type: 'Apex Legends' as GameCategory,
          status: 'active' as EventStatus,
          start_date: '2024-02-06T18:00:00Z',
          end_date: '2024-02-06T20:00:00Z',
          max_participants: 60,
          creator_id: 'user-999',
          created_at: '2024-01-31T00:00:00Z',
          updated_at: '2024-01-31T00:00:00Z',
          organizer: {
            username: 'apex_legend',
            avatar_url: null,
          },
          participants: [{ no_count: true }], // Missing count property
        },
      ];

      mockQuery.range.mockResolvedValueOnce({
        data: mockEvents,
        error: null,
        count: 1,
      });

      const result = await communityEventsService.getCommunityEvents();

      expect(result.success).toBe(true);
      expect(result.data?.items[0]?.participant_count).toBe(0);
    });

    it('should handle participants with null count', async () => {
      const mockEvents = [
        {
          id: 'event-5',
          title: 'Event with null count',
          description: 'Test event',
          game_type: 'Overwatch' as GameCategory,
          status: 'active' as EventStatus,
          start_date: '2024-02-07T18:00:00Z',
          end_date: '2024-02-07T20:00:00Z',
          max_participants: 12,
          creator_id: 'user-111',
          created_at: '2024-02-01T00:00:00Z',
          updated_at: '2024-02-01T00:00:00Z',
          organizer: {
            username: 'overwatch_pro',
            avatar_url: 'https://example.com/ow.jpg',
          },
          participants: [{ count: null }], // Null count
        },
      ];

      mockQuery.range.mockResolvedValueOnce({
        data: mockEvents,
        error: null,
        count: 1,
      });

      const result = await communityEventsService.getCommunityEvents();

      expect(result.success).toBe(true);
      expect(result.data?.items[0]?.participant_count).toBe(0);
    });

    it('should handle participants with undefined count', async () => {
      const mockEvents = [
        {
          id: 'event-6',
          title: 'Event with undefined count',
          description: 'Test event',
          game_type: 'League of Legends' as GameCategory,
          status: 'active' as EventStatus,
          start_date: '2024-02-08T18:00:00Z',
          end_date: '2024-02-08T20:00:00Z',
          max_participants: 10,
          creator_id: 'user-222',
          created_at: '2024-02-02T00:00:00Z',
          updated_at: '2024-02-02T00:00:00Z',
          organizer: {
            username: 'lol_champion',
            avatar_url: null,
          },
          participants: [{ count: undefined }], // Undefined count
        },
      ];

      mockQuery.range.mockResolvedValueOnce({
        data: mockEvents,
        error: null,
        count: 1,
      });

      const result = await communityEventsService.getCommunityEvents();

      expect(result.success).toBe(true);
      expect(result.data?.items[0]?.participant_count).toBe(0);
    });
  });

  describe('getCommunityEvents - Transformation (lines 100-107)', () => {
    it('should transform events with all data correctly', async () => {
      const mockEvent = {
        id: 'event-full',
        title: 'Full Event Data',
        description: 'Event with complete data',
        game_type: 'World of Warcraft' as GameCategory,
        status: 'upcoming' as EventStatus,
        start_date: '2024-03-01T18:00:00Z',
        end_date: '2024-03-01T22:00:00Z',
        max_participants: 40,
        organizer_id: 'user-333',
        created_at: '2024-02-15T00:00:00Z',
        updated_at: '2024-02-16T00:00:00Z',
        custom_field: 'extra_data',
        organizer: {
          username: 'wow_guildmaster',
          avatar_url: 'https://example.com/guild.jpg',
          extra_field: 'ignored',
        },
        participants: [{ count: 35, extra: 'data' }],
      };

      mockQuery.range.mockResolvedValueOnce({
        data: [mockEvent],
        error: null,
        count: 1,
      });

      const result = await communityEventsService.getCommunityEvents();

      expect(result.success).toBe(true);
      const transformed = result.data?.items[0];
      
      // Verify all fields are preserved
      expect(transformed?.id).toBe(mockEvent.id);
      expect(transformed?.title).toBe(mockEvent.title);
      expect(transformed?.description).toBe(mockEvent.description);
      expect(transformed?.game_type).toBe(mockEvent.game_type);
      expect(transformed?.status).toBe(mockEvent.status);
      expect(transformed?.start_date).toBe(mockEvent.start_date);
      expect(transformed?.end_date).toBe(mockEvent.end_date);
      expect(transformed?.max_participants).toBe(mockEvent.max_participants);
      expect(transformed?.organizer_id).toBe(mockEvent.organizer_id);
      expect(transformed?.created_at).toBe(mockEvent.created_at);
      expect(transformed?.updated_at).toBe(mockEvent.updated_at);
      expect((transformed as any)?.custom_field).toBe(mockEvent.custom_field);
      
      // Verify added fields
      expect(transformed?.organizer).toBe(mockEvent.organizer);
      expect(transformed?.participant_count).toBe(35);
    });

    it('should handle missing organizer gracefully', async () => {
      const mockEvent = {
        id: 'event-no-org',
        title: 'Event without organizer',
        description: 'No organizer data',
        game_type: 'Terraria' as GameCategory,
        status: 'active' as EventStatus,
        start_date: '2024-02-20T18:00:00Z',
        end_date: '2024-02-20T20:00:00Z',
        max_participants: 8,
        creator_id: 'deleted-user',
        created_at: '2024-02-10T00:00:00Z',
        updated_at: '2024-02-10T00:00:00Z',
        organizer: null,
        participants: [{ count: 4 }],
      };

      mockQuery.range.mockResolvedValueOnce({
        data: [mockEvent],
        error: null,
        count: 1,
      });

      const result = await communityEventsService.getCommunityEvents();

      expect(result.success).toBe(true);
      expect(result.data?.items[0]?.organizer).toBeUndefined();
      expect(result.data?.items[0]?.participant_count).toBe(4);
    });

    it('should handle undefined organizer', async () => {
      const mockEvent = {
        id: 'event-undef-org',
        title: 'Event with undefined organizer',
        description: 'Undefined organizer',
        game_type: 'Elden Ring' as GameCategory,
        status: 'active' as EventStatus,
        start_date: '2024-02-21T18:00:00Z',
        end_date: '2024-02-21T20:00:00Z',
        max_participants: 4,
        creator_id: 'user-444',
        created_at: '2024-02-11T00:00:00Z',
        updated_at: '2024-02-11T00:00:00Z',
        organizer: undefined,
        participants: [{ count: 2 }],
      };

      mockQuery.range.mockResolvedValueOnce({
        data: [mockEvent],
        error: null,
        count: 1,
      });

      const result = await communityEventsService.getCommunityEvents();

      expect(result.success).toBe(true);
      expect(result.data?.items[0]?.organizer).toBeUndefined();
      expect(result.data?.items[0]?.participant_count).toBe(2);
    });
  });

  describe('getCommunityEvents - Pagination (lines 61-75)', () => {
    it('should calculate pagination correctly for different pages', async () => {
      mockQuery.range.mockResolvedValueOnce({
        data: [],
        error: null,
        count: 100,
      });

      await communityEventsService.getCommunityEvents({}, 5, 20);

      // Page 5, pageSize 20: from = (5-1)*20 = 80, to = 80+20-1 = 99
      expect(mockQuery.range).toHaveBeenCalledWith(80, 99);
    });

    it('should handle first page correctly', async () => {
      mockQuery.range.mockResolvedValueOnce({
        data: [],
        error: null,
        count: 50,
      });

      await communityEventsService.getCommunityEvents({}, 1, 15);

      // Page 1, pageSize 15: from = 0, to = 14
      expect(mockQuery.range).toHaveBeenCalledWith(0, 14);
    });

    it('should handle large page sizes', async () => {
      mockQuery.range.mockResolvedValueOnce({
        data: [],
        error: null,
        count: 1000,
      });

      await communityEventsService.getCommunityEvents({}, 2, 100);

      // Page 2, pageSize 100: from = 100, to = 199
      expect(mockQuery.range).toHaveBeenCalledWith(100, 199);
    });
  });

  describe('getCommunityEvents - hasMore calculation', () => {
    it('should calculate hasMore correctly when more items exist', async () => {
      mockQuery.range.mockResolvedValueOnce({
        data: Array(10).fill({}), // 10 items
        error: null,
        count: 25, // Total 25 items
      });

      const result = await communityEventsService.getCommunityEvents({}, 1, 10);

      expect(result.success).toBe(true);
      expect(result.data?.hasMore).toBe(true); // 25 > 1 * 10
    });

    it('should calculate hasMore correctly when on last page', async () => {
      mockQuery.range.mockResolvedValueOnce({
        data: Array(5).fill({}), // 5 items
        error: null,
        count: 25, // Total 25 items
      });

      const result = await communityEventsService.getCommunityEvents({}, 3, 10);

      expect(result.success).toBe(true);
      expect(result.data?.hasMore).toBe(false); // 25 <= 3 * 10
    });

    it('should handle hasMore with null count', async () => {
      mockQuery.range.mockResolvedValueOnce({
        data: Array(10).fill({}),
        error: null,
        count: null,
      });

      const result = await communityEventsService.getCommunityEvents({}, 1, 10);

      expect(result.success).toBe(true);
      expect(result.data?.hasMore).toBe(false); // null defaults to 0
    });
  });
});