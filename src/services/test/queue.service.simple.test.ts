/**
 * @jest-environment node
 */

// Simple test to verify mocking works
jest.mock('@/lib/supabase', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  log: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

import { queueService } from '../queue.service';
import { createClient } from '@/lib/supabase';
import { log } from '@/lib/logger';

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockLog = log as jest.Mocked<typeof log>;

describe('queueService - Simple Test', () => {
  let mockSupabaseClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    };

    mockCreateClient.mockReturnValue(mockSupabaseClient);
  });

  it('should handle user already in queue (simple test)', async () => {
    const existingEntry = {
      id: 'existing-queue-entry',
      user_id: 'test-user-123',
      status: 'waiting',
    };

    mockSupabaseClient.single.mockResolvedValueOnce({
      data: existingEntry,
      error: null,
    });

    const result = await queueService.joinQueue({
      user_id: 'test-user-123',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('User already in queue');
    expect(mockLog.warn).toHaveBeenCalledWith('User already in queue', {
      metadata: { userId: 'test-user-123' },
    });
  });

  it('should successfully join queue when no existing user', async () => {
    // Mock no existing entry (PGRST116 = no rows found)
    mockSupabaseClient.single.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST116', message: 'No rows found' },
    });

    // Mock successful insertion
    const expectedEntry = {
      id: 'queue-entry-new',
      user_id: 'test-user-123',
      status: 'waiting',
    };

    mockSupabaseClient.single.mockResolvedValueOnce({
      data: expectedEntry,
      error: null,
    });

    const result = await queueService.joinQueue({
      user_id: 'test-user-123',
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(expectedEntry);
  });
});