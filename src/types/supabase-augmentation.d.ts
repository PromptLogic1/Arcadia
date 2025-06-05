// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { RealtimeChannel } from '@supabase/supabase-js';

declare module '@supabase/supabase-js' {
  interface RealtimeChannel {
    on(
      event: 'postgres_changes',
      filter: {
        event: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
        schema: string;
        table: string;
        filter?: string;
      },
      callback: (payload: unknown) => void
    ): RealtimeChannel;
  }
}