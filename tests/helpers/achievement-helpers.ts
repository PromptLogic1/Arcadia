import type { Page } from '@playwright/test';
import type { Tables } from '../../types/database.types';

/**
 * Achievement notification type
 */
export interface AchievementNotification {
  title: string;
  description?: string;
  points: number;
  icon?: string;
  rarity?: string;
}

/**
 * Achievement progress update
 */
export interface AchievementProgress {
  achievementId: string;
  currentProgress: number;
  maxProgress: number;
  percentage: number;
}

/**
 * Achievement unlock result
 */
export interface AchievementUnlockResult {
  success: boolean;
  achievement?: Tables<'user_achievements'>;
  notification?: AchievementNotification;
  error?: string;
}

/**
 * Achievement test helper for managing achievement-related testing
 */
export class AchievementTestHelper {
  private unlockedAchievements = new Set<string>();
  private progressTracking = new Map<string, AchievementProgress>();

  constructor(private page: Page) {
    this.setupInterceptors();
  }

  /**
   * Set up request interceptors for achievement tracking
   */
  private setupInterceptors() {
    // Track achievement unlocks
    this.page.on('response', async response => {
      if (response.url().includes('/api/achievements/unlock') && response.ok()) {
        try {
          const data = await response.json();
          if (data.success && data.achievement) {
            this.unlockedAchievements.add(data.achievement.id);
          }
        } catch {
          // Ignore parse errors
        }
      }
    });
  }

  /**
   * Unlock an achievement by triggering an action
   */
  async unlockAchievement(
    achievementId: string,
    triggerAction: () => Promise<void>
  ): Promise<AchievementUnlockResult> {
    // Set up response listener
    const unlockPromise = this.page.waitForResponse(
      resp => resp.url().includes('/api/achievements/unlock') &&
              resp.request().postDataJSON()?.achievement_id === achievementId,
      { timeout: 10000 }
    ).catch(() => null);

    // Execute the trigger action
    await triggerAction();

    // Wait for unlock response
    const response = await unlockPromise;
    
    if (!response) {
      return { success: false, error: 'No unlock request detected' };
    }

    const data = await response.json();
    
    // Get notification if displayed
    const notification = await this.getNotification();

    return {
      success: data.success,
      achievement: data.achievement,
      notification: notification || undefined,
      error: data.error
    };
  }

  /**
   * Get displayed achievement notification
   */
  async getNotification(timeout = 5000): Promise<AchievementNotification | null> {
    try {
      const notificationSelector = '[data-testid="achievement-notification"], [data-testid="achievement-unlocked"]';
      await this.page.waitForSelector(notificationSelector, { timeout });
      
      const notification = this.page.locator(notificationSelector).first();
      
      const title = await notification.locator('[data-testid="achievement-title"], h3, h4').textContent();
      const description = await notification.locator('[data-testid="achievement-description"], p').textContent().catch(() => null);
      const pointsText = await notification.locator('[data-testid="achievement-points"], .points').textContent();
      const icon = await notification.locator('[data-testid="achievement-icon"], .icon').textContent().catch(() => null);
      const rarity = await notification.locator('[data-testid="achievement-rarity"], .rarity').textContent().catch(() => null);

      // Extract points number from text like "100 points" or "+100"
      const points = parseInt(pointsText?.match(/\d+/)?.[0] || '0');

      return {
        title: title || '',
        description: description || undefined,
        points,
        icon: icon || undefined,
        rarity: rarity || undefined
      };
    } catch {
      return null;
    }
  }

  /**
   * Wait for achievement unlock
   */
  async waitForUnlock(achievementId: string, timeout = 10000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (this.unlockedAchievements.has(achievementId)) {
        return true;
      }
      
      // Check if achievement is marked as unlocked in UI
      const achievementCard = this.page.locator(`[data-testid="achievement-${achievementId}"]`);
      if (await achievementCard.count() > 0) {
        const isUnlocked = await achievementCard.getAttribute('data-unlocked') === 'true';
        if (isUnlocked) {
          this.unlockedAchievements.add(achievementId);
          return true;
        }
      }
      
      await this.page.waitForTimeout(100);
    }
    
