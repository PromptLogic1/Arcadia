import { describe, test, expect, beforeEach } from '@jest/globals';
import type {
  BingoCard,
  GameCategory,
  Difficulty,
  GeneratorOptions,
} from '../types';

// Mock card generator service
class CardGeneratorService {
  private usedCards: Set<string> = new Set();
  private cardPool: Map<string, BingoCard[]> = new Map();

  constructor() {
    this.initializeCardPool();
  }

  private initializeCardPool() {
    // Initialize with test cards for different categories
    const categories: GameCategory[] = [
      'Valorant',
      'Minecraft',
      'League of Legends',
    ];
    const difficulties: Difficulty[] = [
      'beginner',
      'easy',
      'medium',
      'hard',
      'expert',
    ];

    for (const category of categories) {
      const cards: BingoCard[] = [];
      for (const difficulty of difficulties) {
        // Generate 60 cards per difficulty to ensure enough for testing
        for (let i = 0; i < 60; i++) {
          cards.push({
            id: `${category}-${difficulty}-${i}`,
            title: `${category} ${difficulty} task ${i}`,
            description: `Complete this ${difficulty} level task in ${category}`,
            game_type: category,
            difficulty,
            tags: [category.toLowerCase(), difficulty],
            is_public: true,
            creator_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            votes: Math.floor(Math.random() * 100),
          } satisfies BingoCard);
        }
      }
      this.cardPool.set(category, cards);
    }
  }

  generateCards(options: GeneratorOptions): {
    cards: BingoCard[];
    metadata: {
      generatedAt: Date;
      totalAvailable: number;
      duplicatesAvoided: number;
      customCardsUsed: number;
    };
  } {
    const {
      gameCategory,
      difficulty,
      tags,
      excludePrevious,
      customPrompts = [],
    } = options;

    // Get available cards for the category
    const categoryCards = this.cardPool.get(gameCategory) || [];

    // Filter by difficulty
    let availableCards = categoryCards.filter(
      card => card.difficulty === difficulty
    );

    // Filter by tags if specified
    if (tags.length > 0) {
      availableCards = availableCards.filter(card =>
        tags.some(tag => card.tags?.includes(tag))
      );
    }

    // Exclude previously used cards if requested
    let duplicatesAvoided = 0;
    if (excludePrevious) {
      const beforeCount = availableCards.length;
      availableCards = availableCards.filter(
        card => !this.usedCards.has(card.id)
      );
      duplicatesAvoided = beforeCount - availableCards.length;
    }

    // Generate custom cards from prompts
    const customCards: BingoCard[] = customPrompts.map(
      (prompt, index) =>
        ({
          id: `custom-${Date.now()}-${index}`,
          title: prompt,
          description: `Custom card: ${prompt}`,
          game_type: gameCategory,
          difficulty,
          tags: ['custom', ...tags],
          is_public: false,
          creator_id: 'generator',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          votes: 0,
        }) satisfies BingoCard
    );

    // Prioritize custom cards, then fill with available cards
    const shuffledAvailable = this.shuffleArray(availableCards);
    const neededFromAvailable = Math.max(0, 25 - customCards.length);
    const selectedCards = [
      ...customCards,
      ...shuffledAvailable.slice(0, neededFromAvailable)
    ];

    // Mark cards as used
    for (const card of selectedCards) {
      this.usedCards.add(card.id);
    }

    const actualCustomCardsUsed = customCards.length;

    return {
      cards: selectedCards,
      metadata: {
        generatedAt: new Date(),
        totalAvailable: availableCards.length,
        duplicatesAvoided,
        customCardsUsed: actualCustomCardsUsed,
      },
    };
  }

