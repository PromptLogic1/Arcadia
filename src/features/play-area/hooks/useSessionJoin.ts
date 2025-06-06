/**
 * Session Join Hook
 *
 * Combines TanStack Query for server state with clean UI logic
 * following the new architecture pattern.
 */

import { useState, useCallback, useMemo } from 'react';
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

  const router = useRouter();

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

  // Derive the effective selected color
  const effectiveSelectedColor = useMemo(() => {
    // If user has selected a color, use it
    if (selectedColor) return selectedColor;
    
    // Otherwise, use the first available color
    if (colorData?.available && colorData.available.length > 0) {
      return colorData.available[0];
    }
    
    return '';
  }, [selectedColor, colorData?.available]);

  // Derive form validation state
  const isFormValid = useMemo(() => {
    const nameValid = playerName.trim().length >= 2;
    const colorValid = !!effectiveSelectedColor;
    return nameValid && colorValid;
  }, [playerName, effectiveSelectedColor]);

  // Handle form submission
  const handleJoinSession = useCallback(async () => {
    if (!isFormValid || !sessionDetails?.canJoin || !effectiveSelectedColor) {
      return;
    }

    const joinData: SessionJoinData = {
      sessionId,
      playerName: playerName.trim(),
      selectedColor: effectiveSelectedColor,
      ...(teamName.trim() && { teamName: teamName.trim() }),
    };

    try {
      await joinSessionMutation.mutateAsync(joinData);
      // Navigation will be handled by the mutation's onSuccess callback
    } catch (error) {
      // Error is handled by the mutation's onError callback
      // Just prevent unhandled promise rejection
    }
  }, [
    isFormValid,
    sessionDetails?.canJoin,
    sessionId,
    playerName,
    effectiveSelectedColor,
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

  // Handle redirect for users already in session
  if (userStatus?.isInSession && userStatus.player) {
    router.push(`/play-area/session/${sessionId}`);
    return {
      isLoading: true,
      sessionDetails: null,
      userStatus: null,
      availableColors: [],
      usedColors: [],
      playerName: '',
      selectedColor: '',
      teamName: '',
      isFormValid: false,
      isJoining: false,
      hasError: false,
      errorMessage: null,
      canJoin: false,
      currentPlayerCount: 0,
      maxPlayers: 0,
      setPlayerName: () => {},
      setSelectedColor: () => {},
      setTeamName: () => {},
      handleJoinSession: async () => {},
      sessionTitle: 'Session',
      gameType: 'All Games',
      difficulty: 'medium',
    };
  }

  return {
    // Server state
    sessionDetails,
    userStatus,
    availableColors: colorData?.available || [],
    usedColors: colorData?.used || [],

    // UI state
    playerName,
    selectedColor: effectiveSelectedColor,
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
