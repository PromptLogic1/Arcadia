import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Visual regression testing utilities for bingo boards
 */

// =============================================================================
// VISUAL STATE DEFINITIONS
// =============================================================================

export interface VisualState {
  name: string;
  description: string;
  setup: (page: Page) => Promise<void>;
  regions?: Array<{
    name: string;
    selector: string;
  }>;
}

export const BOARD_VISUAL_STATES: VisualState[] = [
  {
    name: 'empty-board',
    description: 'Empty bingo board with no marks',
    setup: async (_page) => {
      // Board is already empty after creation
    }
  },
  {
    name: 'partially-filled',
    description: 'Board with ~30% cells marked',
    setup: async (page) => {
      const positions = [0, 3, 7, 11, 14, 17, 21];
      for (const pos of positions) {
        const row = Math.floor(pos / 5);
        const col = pos % 5;
        await page.getByTestId(`grid-cell-${row}-${col}`).click();
      }
    }
  },
  {
    name: 'near-win',
    description: 'Board one cell away from winning',
    setup: async (page) => {
      // Mark 4 cells in top row
      for (let col = 0; col < 4; col++) {
        await page.getByTestId(`grid-cell-0-${col}`).click();
      }
    }
  },
  {
    name: 'winning-state',
    description: 'Board showing winning pattern',
    setup: async (page) => {
      // Complete horizontal line
      for (let col = 0; col < 5; col++) {
        await page.getByTestId(`grid-cell-1-${col}`).click();
      }
      // Close win dialog for screenshot
      await page.getByRole('button', { name: /close/i }).click();
    }
  },
  {
    name: 'multiple-players',
    description: 'Board with marks from multiple players',
    setup: async (page) => {
      // Simulate different player marks
      const player1Cells = [0, 6, 12, 18, 24]; // Diagonal
      const player2Cells = [1, 7, 13, 19]; // Almost diagonal
      
      for (const pos of player1Cells) {
        const row = Math.floor(pos / 5);
        const col = pos % 5;
        await page.evaluate(({ r, c }) => {
          const cell = document.querySelector(`[data-testid="grid-cell-${r}-${c}"]`);
          cell?.setAttribute('data-marked', 'true');
          cell?.setAttribute('data-player-color', '#06b6d4');
        }, { r: row, c: col });
      }
      
      for (const pos of player2Cells) {
        const row = Math.floor(pos / 5);
        const col = pos % 5;
        await page.evaluate(({ r, c }) => {
          const cell = document.querySelector(`[data-testid="grid-cell-${r}-${c}"]`);
          cell?.setAttribute('data-marked', 'true');
          cell?.setAttribute('data-player-color', '#8b5cf6');
        }, { r: row, c: col });
      }
    }
  }
];

// =============================================================================
// VISUAL COMPARISON UTILITIES
// =============================================================================

export interface VisualComparisonOptions {
  threshold?: number;
  maxDiffPixels?: number;
  animations?: 'disabled' | 'allow';
  maskSelectors?: string[]; // Store selectors separately
  clip?: { x: number; y: number; width: number; height: number };
  fullPage?: boolean;
}

export class VisualRegressionTester {
  private page: Page;
  private baselinePath: string;
  
  constructor(page: Page, baselinePath = 'visual-baselines/bingo') {
    this.page = page;
    this.baselinePath = baselinePath;
  }
  
  /**
   * Capture board state screenshots
   */
  async captureBoardStates(
    states: VisualState[] = BOARD_VISUAL_STATES
  ): Promise<Map<string, Buffer>> {
    const screenshots = new Map<string, Buffer>();
    
    for (const state of states) {
      // Apply state
      await state.setup(this.page);
      
      // Wait for animations to complete
      await this.page.waitForTimeout(500);
      
      // Disable animations for consistent screenshots
      await this.page.addStyleTag({
        content: `
          *, *::before, *::after {
            animation-duration: 0s !important;
            animation-delay: 0s !important;
            transition-duration: 0s !important;
            transition-delay: 0s !important;
          }
        `
      });
      
      // Capture full board
      const boardElement = this.page.getByTestId('bingo-grid');
      const screenshot = await boardElement.screenshot({
        animations: 'disabled'
      });
      
      screenshots.set(state.name, screenshot);
      
      // Capture regions if specified
      if (state.regions) {
        for (const region of state.regions) {
          const regionScreenshot = await this.page.locator(region.selector).screenshot({
            animations: 'disabled'
          });
          screenshots.set(`${state.name}-${region.name}`, regionScreenshot);
        }
      }
    }
    
    return screenshots;
  }
  
