/**
 * Session Join React Query Hooks
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  sessionJoinService,
  type SessionJoinData,
} from '../../services/session-join.service';
import { notifications } from '@/lib/notifications';
import { useRouter } from 'next/navigation';

/**
 * Get session details for joining
 */
export function useSessionJoinDetailsQuery(sessionId: string, enabled = true) {
  return useQuery({
    queryKey: ['sessionJoin', 'details', sessionId],
    queryFn: () => sessionJoinService.getSessionJoinDetails(sessionId),
    enabled: enabled && !!sessionId,
    staleTime: 30 * 1000, // 30 seconds
    retry: (failureCount, error: Error) => {
      // Don't retry if session not found
      if (error?.message?.includes('not found')) {
        return false;
      }
      return failureCount < 3;
    },
    select: (data) => data.details,
  });
}

/**
 * Check if user is already in session
 */
export function useUserInSessionQuery(sessionId: string, enabled = true) {
  return useQuery({
    queryKey: ['sessionJoin', 'userStatus', sessionId],
    queryFn: () => sessionJoinService.checkUserInSession(sessionId),
    enabled: enabled && !!sessionId,
    staleTime: 60 * 1000, // 1 minute
    select: (data) => ({
      isInSession: data.isInSession,
      player: data.player,
    }),
  });
}

/**
 * Get available colors for session
 */
export function useAvailableColorsQuery(sessionId: string, enabled = true) {
  return useQuery({
    queryKey: ['sessionJoin', 'colors', sessionId],
    queryFn: () => sessionJoinService.getAvailableColors(sessionId),
    enabled: enabled && !!sessionId,
    staleTime: 30 * 1000, // 30 seconds
    select: (data) => ({
      available: data.availableColors,
      used: data.usedColors,
    }),
  });
}

/**
 * Join a session mutation
 */
export function useSessionJoinMutation() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: SessionJoinData) => sessionJoinService.joinSession(data),
    onSuccess: (result, variables) => {
      if (result.error) {
        notifications.error(result.error);
        return;
      }
      
      if (result.player) {
        notifications.success('Successfully joined session!');
        
        // Invalidate related queries
        queryClient.invalidateQueries({ 
          queryKey: ['sessionJoin', 'userStatus', variables.sessionId] 
        });
        queryClient.invalidateQueries({ 
          queryKey: ['sessionJoin', 'colors', variables.sessionId] 
        });
        queryClient.invalidateQueries({ 
          queryKey: ['sessions', 'players', variables.sessionId] 
        });
        
        // Navigate to session
        router.push(`/play-area/session/${variables.sessionId}`);
      }
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to join session';
      notifications.error(message);
    },
  });
}