    return false;
  }

  /**
   * Track achievement progress
   */
  async trackProgress(achievementId: string): Promise<AchievementProgress | null> {
    const achievementCard = this.page.locator(`[data-testid="achievement-${achievementId}"]`);
    
    if (await achievementCard.count() === 0) {
      return null;
    }

    // Try different selectors for progress
    const progressBar = achievementCard.locator('[role="progressbar"], [data-testid="progress-bar"]');
    const progressText = achievementCard.locator('[data-testid="progress-text"], .progress');

    let currentProgress = 0;
    let maxProgress = 1;

    // Get progress from progress bar
    if (await progressBar.count() > 0) {
      const currentStr = await progressBar.getAttribute('aria-valuenow');
      const maxStr = await progressBar.getAttribute('aria-valuemax');
      
      if (currentStr && maxStr) {
        currentProgress = parseInt(currentStr);
        maxProgress = parseInt(maxStr);
      }
    }

    // Get progress from text (e.g., "3/5" or "60%")
    if (await progressText.count() > 0) {
      const text = await progressText.textContent();
      const fractionMatch = text?.match(/(\d+)\s*\/\s*(\d+)/);
      const percentMatch = text?.match(/(\d+)%/);
      
      if (fractionMatch && fractionMatch[1] && fractionMatch[2]) {
        currentProgress = parseInt(fractionMatch[1]);
        maxProgress = parseInt(fractionMatch[2]);
      } else if (percentMatch && percentMatch[1]) {
        const percentage = parseInt(percentMatch[1]);
        currentProgress = percentage;
        maxProgress = 100;
      }
    }

    const percentage = maxProgress > 0 ? (currentProgress / maxProgress) * 100 : 0;

    const progress: AchievementProgress = {
      achievementId,
      currentProgress,
      maxProgress,
      percentage
    };

    this.progressTracking.set(achievementId, progress);
    return progress;
  }

  /**
   * Wait for progress update
   */
  async waitForProgressUpdate(
    achievementId: string,
    expectedProgress: number,
    timeout = 5000
  ): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const progress = await this.trackProgress(achievementId);
      
      if (progress && progress.currentProgress >= expectedProgress) {
        return true;
      }
      
      await this.page.waitForTimeout(100);
    }
    
    return false;
  }

  /**
   * Verify achievement display
   */
  async verifyAchievementDisplay(achievementId: string) {
    const achievementCard = this.page.locator(`[data-testid="achievement-${achievementId}"]`);
    
    return {
      isVisible: await achievementCard.isVisible(),
      isUnlocked: await achievementCard.getAttribute('data-unlocked') === 'true',
      title: await achievementCard.locator('[data-testid="achievement-title"]').textContent(),
      description: await achievementCard.locator('[data-testid="achievement-description"]').textContent(),
      points: await achievementCard.locator('[data-testid="achievement-points"]').textContent(),
      icon: await achievementCard.locator('[data-testid="achievement-icon"]').textContent(),
      rarity: await achievementCard.getAttribute('data-rarity')
    };
  }

  /**
   * Get achievement statistics
   */
  async getStatistics() {
    const statsSection = this.page.locator('[data-testid="achievement-stats"]');
    
    if (await statsSection.count() === 0) {
      return null;
    }

    return {
      totalPoints: await this.extractNumber(statsSection, '[data-testid="total-points"]'),
      unlockedCount: await this.extractNumber(statsSection, '[data-testid="unlocked-count"]'),
      totalCount: await this.extractNumber(statsSection, '[data-testid="total-count"]'),
      completionRate: await this.extractNumber(statsSection, '[data-testid="completion-rate"]'),
      recentUnlocks: await this.extractNumber(statsSection, '[data-testid="recent-unlocks"]')
    };
  }

  /**
   * Extract number from element text
   */
  private async extractNumber(parent: ReturnType<Page['locator']>, selector: string): Promise<number> {
    try {
      const element = parent.locator(selector);
      const text = await element.textContent();
      const match = text?.match(/\d+/);
      return match ? parseInt(match[0]) : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Test achievement unlock flow
   */
  async testUnlockFlow(config: {
    achievementId: string;
    triggerAction: () => Promise<void>;
    expectedPoints: number;
    expectedNotification?: Partial<AchievementNotification>;
  }) {
    const { achievementId, triggerAction, expectedPoints, expectedNotification } = config;

    // Verify achievement is locked initially
    const initialDisplay = await this.verifyAchievementDisplay(achievementId);
    if (initialDisplay.isUnlocked) {
      throw new Error(`Achievement ${achievementId} is already unlocked`);
    }

    // Unlock achievement
    const result = await this.unlockAchievement(achievementId, triggerAction);
    
    if (!result.success) {
      throw new Error(`Failed to unlock achievement: ${result.error}`);
    }

    // Verify notification
    if (result.notification) {
      if (expectedNotification?.title) {
        if (!result.notification.title.includes(expectedNotification.title)) {
          throw new Error(`Expected notification title to include "${expectedNotification.title}"`);
        }
      }
      
      if (expectedPoints && result.notification.points !== expectedPoints) {
        throw new Error(`Expected ${expectedPoints} points but got ${result.notification.points}`);
      }
    }

    // Wait for UI update
    await this.waitForUnlock(achievementId);

    // Verify achievement is now unlocked
    const finalDisplay = await this.verifyAchievementDisplay(achievementId);
    if (!finalDisplay.isUnlocked) {
      throw new Error(`Achievement ${achievementId} not marked as unlocked in UI`);
    }

    return {
      ...result,
      initialDisplay,
      finalDisplay
    };
  }

  /**
   * Test achievement progress flow
   */
  async testProgressFlow(config: {
    achievementId: string;
    steps: Array<{
      action: () => Promise<void>;
      expectedProgress: number;
    }>;
    maxProgress: number;
  }) {
    const { achievementId, steps, maxProgress } = config;

    const progressHistory: AchievementProgress[] = [];

    for (let index = 0; index < steps.length; index++) {
      const step = steps[index];
      if (!step) continue;
      
      // Execute action
      await step.action();

      // Wait for progress update
      const updated = await this.waitForProgressUpdate(
        achievementId,
        step.expectedProgress
      );

      if (!updated) {
        throw new Error(`Progress did not update to ${step.expectedProgress} at step ${index + 1}`);
      }

      // Track progress
      const progress = await this.trackProgress(achievementId);
      if (progress) {
        progressHistory.push(progress);
      }
    }

    // Verify final state
    const finalProgress = progressHistory[progressHistory.length - 1];
    if (finalProgress && finalProgress.currentProgress === maxProgress) {
      // Achievement should be unlocked
      const isUnlocked = await this.waitForUnlock(achievementId);
      if (!isUnlocked) {
        throw new Error('Achievement not unlocked after reaching max progress');
      }
    }

    return {
      progressHistory,
      finalProgress
    };
  }

  /**
   * Get all unlocked achievements
   */
  getUnlockedAchievements(): string[] {
    return Array.from(this.unlockedAchievements);
  }

  /**
   * Clear tracking data
   */
  clearTracking() {
    this.unlockedAchievements.clear();
    this.progressTracking.clear();
  }
}

/**
 * Helper function to create achievement test context
 */
export async function createAchievementContext(page: Page) {
  const helper = new AchievementTestHelper(page);
  
  return {
    achievements: helper,
    cleanup: () => helper.clearTracking()
  };
}