import { describe, test, expect, beforeEach } from 'vitest';

// Types for recommendation system
interface Game {
  id: string;
  title: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  player_count: number;
  average_duration: number;
  rating: number;
  tags: string[];
  created_at: string;
}

interface UserPreferences {
  favoriteCategories: string[];
  preferredDifficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  averagePlayTime: number;
  playedGames: string[];
  likedGames: string[];
  dislikedGames: string[];
}

interface RecommendationScore {
  gameId: string;
  score: number;
  reasons: string[];
}

interface RecommendationConfig {
  maxRecommendations?: number;
  includeNewGames?: boolean;
  diversityWeight?: number;
  personalizedWeight?: number;
}

// Recommendation engine implementation
export class RecommendationEngine {
  private games: Map<string, Game>;
  private userPreferences: UserPreferences;
  private collaborativeData: Map<string, Set<string>> = new Map(); // game -> users who liked it

  constructor(games: Game[], preferences: UserPreferences) {
    this.games = new Map(games.map(g => [g.id, g]));
    this.userPreferences = preferences;
  }

  // Main recommendation method
  getRecommendations(config: RecommendationConfig = {}): Game[] {
    const {
      maxRecommendations = 10,
      includeNewGames = true,
      diversityWeight = 0.3,
      personalizedWeight = 0.7
    } = config;

    const scores = this.calculateRecommendationScores(
      includeNewGames,
      personalizedWeight,
      diversityWeight
    );

    // Sort by score and return top recommendations
    const sorted = scores.sort((a, b) => b.score - a.score);
    const topScores = sorted.slice(0, maxRecommendations);

    return topScores
      .map(s => this.games.get(s.gameId))
      .filter((g): g is Game => g !== undefined);
  }

  // Calculate recommendation scores for all games
  private calculateRecommendationScores(
    includeNewGames: boolean,
    personalizedWeight: number,
    diversityWeight: number
  ): RecommendationScore[] {
    const scores: RecommendationScore[] = [];

    for (const [gameId, game] of this.games) {
      // Skip already played games unless they're liked
      if (this.userPreferences.playedGames.includes(gameId) &&
          !this.userPreferences.likedGames.includes(gameId)) {
        continue;
      }

      // Skip disliked games
      if (this.userPreferences.dislikedGames.includes(gameId)) {
        continue;
      }

      const score = this.calculateGameScore(
        game,
        personalizedWeight,
        diversityWeight
      );

      scores.push(score);
    }

    return scores;
  }

  // Calculate score for individual game
  private calculateGameScore(
    game: Game,
    personalizedWeight: number,
    diversityWeight: number
  ): RecommendationScore {
    const reasons: string[] = [];
    let baseScore = 0;

    // Category match score (0-30 points)
    const categoryScore = this.calculateCategoryScore(game);
    if (categoryScore > 0) {
      baseScore += categoryScore;
      reasons.push(`Matches your favorite categories`);
    }

    // Difficulty preference score (0-20 points)
    const difficultyScore = this.calculateDifficultyScore(game);
    if (difficultyScore > 0) {
      baseScore += difficultyScore;
      reasons.push(`Suitable difficulty level`);
    }

    // Play time compatibility (0-15 points)
    const playTimeScore = this.calculatePlayTimeScore(game);
    if (playTimeScore > 0) {
      baseScore += playTimeScore;
      reasons.push(`Fits your typical play sessions`);
    }

    // Popularity and rating (0-20 points)
    const popularityScore = this.calculatePopularityScore(game);
    if (popularityScore > 0) {
      baseScore += popularityScore;
      reasons.push(`Highly rated by players`);
    }

    // Tag similarity to liked games (0-25 points)
    const tagScore = this.calculateTagSimilarity(game);
    if (tagScore > 0) {
      baseScore += tagScore;
      reasons.push(`Similar to games you enjoyed`);
    }

    // Diversity bonus for variety (0-10 points)
    const diversityScore = this.calculateDiversityScore(game);
    if (diversityScore > 0) {
      baseScore += diversityScore * diversityWeight;
      reasons.push(`Adds variety to your game selection`);
    }

    // Apply personalization weight
    const finalScore = baseScore * personalizedWeight;

    return {
      gameId: game.id,
      score: finalScore,
      reasons
    };
  }