  suggestCards(
    existingCards: BingoCard[],
    targetCount: number,
    options: Partial<GeneratorOptions> = {}
  ): BingoCard[] {
    const needed = Math.max(0, targetCount - existingCards.length);
    if (needed === 0) {
      return [];
    }

    // Analyze existing cards
    const categoryCount = new Map<GameCategory, number>();
    const difficultyCount = new Map<Difficulty, number>();
    const allTags = new Set<string>();

    for (const card of existingCards) {
      categoryCount.set(
        card.game_type,
        (categoryCount.get(card.game_type) ?? 0) + 1
      );
      difficultyCount.set(
        card.difficulty,
        (difficultyCount.get(card.difficulty) ?? 0) + 1
      );
      if (card.tags) {
        for (const tag of card.tags) {
          allTags.add(tag);
        }
      }
    }

    // Determine most common category and difficulty
    const dominantCategory = this.getMaxEntry(categoryCount) || 'Valorant';
    const dominantDifficulty = this.getMaxEntry(difficultyCount) || 'medium';

    // Get the target game category
    const gameCategory = options.gameCategory || dominantCategory;
    const difficulty = options.difficulty || dominantDifficulty;

    // Get available cards for the category
    const categoryCards = this.cardPool.get(gameCategory) || [];
    
    // Filter by difficulty and exclude existing cards
    const availableCards = categoryCards.filter(
      card =>
        card.difficulty === difficulty &&
        !existingCards.some(existing => existing.id === card.id)
    );

    // Filter by tags if specified
    let filteredCards = availableCards;
    if (options.tags && options.tags.length > 0) {
      filteredCards = availableCards.filter(card =>
        options.tags!.some(tag => card.tags?.includes(tag))
      );
    }

    return this.shuffleArray(filteredCards).slice(0, needed);
  }

  validateCards(
    cards: BingoCard[],
    boardSize: number
  ): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const requiredCards = boardSize * boardSize;

    // Check card count
    if (cards.length < requiredCards) {
      errors.push(
        `Insufficient cards: need ${requiredCards}, got ${cards.length}`
      );
    } else if (cards.length > requiredCards) {
      warnings.push(
        `Too many cards: need ${requiredCards}, got ${cards.length}`
      );
    }

    // Check for duplicates
    const cardIds = cards.map(c => c.id);
    const uniqueIds = new Set(cardIds);
    if (cardIds.length !== uniqueIds.size) {
      errors.push('Duplicate cards detected');
    }

    // Check for empty titles
    const emptyTitles = cards.filter(c => !c.title || c.title.trim() === '');
    if (emptyTitles.length > 0) {
      errors.push(`${emptyTitles.length} cards have empty titles`);
    }

    // Check difficulty distribution
    const difficultyCount = new Map<Difficulty, number>();
    for (const card of cards) {
      const count = difficultyCount.get(card.difficulty) ?? 0;
      difficultyCount.set(card.difficulty, count + 1);
    }

    // Warn if difficulty is too skewed
    const avgCards = requiredCards / 5; // 5 difficulty levels
    for (const [difficulty, count] of difficultyCount.entries()) {
      if (count > avgCards * 2) {
        warnings.push(
          `High concentration of ${difficulty} cards (${count}/${requiredCards})`
        );
      }
    }

