/**
 * Modern Bingo Board Edit Hook
 * 
 * This replaces the legacy useBingoBoardEdit hook using the TanStack Query + Zustand pattern.
 * - Service layer for all API calls
 * - TanStack Query for server state management
 * - Zustand for UI state only
 * - Proper error handling and loading states
 * - Type safety throughout
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useShallow as _useShallow } from 'zustand/react/shallow';
import type { Tables, Enums, CompositeTypes } from '@/types/database-generated';
import {
  createEmptyBingoCard,
  createNewBingoCard,
  isValidUUID,
} from '@/src/types';

// Type aliases from database-generated
type BingoBoard = Tables<'bingo_boards'>;
type BingoCard = Tables<'bingo_cards'>;
type Difficulty = Enums<'difficulty_level'>;
type BoardCell = CompositeTypes<'board_cell'>;
import { useBoardEditOperations } from '@/hooks/queries/useBingoBoardEditQueries';
import { useAuth } from '@/lib/stores/auth-store';
import { logger } from '@/src/lib/logger';
import { notifications } from '@/src/lib/notifications';
// Template imports removed as they're not used in this hook
import type { CardInsertData, BoardEditData } from '../../../services/bingo-board-edit.service';

export interface FormData {
  board_title: string;
  board_description: string;
  board_tags: string[];
  board_difficulty: Difficulty;
  is_public: boolean;
}

interface BoardEditReturn {
  // Loading states
  isLoadingBoard: boolean;
  isLoadingCards: boolean;
  isSaving: boolean;
  
  // Data states
  error?: string | null;
  currentBoard: BingoBoard | null;
  formData: FormData | null;
  gridCards: BingoCard[];
  privateCards: BingoCard[];
  gridSize: number;
  
  // Form state
  fieldErrors: Record<string, string>;
  editingCard: { card: BingoCard; index: number } | null;
  
  // Actions - form management
  setFormData: (data: FormData | ((prev: FormData | null) => FormData | null)) => void;
  updateFormField: (field: string, value: FieldValue) => void;
  setEditingCard: (card: { card: BingoCard; index: number } | null) => void;
  
  // Actions - card management
  setGridCards: (cards: BingoCard[]) => void;
  placeCardInGrid: (card: BingoCard, index: number) => void;
  createNewCard: (formData: Partial<BingoCard>, index: number) => Promise<void>;
  createPrivateCard: (formData: Partial<BingoCard>) => Promise<BingoCard | null>;
  updateExistingCard: (updates: Partial<BingoCard>, index: number) => Promise<void>;
  
  // Actions - board operations
  handleSave: () => Promise<boolean>;
  initializeBoard: () => Promise<void>;
  
  // Validation
  validateBingoCardField: (field: string, value: string | string[] | boolean) => string | null;
}

type FieldKey = 'board_title' | 'board_description' | 'board_difficulty' | 'is_public' | 'board_tags';
type FieldValue = string | number | boolean | string[];

export function useBingoBoardEdit(boardId: string): BoardEditReturn {
  // TanStack Query for server state management
  const {
    board,
    cards: _cards,
    gridCards: serverGridCards,
    privateCards: serverPrivateCards,
    isLoading,
    error: queryError,
    saveCards,
    updateBoard,
    createCard,
    updateCard: _updateCard,
    isSavingCards: _isSavingCards,
    isUpdatingBoard,
    isCreatingCard: _isCreatingCard,
    isUpdatingCard: _isUpdatingCard,
    isMutating,
    refetch,
  } = useBoardEditOperations(boardId);

  // Auth context
  const { authUser } = useAuth();
  const userData = useMemo(
    () => (authUser ? { id: authUser.id } : null),
    [authUser]
  );

  // Local UI state (not managed by Zustand since it's component-specific)
  const [formData, setFormData] = useState<FormData | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [editingCard, setEditingCard] = useState<{
    card: BingoCard;
    index: number;
  } | null>(null);
  const [gridCards, setGridCards] = useState<BingoCard[]>([]);
  const [privateCards, setPrivateCards] = useState<BingoCard[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize form data when board loads
  useEffect(() => {
    if (board && !formData) {
      setFormData({
        board_title: board.title,
        board_description: board.description || '',
        board_difficulty: board.difficulty,
        is_public: board.is_public || false,
        board_tags: [],  // tags not in database schema
      });
    }
  }, [board, formData]);

  // Helper function to initialize from board state (legacy data)
  const initializeFromBoardState = useCallback(async (board: BingoBoard) => {
    if (!board.board_state) return;

    const gridCards: BingoCard[] = board.board_state.map((cell: BoardCell) => {
      // For cells with text but no valid card ID, create a card from the text
      if (cell.text && cell.text.trim() !== '') {
        return createNewBingoCard(
          {
            title: cell.text,
            description: null,
            difficulty: 'medium',
            tags: [],
            is_public: false,
            votes: 0,
          },
          board.game_type,
          userData?.id || board.creator_id || ''
        );
      }
      // Return empty card for empty cells
      return createEmptyBingoCard(
        board.game_type,
        userData?.id || board.creator_id || ''
      );
    });

    setGridCards(gridCards);
  }, [userData?.id]);

  // Helper function to initialize template cards
  const initializeTemplateCards = useCallback(async (board: BingoBoard) => {
    // Create empty grid based on board size
    const gridSize = board.size || 25;
    const emptyCards: BingoCard[] = Array.from({ length: gridSize }, () =>
      createEmptyBingoCard(board.game_type, userData?.id || board.creator_id || '')
    );
    setGridCards(emptyCards);
  }, [userData?.id]);

  // Initialize cards from server data or templates
  const initializeFromServerData = useCallback(async () => {
    if (!board) return;

    try {
      if (serverGridCards && serverGridCards.length > 0) {
        // Use server-provided grid cards
        setGridCards(serverGridCards);
      } else if (board.board_state && board.board_state.length > 0) {
        // Initialize from board state (legacy data)
        await initializeFromBoardState(board);
      } else {
        // New board - initialize with templates
        await initializeTemplateCards(board);
      }

      if (serverPrivateCards) {
        setPrivateCards(serverPrivateCards);
      }
    } catch (error) {
      logger.error('Failed to initialize board data', error as Error, {
        metadata: { hook: 'useBingoBoardEdit', boardId },
      });
    }
  }, [board, serverGridCards, serverPrivateCards, boardId, initializeFromBoardState, initializeTemplateCards]);

  // Initialize grid and private cards from server data
  useEffect(() => {
    if (board && !isInitialized) {
      initializeFromServerData();
      setIsInitialized(true);
    }
  }, [board, isInitialized, initializeFromServerData]);

  // Derived states
  const isLoadingBoard = isLoading;
  const isLoadingCards = isLoading;
  const isSaving = isMutating || isUpdatingBoard;
  const currentBoard = board || null;
  const gridSize = board?.size || 0;
  const error = queryError ? 
    (queryError instanceof Error ? queryError.message : 'An error occurred') 
    : null;


  // Validation functions
  const validateBingoBoardField = useCallback(
    (field: string, value: FieldValue): string | null => {
      switch (field) {
        case 'board_title':
          if (
            typeof value === 'string' &&
            (value.length < 3 || value.length > 50)
          ) {
            return 'Title must be between 3 and 50 characters';
          }
          break;
        case 'board_description':
          if (typeof value === 'string' && value.length > 255) {
            return 'Description cannot exceed 255 characters';
          }
          break;
        case 'board_tags':
          if (Array.isArray(value) && value.length > 5) {
            return 'Maximum of 5 tags allowed';
          }
          break;
      }
      return null;
    },
    []
  );

  const validateBingoCardField = useCallback(
    (field: string, value: string | string[] | boolean): string | null => {
      switch (field) {
        case 'title':
          if (
            typeof value === 'string' &&
            (value.length === 0 || value.length > 50)
          ) {
            return 'Content must be between 1 and 50 characters';
          }
          break;
        case 'description':
          if (typeof value === 'string' && value.length > 255) {
            return 'Explanation cannot exceed 255 characters';
          }
          break;
        case 'tags':
          if (Array.isArray(value) && value.length > 5) {
            return 'Maximum of 5 tags allowed';
          }
          break;
      }
      return null;
    },
    []
  );

  // Form management
  const updateFormField = useCallback(
    (field: string, value: FieldValue) => {
      const error = validateBingoBoardField(field, value);

      setFieldErrors(prev => {
        const newErrors = { ...prev };
        if (error) {
          newErrors[field as FieldKey] = error;
        } else {
          delete newErrors[field as FieldKey];
        }
        return newErrors;
      });

      setFormData(prev => (prev ? { ...prev, [field]: value } : null));
    },
    [validateBingoBoardField]
  );

  // Card management actions
  const createPrivateCard = useCallback(async (
    updates: Partial<BingoCard>
  ): Promise<BingoCard | null> => {
    try {
      if (!currentBoard || !userData) {
        throw new Error('You must be logged in to create cards');
      }

      const cardData: CardInsertData = {
        title: updates.title || '',
        description: updates.description || null,
        game_type: currentBoard.game_type,
        difficulty: updates.difficulty || currentBoard.difficulty,
        tags: updates.tags || [],
        creator_id: userData.id,
        is_public: false, // Private cards are always private
        // Note: requirements and reward_type not in current database schema
      };

      const result = await createCard(cardData);
      
      if (result.card) {
        // Add to local state immediately (optimistic update)
        setPrivateCards(prev => result.card ? [...prev, result.card] : prev);
        
        logger.debug('Created new private card', {
          metadata: { hook: 'useBingoBoardEdit', cardId: result.card.id },
        });
        
        return result.card;
      } else if (result.error) {
        throw new Error(result.error);
      }

      return null;
    } catch (error) {
      logger.error('Failed to create new private card', error as Error, {
        metadata: {
          hook: 'useBingoBoardEdit',
          currentBoardId: currentBoard?.id,
          updates,
        },
      });
      notifications.error('Failed to create card', {
        description: 'Please try again or contact support.',
      });
      return null;
    }
  }, [currentBoard, userData, createCard]);

  const createNewCard = useCallback(async (
    updates: Partial<BingoCard>, 
    index: number
  ) => {
    try {
      if (!currentBoard || !userData) {
        throw new Error('You must be logged in to create cards');
      }

      // Create a local card for immediate UI update
      const newCard = createNewBingoCard(
        updates,
        currentBoard.game_type,
        userData.id
      );

      if (index >= 0) {
        const updatedCards = [...gridCards];
        updatedCards[index] = newCard;
        setGridCards(updatedCards);
      }
      
      logger.debug('Created new card', {
        metadata: { hook: 'useBingoBoardEdit', cardId: newCard.id, index },
      });
    } catch (error) {
      logger.error('Failed to create new card', error as Error, {
        metadata: {
          hook: 'useBingoBoardEdit',
          currentBoardId: currentBoard?.id,
          updates,
          index,
        },
      });
      notifications.error('Failed to create card', {
        description: 'Please try again or contact support.',
      });
    }
  }, [currentBoard, userData, gridCards]);

  const updateExistingCard = useCallback(async (
    updates: Partial<BingoCard>,
    index: number
  ) => {
    try {
      if (!currentBoard) throw new Error('Board not found');
      if (!updates.id) throw new Error('Card ID is required');

      const currentCard = gridCards[index];
      if (!currentCard) throw new Error('Card not found');

      const updatedCard: BingoCard = {
        ...currentCard,
        ...updates,
        updated_at: new Date().toISOString(),
      };

      if (index >= 0) {
        const updatedCards = [...gridCards];
        updatedCards[index] = updatedCard;
        setGridCards(updatedCards);
      }
      
      logger.debug('Updated existing card in grid', {
        metadata: { hook: 'useBingoBoardEdit', cardId: updates.id, index },
      });
    } catch (error) {
      logger.error('Failed to update existing card', error as Error, {
        metadata: { hook: 'useBingoBoardEdit', updates, index },
      });
      notifications.error('Failed to update card', {
        description: 'Please try again or contact support.',
      });
    }
  }, [currentBoard, gridCards]);

  const placeCardInGrid = useCallback((card: BingoCard, index: number) => {
    try {
      const updatedCards = [...gridCards];
      updatedCards[index] = card;
      setGridCards(updatedCards);
      logger.debug('Placed card in grid', {
        metadata: { hook: 'useBingoBoardEdit', cardId: card.id, index },
      });
    } catch (error) {
      logger.error('Failed to place card in grid', error as Error, {
        metadata: { hook: 'useBingoBoardEdit', index },
      });
      notifications.error('Failed to place card', {
        description: 'Please try again or contact support.',
      });
    }
  }, [gridCards]);

  // Save operation
  const handleSave = useCallback(async (): Promise<boolean> => {
    if (!currentBoard || !formData || !userData) return false;

    try {
      // Convert grid cards to board cells for board_state
      const boardCells: BoardCell[] = gridCards.map((card) => ({
        cell_id: isValidUUID(card.id) ? card.id : null,
        text: card.title || null,
        colors: null,
        completed_by: null,
        blocked: false,
        is_marked: false,
        version: (currentBoard.version || 0) + 1,
        last_updated: Date.now(),
        last_modified_by: userData.id,
      }));

      // First, save any new cards that have temporary IDs
      const cardsToSave = [
        ...privateCards.filter(card => card.id.startsWith('temp-')),
        ...gridCards.filter(
          card => card.id.startsWith('temp-') && card.title.trim() !== ''
        ),
      ];

      // Remove duplicates based on title
      const uniqueCardsToSave = cardsToSave.filter(
        (card, index, self) =>
          index ===
          self.findIndex(
            c => c.title === card.title && c.game_type === card.game_type
          )
      );

      if (uniqueCardsToSave.length > 0) {
        const cardInsertData: CardInsertData[] = uniqueCardsToSave
          .filter(card => card.title.trim())
          .map(card => ({
            title: card.title,
            description: card.description || null,
            game_type: card.game_type,
            difficulty: card.difficulty,
            tags: card.tags || [],
            creator_id: userData.id,
            is_public: card.is_public || false,
            // Note: requirements and reward_type not in current database schema
          }));

        if (cardInsertData.length > 0) {
          const saveResult = await saveCards(cardInsertData);
          
          if (saveResult.error) {
            throw new Error(saveResult.error);
          }

          // Update local state with saved cards
          const savedCards = saveResult.savedCards;
          
          // Update grid cards with new IDs
          const updatedGridCards = gridCards.map(card => {
            if (card.id?.startsWith('temp-')) {
              const savedCard = savedCards.find(
                sc => sc.title === card.title && sc.game_type === card.game_type
              );
              return savedCard || card;
            }
            return card;
          });
          setGridCards(updatedGridCards);

          // Update private cards with new IDs
          setPrivateCards(prev => 
            prev.map(card => {
              if (card.id.startsWith('temp-')) {
                const saved = savedCards.find(
                  sc => sc.title === card.title && sc.game_type === card.game_type
                );
                return saved || card;
              }
              return card;
            })
          );
        }
      }

      // Update the board
      const boardData: BoardEditData = {
        title: formData.board_title,
        description: formData.board_description || null,
        difficulty: formData.board_difficulty,
        is_public: formData.is_public,
        board_state: boardCells,
      };

      const updateResult = await updateBoard(boardData, currentBoard.version || 0);
      
      if (updateResult.error) {
        throw new Error(updateResult.error);
      }

      notifications.success('Board saved successfully!');
      logger.info('Board saved successfully', {
        metadata: {
          hook: 'useBingoBoardEdit',
          boardId: currentBoard.id,
        },
      });

      return true;
    } catch (error) {
      logger.error('Failed to save board changes', error as Error, {
        metadata: {
          hook: 'useBingoBoardEdit',
          boardId: currentBoard.id,
          formData,
        },
      });
      notifications.error('Failed to save board', {
        description: error instanceof Error ? error.message : 'Please try again or contact support.',
      });
      return false;
    }
  }, [currentBoard, formData, userData, gridCards, privateCards, saveCards, updateBoard]);

  // Initialize board (refresh data)
  const initializeBoard = useCallback(async () => {
    try {
      setIsInitialized(false);
      await refetch();
      logger.info('Board data refreshed', {
        metadata: { hook: 'useBingoBoardEdit', boardId },
      });
    } catch (error) {
      logger.error('Failed to refresh board data', error as Error, {
        metadata: { hook: 'useBingoBoardEdit', boardId },
      });
      notifications.error('Failed to refresh board data', {
        description: 'Please try again or contact support.',
      });
    }
  }, [refetch, boardId]);

  return {
    // Loading states
    isLoadingBoard,
    isLoadingCards,
    isSaving,
    
    // Data states
    error,
    currentBoard,
    formData,
    gridCards,
    privateCards,
    gridSize,
    
    // Form state
    fieldErrors,
    editingCard,
    
    // Actions - form management
    setFormData,
    updateFormField,
    setEditingCard,
    
    // Actions - card management
    setGridCards,
    placeCardInGrid,
    createNewCard,
    createPrivateCard,
    updateExistingCard,
    
    // Actions - board operations
    handleSave,
    initializeBoard,
    
    // Validation
    validateBingoCardField,
  };
}