/**
 * Session Join Hook
 *
 * Combines TanStack Query for server state with clean UI logic
 * following the new architecture pattern.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  useSessionJoinDetailsQuery,
  useUserInSessionQuery,
  useAvailableColorsQuery,
  useSessionJoinMutation,
} from '@/hooks/queries/useSessionJoinQueries';
import { useRouter } from 'next/navigation';
import type { SessionJoinData } from '@/src/services/session-join.service';

interface UseSessionJoinProps {
  sessionId: string;
}

export function useSessionJoin({ sessionId }: UseSessionJoinProps) {
  // UI state
  const [playerName, setPlayerName] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [teamName, setTeamName] = useState('');
  const [isFormValid, setIsFormValid] = useState(false);

  const router = useRouter();
  const isMountedRef = useRef(true);

  // TanStack Query hooks for server state
  const {
    data: sessionDetails,
    isLoading: isLoadingSession,
    error: sessionError,
  } = useSessionJoinDetailsQuery(sessionId);

  const { data: userStatus, isLoading: isCheckingUser } =
    useUserInSessionQuery(sessionId);

  const { data: colorData, isLoading: isLoadingColors } =
    useAvailableColorsQuery(sessionId);

  // Mutations
  const joinSessionMutation = useSessionJoinMutation();

  // Track component mounted state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Auto-select first available color
  useEffect(() => {
    if (
      colorData?.available &&
      colorData.available.length > 0 &&
      !selectedColor &&
      isMountedRef.current
    ) {
      setSelectedColor(colorData.available[0] || '');
    }
  }, [colorData?.available, selectedColor]);

  // Form validation
  useEffect(() => {
    const nameValid = playerName.trim().length >= 2;
    const colorValid = !!selectedColor;

    setIsFormValid(nameValid && colorValid);
  }, [playerName, selectedColor]);

  // Redirect if user is already in session
  useEffect(() => {
    if (userStatus?.isInSession && userStatus.player && isMountedRef.current) {
      router.push(`/play-area/session/${sessionId}`);
    }
  }, [userStatus?.isInSession, userStatus?.player, sessionId, router]);

  // Handle form submission
  const handleJoinSession = useCallback(async () => {
    if (!isFormValid || !sessionDetails?.canJoin) {
      return;
    }

    // Don't proceed if component is unmounted
    if (!isMountedRef.current) {
      return;
    }

    const joinData: SessionJoinData = {
      sessionId,
      playerName: playerName.trim(),
      selectedColor,
      teamName: teamName.trim() || undefined,
    };

    try {
      await joinSessionMutation.mutateAsync(joinData);
    } catch (error) {
      // Error is handled by the mutation's onError callback
      // Just prevent unhandled promise rejection
      if (!isMountedRef.current) {
        return;
      }
    }
  }, [
    isFormValid,
    sessionDetails?.canJoin,
    sessionId,
    playerName,
    selectedColor,
    teamName,
    joinSessionMutation,
  ]);

  // Handle color selection with validation
  const handleColorChange = useCallback(
    (color: string) => {
      if (colorData?.available.includes(color)) {
        setSelectedColor(color);
      }
    },
    [colorData?.available]
  );

  // Derived state
  const isLoading = isLoadingSession || isCheckingUser || isLoadingColors;
  const hasError = !!sessionError;
  const errorMessage =
    sessionError || (!sessionDetails?.canJoin ? sessionDetails?.reason : null);
  const isJoining = joinSessionMutation.isPending;

  return {
    // Server state
    sessionDetails,
    userStatus,
    availableColors: colorData?.available || [],
    usedColors: colorData?.used || [],

    // UI state
    playerName,
    selectedColor,
    teamName,
    isFormValid,

    // Loading states
    isLoading,
    isJoining,
    hasError,
    errorMessage,

    // Derived state
    canJoin: sessionDetails?.canJoin || false,
    currentPlayerCount: sessionDetails?.currentPlayerCount || 0,
    maxPlayers: sessionDetails?.session.settings?.max_players || 4,

    // Actions
    setPlayerName,
    setSelectedColor: handleColorChange,
    setTeamName,
    handleJoinSession,

    // Session info
    sessionTitle: 'Session',
    gameType: 'All Games',
    difficulty: 'medium',
  };
}