  /**
   * Compare screenshots with baselines
   */
  async compareWithBaselines(
    screenshots: Map<string, Buffer>,
    options: VisualComparisonOptions = {}
  ): Promise<Map<string, { pass: boolean; diff?: number }>> {
    const results = new Map<string, { pass: boolean; diff?: number }>();
    
    const {
      threshold = 0.1,
      maxDiffPixels = 100,
      animations = 'disabled'
    } = options;
    
    for (const [name, screenshot] of Array.from(screenshots)) {
      try {
        await expect(screenshot).toMatchSnapshot(`${this.baselinePath}/${name}.png`, {
          threshold,
          maxDiffPixels
        });
        results.set(name, { pass: true });
      } catch (error) {
        // Extract diff percentage from error message if available
        const diffMatch = error.message?.match(/(\d+\.?\d*)%/);
        const diff = diffMatch ? parseFloat(diffMatch[1]) : undefined;
        results.set(name, { pass: false, diff });
      }
    }
    
    return results;
  }
  
  /**
   * Test responsive board layouts
   */
  async testResponsiveLayouts(
    viewports: Array<{ width: number; height: number; name: string }>
  ): Promise<Map<string, Buffer>> {
    const screenshots = new Map<string, Buffer>();
    
    for (const viewport of viewports) {
      await this.page.setViewportSize(viewport);
      await this.page.waitForTimeout(300); // Wait for layout adjustment
      
      const screenshot = await this.page.getByTestId('bingo-grid').screenshot({
        animations: 'disabled'
      });
      
      screenshots.set(`responsive-${viewport.name}`, screenshot);
    }
    
    return screenshots;
  }
  
  /**
   * Test theme variations
   */
  async testThemeVariations(): Promise<Map<string, Buffer>> {
    const screenshots = new Map<string, Buffer>();
    const themes = ['light', 'dark', 'high-contrast'];
    
    for (const theme of themes) {
      // Apply theme
      await this.page.evaluate((themeName) => {
        document.documentElement.setAttribute('data-theme', themeName);
      }, theme);
      
      await this.page.waitForTimeout(100); // Wait for theme application
      
      const screenshot = await this.page.getByTestId('bingo-grid').screenshot({
        animations: 'disabled'
      });
      
      screenshots.set(`theme-${theme}`, screenshot);
    }
    
    return screenshots;
  }
  
  /**
   * Test hover and focus states
   */
  async testInteractionStates(): Promise<Map<string, Buffer>> {
    const screenshots = new Map<string, Buffer>();
    
    // Hover state
    const centerCell = this.page.getByTestId('grid-cell-2-2');
    await centerCell.hover();
    screenshots.set('hover-state', await centerCell.screenshot());
    
    // Focus state
    await centerCell.focus();
    screenshots.set('focus-state', await centerCell.screenshot());
    
    // Active/pressed state
    await centerCell.hover();
    await this.page.mouse.down();
    screenshots.set('active-state', await centerCell.screenshot());
    await this.page.mouse.up();
    
    // Marked cell states
    await centerCell.click();
    screenshots.set('marked-state', await centerCell.screenshot());
    
    // Winning cell state
    await this.page.evaluate(() => {
      const cell = document.querySelector('[data-testid="grid-cell-2-2"]');
      cell?.classList.add('winning-cell');
    });
    screenshots.set('winning-cell-state', await centerCell.screenshot());
    
    return screenshots;
  }
}

// =============================================================================
// ANIMATION TESTING
// =============================================================================

export class AnimationTester {
  private page: Page;
  
  constructor(page: Page) {
    this.page = page;
  }
  
  /**
   * Test win animation frames
   */
  async captureWinAnimation(): Promise<Buffer[]> {
    const frames: Buffer[] = [];
    const frameCount = 10;
    const frameDuration = 100; // ms
    
    // Trigger win
    for (let col = 0; col < 5; col++) {
      await this.page.getByTestId(`grid-cell-0-${col}`).click();
    }
    
    // Capture animation frames
    for (let i = 0; i < frameCount; i++) {
      const screenshot = await this.page.screenshot({
        clip: await this.getBoardClip()
      });
      frames.push(screenshot);
      await this.page.waitForTimeout(frameDuration);
    }
    
    return frames;
  }
  
  /**
   * Test cell marking animation
   */
  async captureCellAnimation(): Promise<Buffer[]> {
    const frames: Buffer[] = [];
    const cell = this.page.getByTestId('grid-cell-2-2');
    
    // Start recording before click
    const capturePromise = this.captureFrames(cell, 500, 50);
    
    // Click cell
    await cell.click();
    
    // Wait for capture to complete
    return await capturePromise;
  }
  
  /**
   * Helper to capture animation frames
   */
  private async captureFrames(
    element: Locator,
    duration: number,
    interval: number
  ): Promise<Buffer[]> {
    const frames: Buffer[] = [];
    const frameCount = Math.floor(duration / interval);
    
    for (let i = 0; i < frameCount; i++) {
      frames.push(await element.screenshot());
      await this.page.waitForTimeout(interval);
    }
    
    return frames;
  }
  
