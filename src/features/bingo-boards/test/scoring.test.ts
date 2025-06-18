import { describe, test, expect, beforeEach } from 'vitest';
import { ScoringService } from '../services/scoring.service';
import type { WinPattern } from '../types';

describe('ScoringService', () => {
  let scoringService: ScoringService;

  beforeEach(() => {
    scoringService = new ScoringService();
  });

  const createWinPattern = (type: WinPattern['type'], name: string, points: number): WinPattern => ({
    type,
    name,
    positions: [], // Not used in scoring calculations
    points,
  });

  describe('Basic Score Calculation', () => {
    test('should calculate correct base score for single line', () => {
      const patterns = [createWinPattern('single-line', 'Row 1', 100)];
      const result = scoringService.calculateScore(patterns, 60, false, 0);

      expect(result.baseScore).toBe(100);
      expect(result.totalScore).toBe(100);
      expect(result.breakdown).toContain('Row 1: 100 pts');
    });

    test('should calculate correct base score for multiple patterns', () => {
      const patterns = [
        createWinPattern('single-line', 'Row 1', 100),
        createWinPattern('single-line', 'Column 1', 100),
      ];
      const result = scoringService.calculateScore(patterns, 60, false, 0);

      expect(result.baseScore).toBe(200);
      expect(result.totalScore).toBe(200);
      expect(result.breakdown).toContain('Row 1: 100 pts');
      expect(result.breakdown).toContain('Column 1: 100 pts');
    });

    test('should handle different pattern types with correct points', () => {
      const patterns = [
        createWinPattern('four-corners', 'Four Corners', 200),
        createWinPattern('full-house', 'Full House', 500),
        createWinPattern('letter-x', 'Letter X', 350),
      ];
      const result = scoringService.calculateScore(patterns, 60, false, 0);

      expect(result.baseScore).toBe(1050);
      expect(result.totalScore).toBe(1050);
    });
  });

  describe('Time Bonuses', () => {
    test('should apply speed demon bonus for under 30 seconds', () => {
      const patterns = [createWinPattern('single-line', 'Row 1', 100)];
      const result = scoringService.calculateScore(patterns, 25, false, 0);

      expect(result.timeBonus).toBe(100);
      expect(result.totalScore).toBe(200);
      expect(result.breakdown).toContain('Speed Demon (<30s): +100 pts');
    });

    test('should apply quick win bonus for under 1 minute', () => {
      const patterns = [createWinPattern('single-line', 'Row 1', 100)];
      const result = scoringService.calculateScore(patterns, 45, false, 0);

      expect(result.timeBonus).toBe(50);
      expect(result.totalScore).toBe(150);
      expect(result.breakdown).toContain('Quick Win (<1m): +50 pts');
    });

    test('should apply fast finish bonus for under 2 minutes', () => {
      const patterns = [createWinPattern('single-line', 'Row 1', 100)];
      const result = scoringService.calculateScore(patterns, 90, false, 0);

      expect(result.timeBonus).toBe(25);
      expect(result.totalScore).toBe(125);
      expect(result.breakdown).toContain('Fast Finish (<2m): +25 pts');
    });

    test('should not apply time bonus for slow completion', () => {
      const patterns = [createWinPattern('single-line', 'Row 1', 100)];
      const result = scoringService.calculateScore(patterns, 150, false, 0);

      expect(result.timeBonus).toBe(0);
      expect(result.totalScore).toBe(100);
    });
  });

  describe('Multipliers', () => {
    test('should apply first winner multiplier', () => {
      const patterns = [createWinPattern('single-line', 'Row 1', 100)];
      const result = scoringService.calculateScore(patterns, 60, true, 0);

      expect(result.firstWinMultiplier).toBe(2.0);
      expect(result.totalScore).toBe(200); // 100 * 2.0
      expect(result.breakdown).toContain('First Winner: ×2');
    });

    test('should apply speed bonus multiplier for fast wins', () => {
      const patterns = [createWinPattern('single-line', 'Row 1', 100)];
      const result = scoringService.calculateScore(patterns, 90, false, 0);

      expect(result.speedMultiplier).toBe(1.5);
      expect(result.totalScore).toBe(188); // (100 + 25) * 1.5
      expect(result.breakdown).toContain('Speed Bonus: ×1.5');
    });

    test('should apply perfection multiplier for no mistakes', () => {
      const patterns = [createWinPattern('single-line', 'Row 1', 100)];
      const result = scoringService.calculateScore(patterns, 60, false, 0);

      expect(result.perfectionMultiplier).toBe(1.3);
      expect(result.totalScore).toBe(130); // 100 * 1.3
      expect(result.breakdown).toContain('Perfect Game: ×1.3');
    });

    test('should not apply perfection multiplier with mistakes', () => {
      const patterns = [createWinPattern('single-line', 'Row 1', 100)];
      const result = scoringService.calculateScore(patterns, 60, false, 3);

      expect(result.perfectionMultiplier).toBe(1.0);
      expect(result.totalScore).toBe(100);
    });

    test('should combine all multipliers correctly', () => {
      const patterns = [createWinPattern('single-line', 'Row 1', 100)];
      const result = scoringService.calculateScore(patterns, 25, true, 0);

      // Base: 100, Time bonus: 100, Total: 200
      // Multipliers: First winner (2.0) * Speed (1.5) * Perfect (1.3) = 3.9
      expect(result.firstWinMultiplier).toBe(2.0);
      expect(result.speedMultiplier).toBe(1.5);
      expect(result.perfectionMultiplier).toBe(1.3);
      expect(result.totalScore).toBe(780); // 200 * 3.9
    });
  });

  describe('Complex Scoring Scenarios', () => {
    test('should handle high-scoring patterns with bonuses', () => {
      const patterns = [
        createWinPattern('full-house', 'Full House', 500),
        createWinPattern('letter-x', 'Letter X', 350),
      ];
      const result = scoringService.calculateScore(patterns, 45, true, 0);

      // Base: 850, Time bonus: 50, Total: 900
      // Multipliers: First (2.0) * Perfect (1.3) = 2.6
      expect(result.baseScore).toBe(850);
      expect(result.timeBonus).toBe(50);
      expect(result.totalScore).toBe(2340); // 900 * 2.6
    });

    test('should handle edge case with zero base score', () => {
      const patterns: WinPattern[] = [];
      const result = scoringService.calculateScore(patterns, 30, true, 0);

      expect(result.baseScore).toBe(0);
      expect(result.timeBonus).toBe(100);
      expect(result.totalScore).toBe(390); // (0 + 100) * 2.0 * 1.5 * 1.3
    });

    test('should handle very fast completion with high-value patterns', () => {
      const patterns = [createWinPattern('full-house', 'Full House', 500)];
      const result = scoringService.calculateScore(patterns, 15, true, 0);

      // Base: 500, Time bonus: 100, Total: 600
      // Multipliers: First (2.0) * Speed (1.5) * Perfect (1.3) = 3.9
      expect(result.totalScore).toBe(2340); // 600 * 3.9
    });
  });

  describe('Difficulty Multipliers', () => {
    test('should return correct multiplier for each difficulty', () => {
      expect(scoringService.getDifficultyMultiplier('beginner')).toBe(0.8);
      expect(scoringService.getDifficultyMultiplier('easy')).toBe(1.0);
      expect(scoringService.getDifficultyMultiplier('medium')).toBe(1.2);
      expect(scoringService.getDifficultyMultiplier('hard')).toBe(1.5);
      expect(scoringService.getDifficultyMultiplier('expert')).toBe(2.0);
    });

    test('should return default multiplier for unknown difficulty', () => {
      expect(scoringService.getDifficultyMultiplier('unknown')).toBe(1.0);
    });
  });

  describe('Placement Points', () => {
    test('should award correct placement points', () => {
      expect(scoringService.getPlacementPoints(1, 4)).toBe(100); // 1st place
      expect(scoringService.getPlacementPoints(2, 4)).toBe(50);  // 2nd place
      expect(scoringService.getPlacementPoints(3, 4)).toBe(25);  // 3rd place
      expect(scoringService.getPlacementPoints(4, 4)).toBe(0);   // 4th place
    });

    test('should handle edge cases for placement points', () => {
      // Not enough players for 2nd place bonus
      expect(scoringService.getPlacementPoints(2, 2)).toBe(0);
      
      // Not enough players for 3rd place bonus
      expect(scoringService.getPlacementPoints(3, 3)).toBe(0);
      
      // Single player game
      expect(scoringService.getPlacementPoints(1, 1)).toBe(100);
    });
  });

  describe('Score Formatting', () => {
    test('should format small scores correctly', () => {
      expect(scoringService.formatScore(0)).toBe('0');
      expect(scoringService.formatScore(123)).toBe('123');
      expect(scoringService.formatScore(999)).toBe('999');
    });

    test('should format thousands correctly', () => {
      expect(scoringService.formatScore(1000)).toBe('1.0K');
      expect(scoringService.formatScore(1234)).toBe('1.2K');
      expect(scoringService.formatScore(50000)).toBe('50.0K');
      expect(scoringService.formatScore(999999)).toBe('1000.0K');
    });

    test('should format millions correctly', () => {
      expect(scoringService.formatScore(1000000)).toBe('1.0M');
      expect(scoringService.formatScore(1234567)).toBe('1.2M');
      expect(scoringService.formatScore(50000000)).toBe('50.0M');
    });
  });

  describe('Achievement Thresholds', () => {
    test('should return correct achievement thresholds', () => {
      const thresholds = scoringService.getAchievementThresholds();

      expect(thresholds.firstWin).toBe(1);
      expect(thresholds.speedDemon).toBe(30);
      expect(thresholds.perfectionist).toBe(0);
      expect(thresholds.highScore).toBe(1000);
      expect(thresholds.winStreak).toBe(5);
      expect(thresholds.gamesPlayed).toEqual([10, 50, 100, 500, 1000]);
    });
  });

  describe('Pattern Type Scoring', () => {
    test('should score single-line patterns correctly', () => {
      const patterns = [createWinPattern('single-line', 'Test', 100)];
      const result = scoringService.calculateScore(patterns, 60, false, 0);
      expect(result.baseScore).toBe(100);
    });

    test('should score double-line patterns correctly', () => {
      const patterns = [createWinPattern('double-line', 'Test', 250)];
      const result = scoringService.calculateScore(patterns, 60, false, 0);
      expect(result.baseScore).toBe(250);
    });

    test('should score custom patterns with fallback points', () => {
      const customPattern: WinPattern = {
        type: 'custom',
        name: 'Custom Pattern',
        positions: [0, 1, 2],
        points: 300, // Custom points
      };
      
      const result = scoringService.calculateScore([customPattern], 60, false, 0);
      expect(result.baseScore).toBe(300);
    });

    test('should handle unknown pattern types with default points', () => {
      const unknownPattern: WinPattern = {
        type: 'unknown' as any,
        name: 'Unknown Pattern',
        positions: [0, 1, 2],
        points: 75, // Should use this value
      };
      
      const result = scoringService.calculateScore([unknownPattern], 60, false, 0);
      expect(result.baseScore).toBe(75);
    });
  });

  describe('Score Breakdown Analysis', () => {
    test('should provide detailed breakdown for complex scoring', () => {
      const patterns = [
        createWinPattern('single-line', 'Row 1', 100),
        createWinPattern('four-corners', 'Four Corners', 200),
      ];
      
      const result = scoringService.calculateScore(patterns, 25, true, 0);
      
      // Check that breakdown includes all components
      const breakdown = result.breakdown.join(' ');
      expect(breakdown).toContain('Row 1: 100 pts');
      expect(breakdown).toContain('Four Corners: 200 pts');
      expect(breakdown).toContain('Speed Demon (<30s): +100 pts');
      expect(breakdown).toContain('First Winner: ×2');
      expect(breakdown).toContain('Speed Bonus: ×1.5');
      expect(breakdown).toContain('Perfect Game: ×1.3');
    });

    test('should only include relevant breakdown items', () => {
      const patterns = [createWinPattern('single-line', 'Row 1', 100)];
      const result = scoringService.calculateScore(patterns, 150, false, 2);
      
      const breakdown = result.breakdown.join(' ');
      expect(breakdown).toContain('Row 1: 100 pts');
      expect(breakdown).not.toContain('Speed Demon');
      expect(breakdown).not.toContain('First Winner');
      expect(breakdown).not.toContain('Perfect Game');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle negative time elapsed', () => {
      const patterns = [createWinPattern('single-line', 'Row 1', 100)];
      const result = scoringService.calculateScore(patterns, -10, false, 0);
      
      // Should treat as very fast completion
      expect(result.timeBonus).toBe(100);
      expect(result.speedMultiplier).toBe(1.5);
    });

    test('should handle negative mistake count', () => {
      const patterns = [createWinPattern('single-line', 'Row 1', 100)];
      const result = scoringService.calculateScore(patterns, 60, false, -1);
      
      // Should treat as perfect game
      expect(result.perfectionMultiplier).toBe(1.3);
    });

    test('should handle empty pattern array', () => {
      const result = scoringService.calculateScore([], 60, false, 0);
      
      expect(result.baseScore).toBe(0);
      expect(result.totalScore).toBeGreaterThan(0); // Due to perfect game multiplier
    });

    test('should round final scores correctly', () => {
      const patterns = [createWinPattern('single-line', 'Row 1', 33)]; // Odd number
      const result = scoringService.calculateScore(patterns, 60, true, 0);
      
      // 33 * 2.0 * 1.3 = 85.8, should round to 86
      expect(result.totalScore).toBe(86);
      expect(Number.isInteger(result.totalScore)).toBe(true);
    });
  });
});