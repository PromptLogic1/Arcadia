/**
 * Example of proper type definitions for Supabase Realtime channel.on method
 * Based on @supabase/realtime-js type definitions
 */

import { createClient } from '@supabase/supabase-js';
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
  RealtimePostgresInsertPayload,
  RealtimePostgresUpdatePayload,
  RealtimePostgresDeletePayload,
  REALTIME_LISTEN_TYPES,
  REALTIME_POSTGRES_CHANGES_LISTEN_EVENT,
} from '@supabase/realtime-js';

// Example database types
interface User {
  id: string;
  email: string;
  created_at: string;
}

// Initialize Supabase client
const supabase = createClient('YOUR_SUPABASE_URL', 'YOUR_SUPABASE_ANON_KEY');

// Example 1: Listen to ALL changes (INSERT, UPDATE, DELETE)
const channel1 = supabase.channel('all-changes');
channel1.on(
  'postgres_changes' as `${REALTIME_LISTEN_TYPES.POSTGRES_CHANGES}`,
  {
    event: '*' as `${REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.ALL}`,
    schema: 'public',
    table: 'users',
  },
  (payload: RealtimePostgresChangesPayload<User>) => {
    // payload will be typed as union of Insert | Update | Delete payloads
    if (payload.eventType === 'INSERT') {
      console.log('New user:', payload.new); // payload.new is User
    } else if (payload.eventType === 'UPDATE') {
      console.log('Updated user:', payload.new); // payload.new is User
      console.log('Old values:', payload.old); // payload.old is Partial<User>
    } else if (payload.eventType === 'DELETE') {
      console.log('Deleted user:', payload.old); // payload.old is Partial<User>
    }
  }
);

// Example 2: Listen to INSERT only
const channel2 = supabase.channel('inserts-only');
channel2.on(
  'postgres_changes' as `${REALTIME_LISTEN_TYPES.POSTGRES_CHANGES}`,
  {
    event: 'INSERT' as `${REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.INSERT}`,
    schema: 'public',
    table: 'users',
  },
  (payload: RealtimePostgresInsertPayload<User>) => {
    // payload is specifically typed for INSERT
    console.log('New user:', payload.new); // payload.new is User
    // payload.old is {} for inserts
  }
);

// Example 3: Listen to UPDATE only
const channel3 = supabase.channel('updates-only');
channel3.on(
  'postgres_changes' as `${REALTIME_LISTEN_TYPES.POSTGRES_CHANGES}`,
  {
    event: 'UPDATE' as `${REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.UPDATE}`,
    schema: 'public',
    table: 'users',
    filter: 'email=eq.user@example.com', // Optional filter
  },
  (payload: RealtimePostgresUpdatePayload<User>) => {
    // payload is specifically typed for UPDATE
    console.log('Updated user:', payload.new); // payload.new is User
    console.log('Previous values:', payload.old); // payload.old is Partial<User>
  }
);

// Example 4: Listen to DELETE only
const channel4 = supabase.channel('deletes-only');
channel4.on(
  'postgres_changes' as `${REALTIME_LISTEN_TYPES.POSTGRES_CHANGES}`,
  {
    event: 'DELETE' as `${REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.DELETE}`,
    schema: 'public',
    table: 'users',
  },
  (payload: RealtimePostgresDeletePayload<User>) => {
    // payload is specifically typed for DELETE
    console.log('Deleted user:', payload.old); // payload.old is Partial<User>
    // payload.new is {} for deletes
  }
);

// Example 5: Proper pattern for a service using these types
export class RealtimeUserService {
  private channel: RealtimeChannel | null = null;

  subscribeToUserChanges(
    callback: (payload: RealtimePostgresChangesPayload<User>) => void
  ) {
    this.channel = supabase
      .channel('user-changes')
      .on(
        'postgres_changes' as `${REALTIME_LISTEN_TYPES.POSTGRES_CHANGES}`,
        {
          event: '*' as `${REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.ALL}`,
          schema: 'public',
          table: 'users',
        },
        callback
      )
      .subscribe();

    return this.channel;
  }

  unsubscribe() {
    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
    }
  }
}

// Example 6: Without explicit type imports (using string literals)
const channel6 = supabase.channel('example');
channel6.on(
  'postgres_changes',
  {
    event: '*',
    schema: 'public',
    table: 'users',
  },
  payload => {
    // TypeScript will infer the correct types based on the overload
    console.log(payload);
  }
);

/**
 * Key points for proper typing:
 *
 * 1. The first parameter is the event type: 'postgres_changes'
 * 2. The second parameter is the filter object with:
 *    - event: '*' | 'INSERT' | 'UPDATE' | 'DELETE'
 *    - schema: string (usually 'public')
 *    - table?: string (optional table name)
 *    - filter?: string (optional PostgreSQL filter)
 *
 * 3. The callback receives a payload typed based on the event:
 *    - For event: '*' -> RealtimePostgresChangesPayload<T> (union type)
 *    - For event: 'INSERT' -> RealtimePostgresInsertPayload<T>
 *    - For event: 'UPDATE' -> RealtimePostgresUpdatePayload<T>
 *    - For event: 'DELETE' -> RealtimePostgresDeletePayload<T>
 *
 * 4. Each payload has:
 *    - eventType: 'INSERT' | 'UPDATE' | 'DELETE'
 *    - schema: string
 *    - table: string
 *    - commit_timestamp: string
 *    - errors: string[]
 *    - new: T (full object for INSERT/UPDATE, {} for DELETE)
 *    - old: Partial<T> (empty for INSERT, partial for UPDATE/DELETE)
 */
