import { useState, useCallback, useEffect } from 'react';
import type { BingoBoard, BingoCard, Difficulty } from '@/types';
// TODO: Replace with proper hooks from centralized system
// import { useBingoBoards, useBingoBoardsActions } from '@/src/lib/stores'
// import { useBingoCards } from '@/src/lib/stores'
// import { useAuth } from '@/src/lib/stores'
import { logger } from '@/src/lib/logger';
import { notifications } from '@/src/lib/notifications';
import { getTemplateCards, templateToBingoCard } from '../data/templates';

export interface FormData {
  board_title: string;
  board_description: string;
  board_tags: string[];
  board_difficulty: Difficulty;
  is_public: boolean;
}

interface BoardEditReturn {
  isLoadingBoard: boolean;
  isLoadingCards: boolean;
  error?: string | null;
  currentBoard: BingoBoard | null;
  formData: FormData | null;
  setFormData: (
    data: FormData | ((prev: FormData | null) => FormData | null)
  ) => void;
  fieldErrors: Record<string, string>;
  gridCards: BingoCard[];
  setGridCards: (cards: BingoCard[]) => void;
  cards: BingoCard[];
  privateCards: BingoCard[];
  updateFormField: (field: string, value: FieldValue) => void;
  handleSave: () => Promise<boolean>;
  placeCardInGrid: (card: BingoCard, index: number) => void;
  createNewCard: (formData: Partial<BingoCard>, index: number) => Promise<void>;
  createPrivateCard: (formData: Partial<BingoCard>) => Promise<BingoCard | null>;
  updateExistingCard: (
    updates: Partial<BingoCard>,
    index: number
  ) => Promise<void>;
  gridSize: number;
  editingCard: { card: BingoCard; index: number } | null;
  setEditingCard: (card: { card: BingoCard; index: number } | null) => void;
  validateBingoCardField: (
    field: string,
    value: string | string[] | boolean
  ) => string | null;
  initializeBoard: () => Promise<void>;
}

type FieldKey = 'title' | 'description' | 'difficulty' | 'is_public';
type FieldValue = string | number | boolean | string[];