  private calculateCategoryScore(game: Game): number {
    const favoriteCategories = this.userPreferences.favoriteCategories;
    if (favoriteCategories.includes(game.category)) {
      return 30;
    }
    // Partial score for related categories
    const relatedCategories: Record<string, string[]> = {
      'puzzle': ['strategy', 'educational'],
      'strategy': ['puzzle', 'educational'],
      'entertainment': ['social'],
      'educational': ['puzzle', 'strategy']
    };
    
    const related = relatedCategories[game.category] || [];
    const hasRelated = related.some(cat => favoriteCategories.includes(cat));
    return hasRelated ? 15 : 0;
  }

  private calculateDifficultyScore(game: Game): number {
    const preferred = this.userPreferences.preferredDifficulty;
    
    if (preferred === 'mixed') {
      return 15; // All difficulties are acceptable
    }
    
    if (game.difficulty === preferred) {
      return 20;
    }
    
    // Adjacent difficulty gets partial score
    const difficultyMap = { easy: 0, medium: 1, hard: 2 };
    const gameDiff = difficultyMap[game.difficulty];
    const prefDiff = difficultyMap[preferred];
    
    return Math.abs(gameDiff - prefDiff) === 1 ? 10 : 0;
  }

  private calculatePlayTimeScore(game: Game): number {
    const avgPlayTime = this.userPreferences.averagePlayTime;
    const gameDuration = game.average_duration;
    
    // Perfect match
    if (Math.abs(gameDuration - avgPlayTime) <= 5) {
      return 15;
    }
    
    // Within reasonable range (±50%)
    const lowerBound = avgPlayTime * 0.5;
    const upperBound = avgPlayTime * 1.5;
    
    if (gameDuration >= lowerBound && gameDuration <= upperBound) {
      return 10;
    }
    
    return 0;
  }

  private calculatePopularityScore(game: Game): number {
    let score = 0;
    
    // Rating component
    if (game.rating >= 4.5) score += 10;
    else if (game.rating >= 4.0) score += 7;
    else if (game.rating >= 3.5) score += 4;
    
    // Player count component
    if (game.player_count >= 1000) score += 10;
    else if (game.player_count >= 500) score += 7;
    else if (game.player_count >= 100) score += 4;
    
    return score;
  }

  private calculateTagSimilarity(game: Game): number {
    const likedGames = this.userPreferences.likedGames
      .map(id => this.games.get(id))
      .filter((g): g is Game => g !== undefined);
    
    if (likedGames.length === 0) return 0;
    
    // Get all tags from liked games
    const likedTags = new Set<string>();
    likedGames.forEach(g => g.tags.forEach(tag => likedTags.add(tag)));
    
    // Calculate overlap
    const overlap = game.tags.filter(tag => likedTags.has(tag)).length;
    const maxOverlap = Math.min(game.tags.length, likedTags.size);
    
    if (maxOverlap === 0) return 0;
    
    const similarity = overlap / maxOverlap;
    return Math.round(similarity * 25);
  }

  private calculateDiversityScore(game: Game): number {
    // Check if this category is underrepresented in played games
    const playedGames = this.userPreferences.playedGames
      .map(id => this.games.get(id))
      .filter((g): g is Game => g !== undefined);
    
    const categoryCounts = new Map<string, number>();
    playedGames.forEach(g => {
      categoryCounts.set(g.category, (categoryCounts.get(g.category) || 0) + 1);
    });
    
    const totalPlayed = playedGames.length;
    if (totalPlayed === 0) return 0;
    
    const categoryRatio = (categoryCounts.get(game.category) || 0) / totalPlayed;
    
    // Higher score for underrepresented categories
    if (categoryRatio < 0.1) return 10;
    if (categoryRatio < 0.2) return 7;
    if (categoryRatio < 0.3) return 4;
    
    return 0;
  }

  // Collaborative filtering support
  addCollaborativeData(gameId: string, userId: string) {
    if (!this.collaborativeData.has(gameId)) {
      this.collaborativeData.set(gameId, new Set());
    }
    this.collaborativeData.get(gameId)!.add(userId);
  }