  /**
   * Get board clipping region
   */
  private async getBoardClip(): Promise<{ x: number; y: number; width: number; height: number }> {
    const board = this.page.getByTestId('bingo-grid');
    const box = await board.boundingBox();
    
    if (!box) {
      throw new Error('Could not get board bounding box');
    }
    
    return {
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height
    };
  }
}

// =============================================================================
// ACCESSIBILITY VISUAL TESTING
// =============================================================================

export class AccessibilityVisualTester {
  private page: Page;
  
  constructor(page: Page) {
    this.page = page;
  }
  
  /**
   * Test focus indicators
   */
  async testFocusIndicators(): Promise<Map<string, Buffer>> {
    const screenshots = new Map<string, Buffer>();
    
    // Tab through interactive elements
    const interactiveElements = [
      'grid-cell-0-0',
      'grid-cell-2-2',
      'grid-cell-4-4',
      'game-controls',
      'session-code'
    ];
    
    for (const elementId of interactiveElements) {
      await this.page.keyboard.press('Tab');
      await this.page.waitForTimeout(100);
      
      const element = this.page.getByTestId(elementId);
      if (await element.isVisible()) {
        screenshots.set(`focus-${elementId}`, await element.screenshot());
      }
    }
    
    return screenshots;
  }
  
  /**
   * Test high contrast mode
   */
  async testHighContrast(): Promise<Map<string, Buffer>> {
    const screenshots = new Map<string, Buffer>();
    
    // Enable high contrast
    await this.page.evaluate(() => {
      document.documentElement.setAttribute('data-contrast', 'high');
    });
    
    // Capture various states
    screenshots.set('high-contrast-empty', await this.page.getByTestId('bingo-grid').screenshot());
    
    // Mark some cells
    for (let i = 0; i < 5; i++) {
      await this.page.getByTestId(`grid-cell-${i}-${i}`).click();
    }
    
    screenshots.set('high-contrast-marked', await this.page.getByTestId('bingo-grid').screenshot());
    
    return screenshots;
  }
  
  /**
   * Test color blind modes
   */
  async testColorBlindModes(): Promise<Map<string, Buffer>> {
    const screenshots = new Map<string, Buffer>();
    const modes = ['protanopia', 'deuteranopia', 'tritanopia'];
    
    // Set up multi-player marks
    await this.setupMultiPlayerMarks();
    
    for (const mode of modes) {
      await this.page.evaluate((colorMode) => {
        document.documentElement.setAttribute('data-colorblind', colorMode);
      }, mode);
      
      await this.page.waitForTimeout(100);
      
      screenshots.set(`colorblind-${mode}`, await this.page.getByTestId('bingo-grid').screenshot());
    }
    
    return screenshots;
  }
  
  /**
   * Helper to set up multi-player marks
   */
  private async setupMultiPlayerMarks(): Promise<void> {
    const playerMarks = [
      { cells: [0, 5, 10, 15, 20], color: '#06b6d4' },
      { cells: [1, 6, 11, 16, 21], color: '#8b5cf6' },
      { cells: [2, 7, 12, 17, 22], color: '#ec4899' }
    ];
    
    for (const { cells, color } of playerMarks) {
      for (const pos of cells) {
        const row = Math.floor(pos / 5);
        const col = pos % 5;
        await this.page.evaluate(({ r, c, playerColor }) => {
          const cell = document.querySelector(`[data-testid="grid-cell-${r}-${c}"]`);
          cell?.setAttribute('data-marked', 'true');
          cell?.setAttribute('data-player-color', playerColor);
        }, { r: row, c: col, playerColor: color });
      }
    }
  }
}

// =============================================================================
// VISUAL TEST ASSERTIONS
// =============================================================================

export async function assertVisualMatch(
  page: Page,
  name: string,
  options?: VisualComparisonOptions
): Promise<void> {
  const element = page.getByTestId('bingo-grid');
  
  // Convert custom options to Playwright format
  const playwrightOptions: {
    threshold?: number;
    maxDiffPixels?: number;
    animations?: 'disabled' | 'allow';
    clip?: { x: number; y: number; width: number; height: number };
    fullPage?: boolean;
    mask?: Locator[];
  } = {
    threshold: options?.threshold,
    maxDiffPixels: options?.maxDiffPixels,
    animations: options?.animations,
    clip: options?.clip,
    fullPage: options?.fullPage
  };
  
  // Handle mask selectors
  if (options?.maskSelectors) {
    playwrightOptions.mask = options.maskSelectors.map(selector => 
      page.locator(selector)
    );
  }
  
  await expect(element).toHaveScreenshot(`${name}.png`, playwrightOptions);
}

export async function assertNoVisualRegression(
  page: Page,
  state: VisualState,
  options?: VisualComparisonOptions
): Promise<void> {
  await state.setup(page);
  await assertVisualMatch(page, state.name, options);
}