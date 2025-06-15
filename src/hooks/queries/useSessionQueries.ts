/**
 * Session React Query Hooks
 */

import { useQuery } from '@tanstack/react-query';
import { sessionService } from '@/services/session.service';

/**
 * Get session stats for metadata
 */
export function useSessionStatsQuery(sessionId: string, enabled = true) {
  return useQuery({
    queryKey: ['session', 'stats', sessionId],
    queryFn: () => sessionService.getSessionStats(sessionId),
    enabled: enabled && !!sessionId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    select: response => (response.success ? response.data : null),
  });
}

/**
 * Get full session details with board and players
 */
export function useSessionDetailsQuery(sessionId: string, enabled = true) {
  return useQuery({
    queryKey: ['session', 'details', sessionId],
    queryFn: () => sessionService.getSessionWithDetails(sessionId),
    enabled: enabled && !!sessionId,
    staleTime: 30 * 1000, // 30 seconds - more frequent updates for game sessions
    select: response => (response.success ? response.data : null),
  });
}