export function useBingoBoardEdit(boardId: string): BoardEditReturn {
  // State
  const [isLoadingBoard, setIsLoadingBoard] = useState(true);
  const [isLoadingCards, setIsLoadingCards] = useState(true);
  const [formData, setFormData] = useState<FormData | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [editingCard, setEditingCard] = useState<{
    card: BingoCard;
    index: number;
  } | null>(null);
  const [gridCards, setGridCards] = useState<BingoCard[]>([]);
  const [currentBoard, setCurrentBoard] = useState<BingoBoard | null>(null);
  const [cards] = useState<BingoCard[]>([]);
  const [privateCards, setPrivateCards] = useState<BingoCard[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Mock user data - TODO: Replace with real auth hook
  const userData = { id: 'mock-user-id' };

  useEffect(() => {
    if (currentBoard) {
      setFormData({
        board_title: currentBoard.title,
        board_description: currentBoard.description || '',
        board_difficulty: currentBoard.difficulty,
        is_public: currentBoard.is_public || false,
        board_tags: [],
      });
    }
  }, [currentBoard]);

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

  const createPrivateCard = async (updates: Partial<BingoCard>): Promise<BingoCard | null> => {
    try {
      if (!currentBoard || !userData?.id) {
        throw new Error('Board or user not found');
      }

      // Create a basic card structure using correct schema
      const newCard: BingoCard = {
        id: `card-${Date.now()}`, // Temporary ID generation
        title: updates.title || '',
        description: updates.description || null,
        difficulty: updates.difficulty || 'medium',
        game_type: currentBoard.game_type,
        tags: updates.tags || [],
        creator_id: userData.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_public: false, // Private cards are always private
        votes: 0,
      };

      // Add to private cards list
      setPrivateCards(prev => [...prev, newCard]);
      
      logger.debug('Created new private card', {
        metadata: { hook: 'useBingoBoardEdit', cardId: newCard.id },
      });
      
      return newCard;
    } catch (error) {
      logger.error('Failed to create new private card', error as Error, {
        metadata: {
          hook: 'useBingoBoardEdit',
          currentBoardId: currentBoard?.id,
          updates,
        },
      });
      setError(
        error instanceof Error ? error.message : 'Failed to create card'
      );
      notifications.error('Failed to create card', {
        description: 'Please try again or contact support.',
      });
      return null;
    }
  };

  const createNewCard = async (updates: Partial<BingoCard>, index: number) => {
    try {
      if (!currentBoard || !userData?.id) {
        throw new Error('Board or user not found');
      }

      // Create a basic card structure using correct schema
      const newCard: BingoCard = {
        id: `card-${Date.now()}`, // Temporary ID generation
        title: updates.title || '',
        description: updates.description || null,
        difficulty: updates.difficulty || 'medium',
        game_type: currentBoard.game_type,
        tags: updates.tags || [],
        creator_id: userData.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_public: updates.is_public || false,
        votes: 0,
      };

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
      setError(
        error instanceof Error ? error.message : 'Failed to create card'
      );
      notifications.error('Failed to create card', {
        description: 'Please try again or contact support.',
      });
    }
  };

  const updateExistingCard = async (
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
      setError(
        error instanceof Error ? error.message : 'Failed to update card'
      );
      notifications.error('Failed to update card', {
        description: 'Please try again or contact support.',
      });
    }
  };

  const placeCardInGrid = (card: BingoCard, index: number) => {
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
      setError(error instanceof Error ? error.message : 'Failed to place card');
      notifications.error('Failed to place card', {
        description: 'Please try again or contact support.',
      });
    }
  };

  const handleSave = useCallback(async () => {
    if (!currentBoard || !formData) return false;
    try {
      // TODO: Implement proper save logic with Supabase
      logger.info('Saving board changes', {
        metadata: {
          hook: 'useBingoBoardEdit',
          boardId: currentBoard.id,
          formData,
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
      setError(
        error instanceof Error ? error.message : 'Failed to update board'
      );
      notifications.error('Failed to save board', {
        description: 'Please try again or contact support.',
      });
      return false;
    }
  }, [currentBoard, formData]);

  const initializeBoard = useCallback(async () => {
    try {
      setIsLoadingBoard(true);
      setIsLoadingCards(true);

      // TODO: Replace with proper Supabase data loading
      logger.info('Initializing board for editing', {
        metadata: { hook: 'useBingoBoardEdit', boardId },
      });

      // Mock board data for now
      const mockBoard: BingoBoard = {
        id: boardId,
        title: 'New Gaming Bingo Board',
        description: 'Customize this template to create your perfect gaming challenge!',
        game_type: 'World of Warcraft',
        difficulty: 'medium',
        size: 5,
        is_public: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        creator_id: 'mock-user-id',
        board_state: null,
        bookmarked_count: null,
        cloned_from: null,
        settings: null,
        status: null,
        version: null,
        votes: null,
      };

      setCurrentBoard(mockBoard);
      
      // Initialize template cards for the grid
      await initializeTemplateCards(mockBoard);
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load board');
    } finally {
      setIsLoadingBoard(false);
      setIsLoadingCards(false);
    }
  }, [boardId]);

  const initializeTemplateCards = useCallback(async (board: BingoBoard) => {
    try {
      const gridSize = board.size || 5;
      const totalCells = gridSize * gridSize;
      
      // Get template cards for this game type
      const templates = getTemplateCards(board.game_type, totalCells);
      
      // Convert templates to actual bingo cards and place in grid
      const templateCards: BingoCard[] = templates.map(template => 
        templateToBingoCard(template, userData.id)
      );
      
      // Fill any remaining slots with empty cards
      while (templateCards.length < totalCells) {
        templateCards.push({
          id: '',
          title: '',
          description: null,
          difficulty: 'medium',
          game_type: board.game_type,
          tags: [],
          creator_id: userData.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_public: false,
          votes: 0,
        });
      }
      
      setGridCards(templateCards);
      
      logger.info('Initialized template cards for board', {
        metadata: { 
          hook: 'useBingoBoardEdit', 
          boardId: board.id, 
          templateCount: templates.length,
          gameType: board.game_type
        },
      });
    } catch (error) {
      logger.error('Failed to initialize template cards', error as Error, {
        metadata: { hook: 'useBingoBoardEdit', boardId: board.id },
      });
    }
  }, [userData.id]);

  return {
    isLoadingBoard,
    isLoadingCards,
    error,
    currentBoard,
    formData,
    setFormData,
    fieldErrors,
    gridCards,
    setGridCards,
    cards,
    privateCards,
    updateFormField,
    handleSave,
    placeCardInGrid,
    createNewCard,
    createPrivateCard,
    updateExistingCard,
    gridSize: currentBoard?.size || 0,
    editingCard,
    setEditingCard,
    validateBingoCardField,
    initializeBoard,
  };
}
