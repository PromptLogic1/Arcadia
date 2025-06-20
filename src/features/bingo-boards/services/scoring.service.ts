import type { WinPattern } from '../types';

interface ScoringConfig {
  basePoints: {
    singleLine: number;
    doubleLine: number;
    fourCorners: number;
    fullHouse: number;
    customPattern: number;
    letterT: number;
    letterX: number;
  };
  multipliers: {
    firstWin: number; // First to achieve pattern
    speedBonus: number; // Win under 2 minutes
    perfection: number; // No mistakes (no unmarking)
  };
  timeBonus: {
    under30Seconds: number;
    under1Minute: number;
    under2Minutes: number;
  };
}

export interface ScoreCalculation {
  baseScore: number;
  timeBonus: number;
  speedMultiplier: number;
  perfectionMultiplier: number;
  firstWinMultiplier: number;
  totalScore: number;
  breakdown: string[];
}

export class ScoringService {
  private config: ScoringConfig = {
    basePoints: {
      singleLine: 100,
      doubleLine: 250,
      fourCorners: 200,
      fullHouse: 500,
      customPattern: 200,
      letterT: 300,
      letterX: 350,
    },
    multipliers: {
      firstWin: 2.0,
      speedBonus: 1.5,
      perfection: 1.3,
    },
    timeBonus: {
      under30Seconds: 100,
      under1Minute: 50,
      under2Minutes: 25,
    },
  };

  calculateScore(
    patterns: WinPattern[],
    timeElapsed: number,
    isFirstWinner: boolean,
    mistakeCount: number
  ): ScoreCalculation {
    const breakdown: string[] = [];

    // Calculate base score from patterns
    const baseScore = patterns.reduce((sum, pattern) => {
      const points = this.getPatternPoints(pattern);
      breakdown.push(`${pattern.name}: ${points} pts`);
      return sum + points;
    }, 0);

    let totalScore = baseScore;

    // Time bonuses (additive)
    let timeBonus = 0;
    if (timeElapsed < 30) {
      timeBonus = this.config.timeBonus.under30Seconds;
      breakdown.push(`Speed Demon (<30s): +${timeBonus} pts`);
    } else if (timeElapsed < 60) {
      timeBonus = this.config.timeBonus.under1Minute;
      breakdown.push(`Quick Win (<1m): +${timeBonus} pts`);
    } else if (timeElapsed < 120) {
      timeBonus = this.config.timeBonus.under2Minutes;
      breakdown.push(`Fast Finish (<2m): +${timeBonus} pts`);
    }
    totalScore += timeBonus;

    // Multipliers (applied to base + time bonus)
    let finalMultiplier = 1.0;

    if (isFirstWinner) {
      finalMultiplier *= this.config.multipliers.firstWin;
      breakdown.push(`First Winner: ×${this.config.multipliers.firstWin}`);
    }

    if (timeElapsed < 120) {
      finalMultiplier *= this.config.multipliers.speedBonus;
      breakdown.push(`Speed Bonus: ×${this.config.multipliers.speedBonus}`);
    }

    if (mistakeCount === 0) {
      finalMultiplier *= this.config.multipliers.perfection;
      breakdown.push(`Perfect Game: ×${this.config.multipliers.perfection}`);
    }

    // Apply final multiplier
    totalScore = Math.round(totalScore * finalMultiplier);

    return {
      baseScore,
      timeBonus,
      speedMultiplier:
        timeElapsed < 120 ? this.config.multipliers.speedBonus : 1.0,
      perfectionMultiplier:
        mistakeCount === 0 ? this.config.multipliers.perfection : 1.0,
      firstWinMultiplier: isFirstWinner
        ? this.config.multipliers.firstWin
        : 1.0,
      totalScore,
      breakdown,
    };
  }

  private getPatternPoints(pattern: WinPattern): number {
    switch (pattern.type) {
      case 'single-line':
        return this.config.basePoints.singleLine;
      case 'double-line':
        return this.config.basePoints.doubleLine;
      case 'four-corners':
        return this.config.basePoints.fourCorners;
      case 'full-house':
        return this.config.basePoints.fullHouse;
      case 'letter-t':
        return this.config.basePoints.letterT;
      case 'letter-x':
        return this.config.basePoints.letterX;
      case 'custom':
        return this.config.basePoints.customPattern;
      default:
        return pattern.points || 100;
    }
  }

  // Get difficulty modifier based on board settings
  getDifficultyMultiplier(difficulty: string): number {
    const multipliers: Record<string, number> = {
      beginner: 0.8,
      easy: 1.0,
      medium: 1.2,
      hard: 1.5,
      expert: 2.0,
    };

    return multipliers[difficulty] || 1.0;
  }

  // Calculate placement bonus
  getPlacementPoints(placement: number, totalPlayers: number): number {
    if (placement === 1) return 100;
    if (placement === 2 && totalPlayers >= 3) return 50;
    if (placement === 3 && totalPlayers >= 4) return 25;
    return 0;
  }

  // Format score for display
  formatScore(score: number): string {
    if (score >= 1000000) {
      return `${(score / 1000000).toFixed(1)}M`;
    } else if (score >= 1000) {
      return `${(score / 1000).toFixed(1)}K`;
    }
    return score.toString();
  }

  // Get achievement thresholds
  getAchievementThresholds() {
    return {
      firstWin: 1,
      speedDemon: 30, // seconds
      perfectionist: 0, // mistakes
      highScore: 1000,
      winStreak: 5,
      gamesPlayed: [10, 50, 100, 500, 1000],
    };
  }
}