    // Check category consistency
    const categories = new Set(cards.map(c => c.game_type));
    if (categories.size > 1) {
      warnings.push(
        `Mixed game categories detected: ${Array.from(categories).join(', ')}`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  getUsedCardsCount(): number {
    return this.usedCards.size;
  }

  resetUsedCards(): void {
    this.usedCards.clear();
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = shuffled[i];
      const jItem = shuffled[j];
      if (temp !== undefined && jItem !== undefined) {
        shuffled[i] = jItem;
        shuffled[j] = temp;
      }
    }
    return shuffled;
  }


  private getMaxEntry<K, V extends number>(map: Map<K, V>): K | undefined {
    let maxKey: K | undefined;
    let maxValue = -1;

    for (const [key, value] of map.entries()) {
      if (value > maxValue) {
        maxValue = value;
        maxKey = key;
      }
    }

    return maxKey;
  }
}

describe('CardGeneratorService', () => {
  let generator: CardGeneratorService;

  beforeEach(() => {
    generator = new CardGeneratorService();
  });

  describe('Card Generation', () => {
    test('should generate cards for specific category', () => {
      const options: GeneratorOptions = {
        gameCategory: 'Valorant',
        difficulty: 'medium',
        tags: [],
        excludePrevious: false,
      };

      const result = generator.generateCards(options);

      expect(result.cards).toHaveLength(25);
      for (const card of result.cards) {
        expect(card.game_type).toBe('Valorant');
        expect(card.difficulty).toBe('medium');
      }
      expect(result.metadata.totalAvailable).toBeGreaterThan(0);
    });

    test('should generate cards with specific difficulty', () => {
      const options: GeneratorOptions = {
        gameCategory: 'Minecraft',
        difficulty: 'medium',
        tags: [],
        excludePrevious: false,
      };

      const result = generator.generateCards(options);

      // All cards should have the specified difficulty
      for (const card of result.cards) {
        expect(card.difficulty).toBe('medium');
      }
    });

    test('should filter cards by tags', () => {
      const options: GeneratorOptions = {
        gameCategory: 'League of Legends',
        difficulty: 'hard',
        tags: ['hard'],
        excludePrevious: false,
      };

      const result = generator.generateCards(options);

      for (const card of result.cards) {
        expect(card.tags).toContain('hard');
      }
    });

    test('should exclude previously used cards', () => {
      const options: GeneratorOptions = {
        gameCategory: 'Valorant',
        difficulty: 'easy',
        tags: [],
        excludePrevious: true,
      };

      // Generate first batch
      const result1 = generator.generateCards(options);
      const firstBatchIds = new Set(result1.cards.map(c => c.id));

      // Generate second batch with exclusion
      const result2 = generator.generateCards(options);

      // Check no overlap
      for (const card of result2.cards) {
        expect(firstBatchIds.has(card.id)).toBe(false);
      }

      expect(result2.metadata.duplicatesAvoided).toBeGreaterThan(0);
    });

    test('should include custom cards from prompts', () => {
      const customPrompts = [
        'Get a no-scope headshot',
        'Win without using abilities',
        'Ace with Sheriff only',
      ];

      const options: GeneratorOptions = {
        gameCategory: 'Valorant',
        difficulty: 'expert',
        tags: [],
        excludePrevious: false,
        customPrompts,
      };

      const result = generator.generateCards(options);

      const customCards = result.cards.filter(
        c => c.creator_id === 'generator'
      );
      expect(customCards.length).toBe(customPrompts.length);
      expect(result.metadata.customCardsUsed).toBe(customPrompts.length);

      for (const prompt of customPrompts) {
        expect(result.cards.some(c => c.title === prompt)).toBe(true);
      }
    });
  });

  describe('Card Validation', () => {
    test('should validate correct card set', () => {
      const cards = Array.from(
        { length: 25 },
        (_, i) =>
          ({
            id: `card-${i}`,
            title: `Card ${i}`,
            description: `Description ${i}`,
            game_type: 'Valorant',
            difficulty: 'medium',
            tags: ['test'],
            is_public: true,
            creator_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            votes: 0,
          }) satisfies BingoCard
      );

      const validation = generator.validateCards(cards, 5);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should detect insufficient cards', () => {
      const cards = Array.from(
        { length: 20 },
        (_, i) =>
          ({
            id: `card-${i}`,
            title: `Card ${i}`,
            description: `Description ${i}`,
            game_type: 'Minecraft',
            difficulty: 'easy',
            tags: [],
            is_public: true,
            creator_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            votes: 0,
          }) satisfies BingoCard
      );

      const validation = generator.validateCards(cards, 5);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(
        'Insufficient cards: need 25, got 20'
      );
    });

    test('should detect duplicate cards', () => {
      const cards = Array.from(
        { length: 25 },
        (_, i) =>
          ({
            id: i < 24 ? `card-${i}` : 'card-0', // Duplicate ID
            title: `Card ${i}`,
            description: `Description ${i}`,
            game_type: 'Valorant',
            difficulty: 'medium',
            tags: [],
            is_public: true,
            creator_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            votes: 0,
          }) satisfies BingoCard
      );

      const validation = generator.validateCards(cards, 5);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Duplicate cards detected');
    });

    test('should detect empty titles', () => {
      const cards = Array.from(
        { length: 25 },
        (_, i) =>
          ({
            id: `card-${i}`,
            title: i % 5 === 0 ? '' : `Card ${i}`, // Some empty titles
            description: `Description ${i}`,
            game_type: 'League of Legends',
            difficulty: 'hard',
            tags: [],
            is_public: true,
            creator_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            votes: 0,
          }) satisfies BingoCard
      );

      const validation = generator.validateCards(cards, 5);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('5 cards have empty titles');
    });

    test('should warn about skewed difficulty distribution', () => {
      const cards = Array.from(
        { length: 25 },
        (_, i) =>
          ({
            id: `card-${i}`,
            title: `Card ${i}`,
            description: `Description ${i}`,
            game_type: 'Valorant',
            difficulty: 'expert', // All same difficulty
            tags: [],
            is_public: true,
            creator_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            votes: 0,
          }) satisfies BingoCard
      );

      const validation = generator.validateCards(cards, 5);

      expect(validation.valid).toBe(true);
      expect(validation.warnings).toContain(
        'High concentration of expert cards (25/25)'
      );
    });

    test('should warn about mixed categories', () => {
      const cards = Array.from(
        { length: 25 },
        (_, i) =>
          ({
            id: `card-${i}`,
            title: `Card ${i}`,
            description: `Description ${i}`,
            game_type: i % 2 === 0 ? 'Valorant' : 'Minecraft',
            difficulty: 'medium',
            tags: [],
            is_public: true,
            creator_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            votes: 0,
          }) satisfies BingoCard
      );

      const validation = generator.validateCards(cards, 5);

      expect(validation.warnings).toContain(
        'Mixed game categories detected: Valorant, Minecraft'
      );
    });
  });

  describe('Card Suggestions', () => {
    test('should suggest cards matching existing pattern', () => {
      const existingCards: BingoCard[] = Array.from(
        { length: 15 },
        (_, i) =>
          ({
            id: `existing-${i}`,
            title: `Existing ${i}`,
            description: `Description ${i}`,
            game_type: 'Valorant',
            difficulty: 'medium',
            tags: ['fps', 'competitive'],
            is_public: true,
            creator_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            votes: 0,
          }) satisfies BingoCard
      );

      const suggestions = generator.suggestCards(existingCards, 25, {});

      expect(suggestions).toHaveLength(10); // 25 - 15 existing
      for (const card of suggestions) {
        expect(card.game_type).toBe('Valorant');
        expect(card.difficulty).toBe('medium');
      }
    });

    test('should respect override options in suggestions', () => {
      const existingCards: BingoCard[] = Array.from(
        { length: 10 },
        (_, i) =>
          ({
            id: `existing-${i}`,
            title: `Existing ${i}`,
            description: `Description ${i}`,
            game_type: 'Minecraft',
            difficulty: 'easy',
            tags: ['sandbox'],
            is_public: true,
            creator_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            votes: 0,
          }) satisfies BingoCard
      );

      const suggestions = generator.suggestCards(existingCards, 25, {
        gameCategory: 'Valorant',
        difficulty: 'hard',
      });

      expect(suggestions).toHaveLength(15);
      for (const card of suggestions) {
        expect(card.game_type).toBe('Valorant');
        expect(card.difficulty).toBe('hard');
      }
    });
  });

  describe('State Management', () => {
    test('should track used cards correctly', () => {
      expect(generator.getUsedCardsCount()).toBe(0);

      const options: GeneratorOptions = {
        gameCategory: 'Valorant',
        difficulty: 'medium',
        tags: [],
        excludePrevious: true,
      };

      generator.generateCards(options);
      expect(generator.getUsedCardsCount()).toBe(25);

      generator.generateCards(options);
      expect(generator.getUsedCardsCount()).toBe(50);
    });

    test('should reset used cards', () => {
      const options: GeneratorOptions = {
        gameCategory: 'Minecraft',
        difficulty: 'easy',
        tags: [],
        excludePrevious: true,
      };

      generator.generateCards(options);
      expect(generator.getUsedCardsCount()).toBeGreaterThan(0);

      generator.resetUsedCards();
      expect(generator.getUsedCardsCount()).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty card pool gracefully', () => {
      const options: GeneratorOptions = {
        gameCategory: 'World of Warcraft', // Not in test pool
        difficulty: 'medium',
        tags: [],
        excludePrevious: false,
      };

      const result = generator.generateCards(options);
      expect(result.cards).toHaveLength(0);
      expect(result.metadata.totalAvailable).toBe(0);
    });

    test('should handle all cards being excluded', () => {
      const options: GeneratorOptions = {
        gameCategory: 'Valorant',
        difficulty: 'beginner',
        tags: [],
        excludePrevious: true,
      };

      // Mark all beginner Valorant cards as used
      for (let i = 0; i < 10; i++) {
        generator.generateCards(options);
      }

      const result = generator.generateCards(options);
      expect(result.cards.length).toBeLessThanOrEqual(5); // Should have few or no cards left
    });
  });
});