  // Get games liked by similar users
  getCollaborativeRecommendations(userId: string, limit = 5): Game[] {
    const userLikedGames = new Set(this.userPreferences.likedGames);
    const similarUsers = new Set<string>();
    
    // Find users who liked the same games
    for (const gameId of userLikedGames) {
      const users = this.collaborativeData.get(gameId) || new Set();
      users.forEach(u => {
        if (u !== userId) similarUsers.add(u);
      });
    }
    
    // Find games liked by similar users
    const recommendedGames = new Map<string, number>();
    
    for (const [gameId, users] of this.collaborativeData) {
      if (userLikedGames.has(gameId)) continue;
      
      let score = 0;
      users.forEach(u => {
        if (similarUsers.has(u)) score++;
      });
      
      if (score > 0) {
        recommendedGames.set(gameId, score);
      }
    }
    
    // Sort by score and return top games
    const sorted = Array.from(recommendedGames.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
    
    return sorted
      .map(([gameId]) => this.games.get(gameId))
      .filter((g): g is Game => g !== undefined);
  }
}

describe('Recommendation Engine', () => {
  let games: Game[];
  let userPreferences: UserPreferences;
  let engine: RecommendationEngine;

  beforeEach(() => {
    games = [
      {
        id: 'game-1',
        title: 'Classic Puzzle',
        category: 'puzzle',
        difficulty: 'easy',
        player_count: 1200,
        average_duration: 20,
        rating: 4.5,
        tags: ['classic', 'family', 'casual'],
        created_at: new Date().toISOString()
      },
      {
        id: 'game-2',
        title: 'Strategic Mind',
        category: 'strategy',
        difficulty: 'hard',
        player_count: 800,
        average_duration: 45,
        rating: 4.8,
        tags: ['strategy', 'competitive', 'thinking'],
        created_at: new Date().toISOString()
      },
      {
        id: 'game-3',
        title: 'Action Adventure',
        category: 'entertainment',
        difficulty: 'medium',
        player_count: 1500,
        average_duration: 30,
        rating: 4.3,
        tags: ['action', 'adventure', 'exciting'],
        created_at: new Date().toISOString()
      },
      {
        id: 'game-4',
        title: 'Brain Training',
        category: 'educational',
        difficulty: 'medium',
        player_count: 600,
        average_duration: 25,
        rating: 4.6,
        tags: ['educational', 'brain', 'learning'],
        created_at: new Date().toISOString()
      },
      {
        id: 'game-5',
        title: 'Puzzle Master',
        category: 'puzzle',
        difficulty: 'hard',
        player_count: 400,
        average_duration: 40,
        rating: 4.7,
        tags: ['puzzle', 'challenging', 'thinking'],
        created_at: new Date().toISOString()
      }
    ];

    userPreferences = {
      favoriteCategories: ['puzzle', 'strategy'],
      preferredDifficulty: 'medium',
      averagePlayTime: 30,
      playedGames: ['game-1'],
      likedGames: ['game-1'],
      dislikedGames: []
    };

    engine = new RecommendationEngine(games, userPreferences);
  });

  describe('Basic Recommendations', () => {
    test('should recommend games based on favorite categories', () => {
      const recommendations = engine.getRecommendations({ maxRecommendations: 3 });
      
      expect(recommendations.length).toBeLessThanOrEqual(3);
      expect(recommendations.some(g => g.category === 'puzzle' || g.category === 'strategy')).toBe(true);
    });

    test('should not recommend already played games', () => {
      const recommendations = engine.getRecommendations();
      
      expect(recommendations.every(g => g.id !== 'game-1')).toBe(true);
    });

    test('should recommend liked games even if played', () => {
      userPreferences.playedGames = ['game-1', 'game-2'];
      userPreferences.likedGames = ['game-1'];
      
      const newEngine = new RecommendationEngine(games, userPreferences);
      const recommendations = newEngine.getRecommendations();
      
      expect(recommendations.some(g => g.id === 'game-1')).toBe(true);
      expect(recommendations.every(g => g.id !== 'game-2')).toBe(true);
    });

    test('should not recommend disliked games', () => {
      userPreferences.dislikedGames = ['game-2', 'game-3'];
      
      const newEngine = new RecommendationEngine(games, userPreferences);
      const recommendations = newEngine.getRecommendations();
      
      expect(recommendations.every(g => g.id !== 'game-2' && g.id !== 'game-3')).toBe(true);
    });
  });

  describe('Difficulty Preferences', () => {
    test('should prioritize preferred difficulty', () => {
      const recommendations = engine.getRecommendations({ maxRecommendations: 2 });
      
      // Should include medium difficulty games
      expect(recommendations.some(g => g.difficulty === 'medium')).toBe(true);
    });

    test('should handle mixed difficulty preference', () => {
      userPreferences.preferredDifficulty = 'mixed';
      
      const newEngine = new RecommendationEngine(games, userPreferences);
      const recommendations = newEngine.getRecommendations();
      
      // Should include games of various difficulties
      const difficulties = new Set(recommendations.map(g => g.difficulty));
      expect(difficulties.size).toBeGreaterThan(1);
    });
  });

  describe('Play Time Compatibility', () => {
    test('should recommend games matching average play time', () => {
      userPreferences.averagePlayTime = 25;
      
      const newEngine = new RecommendationEngine(games, userPreferences);
      const recommendations = newEngine.getRecommendations({ maxRecommendations: 3 });
      
      // Should prioritize games around 25 minutes
      expect(recommendations.some(g => 
        g.average_duration >= 20 && g.average_duration <= 30
      )).toBe(true);
    });
  });

  describe('Tag Similarity', () => {
    test('should recommend games with similar tags to liked games', () => {
      userPreferences.likedGames = ['game-1']; // Has tags: classic, family, casual
      
      games.push({
        id: 'game-6',
        title: 'Family Fun',
        category: 'entertainment',
        difficulty: 'easy',
        player_count: 900,
        average_duration: 25,
        rating: 4.4,
        tags: ['family', 'casual', 'fun'],
        created_at: new Date().toISOString()
      });
      
      const newEngine = new RecommendationEngine(games, userPreferences);
      const recommendations = newEngine.getRecommendations();
      
      // Should rank game-6 high due to tag overlap
      expect(recommendations.some(g => g.id === 'game-6')).toBe(true);
    });
  });

  describe('Diversity Scoring', () => {
    test('should promote diversity when user plays mostly one category', () => {
      userPreferences.playedGames = ['game-1', 'game-5']; // Both puzzle games
      userPreferences.favoriteCategories = ['puzzle', 'strategy', 'educational'];
      
      const newEngine = new RecommendationEngine(games, userPreferences);
      const recommendations = newEngine.getRecommendations({
        diversityWeight: 0.5
      });
      
      // Should include non-puzzle games for variety
      expect(recommendations.some(g => g.category !== 'puzzle')).toBe(true);
    });
  });

  describe('Collaborative Filtering', () => {
    test('should recommend games liked by similar users', () => {
      // User likes game-1
      engine.addCollaborativeData('game-1', 'user-1');
      
      // Other users who liked game-1 also liked game-4
      engine.addCollaborativeData('game-1', 'user-2');
      engine.addCollaborativeData('game-1', 'user-3');
      engine.addCollaborativeData('game-4', 'user-2');
      engine.addCollaborativeData('game-4', 'user-3');
      
      const collaborative = engine.getCollaborativeRecommendations('user-1');
      
      expect(collaborative.some(g => g.id === 'game-4')).toBe(true);
    });
  });

  describe('Performance', () => {
    test('should handle large game catalogs efficiently', () => {
      // Create 1000 games
      const largeGameSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `game-${i}`,
        title: `Game ${i}`,
        category: ['puzzle', 'strategy', 'entertainment', 'educational'][i % 4] ?? 'puzzle',
        difficulty: (['easy', 'medium', 'hard'][i % 3] ?? 'medium') as 'easy' | 'medium' | 'hard',
        player_count: Math.floor(Math.random() * 2000),
        average_duration: 15 + Math.floor(Math.random() * 60),
        rating: 3 + Math.random() * 2,
        tags: [`tag-${i % 10}`, `tag-${i % 20}`, `tag-${i % 30}`],
        created_at: new Date().toISOString()
      }));
      
      const largeEngine = new RecommendationEngine(largeGameSet, userPreferences);
      
      const startTime = performance.now();
      const recommendations = largeEngine.getRecommendations();
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
      expect(recommendations.length).toBeGreaterThan(0);
    });
  });
});