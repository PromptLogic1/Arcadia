# Supabase Mock Guide for Testing

## Overview

The proper way to mock Supabase client in tests is to use the centralized mock infrastructure provided in `/src/lib/test/mocks/supabase.mock.ts`. This ensures type safety and consistent behavior across all tests.

## Key Components

### 1. Import the Mock Utilities

```typescript
import {
  createMockSupabaseClient,
  MockSupabaseQueryBuilder,
  createSupabaseSuccessResponse,
  createSupabaseErrorResponse,
  setupSupabaseMock,
} from '@/lib/test/mocks/supabase.mock';
```

### 2. Create Mock Client

```typescript
const mockSupabaseClient = createMockSupabaseClient();
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

// In beforeEach
beforeEach(() => {
  jest.clearAllMocks();
  setupSupabaseMock(mockSupabaseClient);
  mockCreateClient.mockReturnValue(mockSupabaseClient);
});
```

### 3. Mock Query Responses

#### Success Response
```typescript
const mockData = { id: '123', name: 'Test' };
const mockQueryBuilder = new MockSupabaseQueryBuilder(mockData);
mockSupabaseClient.from = jest.fn().mockReturnValue(mockQueryBuilder);
```

#### Error Response
```typescript
const error = { message: 'Not found', code: 'PGRST116' };
const mockQueryBuilder = new MockSupabaseQueryBuilder(null, error);
mockSupabaseClient.from = jest.fn().mockReturnValue(mockQueryBuilder);
```

#### Throwing Errors
```typescript
mockSupabaseClient.from = jest.fn().mockImplementation(() => {
  throw new Error('Network error');
});
```

### 4. Spy on Query Builder Methods

```typescript
const mockQueryBuilder = new MockSupabaseQueryBuilder(mockData);
const eqSpy = jest.spyOn(mockQueryBuilder, 'eq');
const orSpy = jest.spyOn(mockQueryBuilder, 'or');

// Later in assertions
expect(eqSpy).toHaveBeenCalledWith('column', 'value');
expect(orSpy).toHaveBeenCalledWith('filter.string');
```

## Benefits

1. **Type Safety**: All mocks maintain proper Supabase types
2. **Consistency**: Same mock behavior across all tests
3. **Chainable Methods**: Supports Supabase's fluent API
4. **Error Handling**: Built-in support for success/error responses
5. **Extensibility**: Easy to add new methods to the mock

## Example Test

```typescript
it('returns data successfully', async () => {
  const mockData = { id: '123', name: 'Test' };
  const mockQueryBuilder = new MockSupabaseQueryBuilder(mockData);
  mockSupabaseClient.from = jest.fn().mockReturnValue(mockQueryBuilder);

  const result = await myService.getData();

  expect(result.success).toBe(true);
  expect(result.data).toEqual(mockData);
  expect(mockSupabaseClient.from).toHaveBeenCalledWith('table_name');
});
```

## Migration from Custom Mocks

If you have tests using custom mock objects, replace them with the centralized mock:

**Before:**
```typescript
const mockSupabase = {
  from: jest.fn(),
  select: jest.fn(),
  eq: jest.fn(),
  // ... manual chaining setup
};
```

**After:**
```typescript
const mockSupabaseClient = createMockSupabaseClient();
const mockQueryBuilder = new MockSupabaseQueryBuilder(data);
mockSupabaseClient.from = jest.fn().mockReturnValue(mockQueryBuilder);
```

This approach eliminates manual mock chaining and provides better type safety.