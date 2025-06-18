/**
 * Service Response Pattern Tests
 * 
 * Tests for the core service layer pattern and error handling
 */

import { createServiceSuccess, createServiceError } from '@/lib/service-types';
import { createMockSupabaseClient, setupSupabaseMock, createSupabaseSuccessResponse, createSupabaseErrorResponse } from '@/lib/test/mocks/supabase.mock';
import { factories } from '@/lib/test/factories';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// Example service implementation following the pattern
class ExampleService {
  constructor(private supabase: SupabaseClient<Database>) {}

  async getUser(userId: string) {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        return createServiceError(error.message);
      }

      if (!data) {
        return createServiceError('User not found');
      }

      return createServiceSuccess(data);
    } catch (error) {
      return createServiceError(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  async createUser(userData: { email: string; username: string }) {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .insert(userData)
        .select()
        .single();

      if (error) {
        return createServiceError(error.message);
      }

      return createServiceSuccess(data);
    } catch (error) {
      return createServiceError(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  async updateUser(userId: string, updates: Partial<{ username: string; bio: string }>) {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        return createServiceError(error.message);
      }

      return createServiceSuccess(data);
    } catch (error) {
      return createServiceError(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  async listUsers(limit = 10, offset = 0) {
    try {
      const { data, error, count } = await this.supabase
        .from('users')
        .select('*', { count: 'exact' })
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      if (error) {
        return createServiceError(error.message);
      }

      return {
        ...createServiceSuccess(data || []),
        pagination: {
          page: Math.floor(offset / limit) + 1,
          limit,
          total: count || 0,
          hasMore: (count || 0) > offset + limit,
        },
      };
    } catch (error) {
      return createServiceError(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  async deleteUser(userId: string) {
    try {
      const { error } = await this.supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) {
        return createServiceError(error.message);
      }

      return createServiceSuccess(null);
    } catch (error) {
      return createServiceError(error instanceof Error ? error : new Error('Unknown error'));
    }
  }
}

describe('Service Response Pattern', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let service: ExampleService;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    service = new ExampleService(mockSupabase);
    setupSupabaseMock(mockSupabase);
  });

  describe('getUser', () => {
    it('should return success response with user data', async () => {
      const mockUser = factories.user();
      const mockFrom = mockSupabase.from as jest.Mock;
      
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue(createSupabaseSuccessResponse(mockUser)),
      });

      const result = await service.getUser(mockUser.id);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUser);
      expect(result.error).toBeNull();
      expect(mockFrom).toHaveBeenCalledWith('users');
    });

    it('should return error response on database error', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue(createSupabaseErrorResponse('User not found', 'PGRST116')),
      });

      const result = await service.getUser('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBe('User not found');
    });

    it('should handle null data', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue(createSupabaseSuccessResponse(null)),
      });

      const result = await service.getUser('some-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('should handle exceptions', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      mockFrom.mockImplementation(() => {
        throw new Error('Connection failed');
      });

      const result = await service.getUser('some-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection failed');
    });
  });

  describe('createUser', () => {
    it('should create user successfully', async () => {
      const userData = { email: 'test@example.com', username: 'testuser' };
      const mockUser = factories.user(userData);
      const mockFrom = mockSupabase.from as jest.Mock;
      
      mockFrom.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue(createSupabaseSuccessResponse(mockUser)),
      });

      const result = await service.createUser(userData);

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject(userData);
    });

    it('should handle duplicate user error', async () => {
      const userData = { email: 'existing@example.com', username: 'existing' };
      const mockFrom = mockSupabase.from as jest.Mock;
      
      mockFrom.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue(
          createSupabaseErrorResponse('Duplicate key value', '23505')
        ),
      });

      const result = await service.createUser(userData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Duplicate key value');
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const userId = 'user-123';
      const updates = { username: 'newusername', bio: 'New bio' };
      const mockUser = factories.user({ id: userId, ...updates });
      const mockFrom = mockSupabase.from as jest.Mock;
      
      mockFrom.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue(createSupabaseSuccessResponse(mockUser)),
      });

      const result = await service.updateUser(userId, updates);

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject(updates);
    });

    it('should handle non-existent user update', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      
      mockFrom.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue(
          createSupabaseErrorResponse('No rows found', 'PGRST116')
        ),
      });

      const result = await service.updateUser('non-existent', { bio: 'New bio' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('No rows found');
    });
  });

  describe('listUsers', () => {
    it('should list users with pagination', async () => {
      const mockUsers = [
        factories.user(),
        factories.user(),
        factories.user(),
      ];
      const mockFrom = mockSupabase.from as jest.Mock;
      
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockUsers,
          error: null,
          count: 25,
        }),
      });

      const result = await service.listUsers(10, 0);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect('pagination' in result && result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 25,
        hasMore: true,
      });
    });

    it('should handle empty results', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      });

      const result = await service.listUsers();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect('pagination' in result ? result.pagination?.total : 0).toBe(0);
      expect('pagination' in result ? result.pagination?.hasMore : false).toBe(false);
    });

    it('should calculate pagination correctly', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: Array(5).fill(null).map(() => factories.user()),
          error: null,
          count: 45,
        }),
      });

      const result = await service.listUsers(10, 20);

      expect('pagination' in result && result.pagination).toEqual({
        page: 3, // offset 20 / limit 10 + 1
        limit: 10,
        total: 45,
        hasMore: true, // 45 > 20 + 10
      });
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      
      mockFrom.mockReturnValue({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      const result = await service.deleteUser('user-123');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
      expect(result.error).toBeNull();
    });

    it('should handle delete constraints', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      
      mockFrom.mockReturnValue({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: { message: 'Foreign key constraint violation', code: '23503' },
        }),
      });

      const result = await service.deleteUser('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Foreign key constraint violation');
    });
  });

  describe('Error Handling Patterns', () => {
    it('should handle network errors consistently', async () => {
      const networkError = new Error('Network request failed');
      const mockFrom = mockSupabase.from as jest.Mock;
      
      mockFrom.mockImplementation(() => {
        throw networkError;
      });

      const results = await Promise.all([
        service.getUser('123'),
        service.createUser({ email: 'test@test.com', username: 'test' }),
        service.updateUser('123', { bio: 'test' }),
        service.listUsers(),
        service.deleteUser('123'),
      ]);

      results.forEach(result => {
        expect(result.success).toBe(false);
        expect(result.error).toBe('Network request failed');
      });
    });

    it('should preserve error details from Supabase', async () => {
      const detailedError = {
        message: 'new row violates row-level security policy',
        code: '42501',
        details: 'Failing row contains...',
        hint: 'Check your RLS policies',
      };

      const mockFrom = mockSupabase.from as jest.Mock;
      
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: detailedError,
        }),
      });

      const result = await service.getUser('123');

      expect(result.success).toBe(false);
      expect(result.error).toBe(detailedError.message);
    });
  });

  describe('Service Pattern Consistency', () => {
    it('should always return ServiceResponse shape', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      
      // Set up various scenarios
      const scenarios = [
        { data: factories.user(), error: null }, // Success
        { data: null, error: { message: 'Error' } }, // Error
        { data: [], error: null }, // Empty array
        { data: null, error: null }, // Null data
      ];

      for (const scenario of scenarios) {
        mockFrom.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue(scenario),
        });

        const result = await service.getUser('test');

        // Should always have these properties
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('error');
        
        // success should be boolean
        expect(typeof result.success).toBe('boolean');
        
        // Either data or error should be non-null
        expect(result.data !== null || result.error !== null).toBe(true);
      }
    });
  });
});