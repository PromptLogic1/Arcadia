/**
 * Bingo Page Object
 *
 * Encapsulates all bingo game interactions and selectors.
 */

import type { Page } from '@playwright/test';
import { Locator } from '@playwright/test';
import { BasePage } from '../base.page';

export class BingoPage extends BasePage {
  // Selectors
  private readonly selectors = {
    // Board creation
    createBoardButton: '[data-testid="create-board-button"]',
    boardTitleInput: '[data-testid="board-title-input"]',
    boardDescriptionInput: '[data-testid="board-description-input"]',
    boardSizeSelect: '[data-testid="board-size-select"]',
    submitBoardButton: '[data-testid="submit-board-button"]',

    // Board elements
    bingoBoard: '[data-testid="bingo-board"]',
    bingoCell: '[data-testid="bingo-cell"]',
    cellInput: '[data-testid="cell-input"]',

    // Game controls
    startGameButton: '[data-testid="start-game-button"]',
    joinGameButton: '[data-testid="join-game-button"]',
    shareButton: '[data-testid="share-board-button"]',

    // Game status
    gameStatus: '[data-testid="game-status"]',
    playerList: '[data-testid="player-list"]',
    winnerBanner: '[data-testid="winner-banner"]',

    // Realtime indicators
    connectionStatus: '[data-testid="connection-status"]',
    syncIndicator: '[data-testid="sync-indicator"]',
  } as const;

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/bingo');
    await this.waitForPageLoad();
  }

  /**
   * Create a new bingo board
   */
  async createBoard(
    title: string,
    description: string,
    size: '3x3' | '4x4' | '5x5' = '5x5'
  ): Promise<void> {
    await this.clickElement(this.selectors.createBoardButton);
    await this.fillInput(this.selectors.boardTitleInput, title);
    await this.fillInput(this.selectors.boardDescriptionInput, description);

    const sizeSelect = this.getLocator(this.selectors.boardSizeSelect);
    await sizeSelect.selectOption(size);

    await this.clickElement(this.selectors.submitBoardButton);
  }

  /**
   * Fill board cells with content
   */
  async fillBoardCells(content: string[]): Promise<void> {
    const cells = await this.page.locator(this.selectors.cellInput).all();

    for (let i = 0; i < Math.min(content.length, cells.length); i++) {
      const cell = cells[i];
      const cellContent = content[i];
      if (cell && cellContent) {
        await cell.fill(cellContent);
      }
    }
  }

  /**
   * Start a new game
   */
  async startGame(): Promise<void> {
    await this.clickElement(this.selectors.startGameButton);
  }

  /**
   * Join an existing game
   */
  async joinGame(gameCode?: string): Promise<void> {
    if (gameCode) {
      await this.page.goto(`/bingo/game/${gameCode}`);
    } else {
      await this.clickElement(this.selectors.joinGameButton);
    }
  }

  /**
   * Mark a cell as complete
   */
  async markCell(index: number): Promise<void> {
    const cells = await this.page.locator(this.selectors.bingoCell).all();
    if (cells[index]) {
      await cells[index].click();
    }
  }

  /**
   * Get marked cells
   */
  async getMarkedCells(): Promise<number[]> {
    const cells = await this.page.locator(this.selectors.bingoCell).all();
    const markedIndices: number[] = [];

    for (let i = 0; i < cells.length; i++) {
      const marked = await cells[i]?.getAttribute('data-marked');
      const isMarked = marked === 'true';
      if (isMarked) {
        markedIndices.push(i);
      }
    }

    return markedIndices;
  }

  /**
   * Check if game has a winner
   */
  async hasWinner(): Promise<boolean> {
    return this.isElementVisible(this.selectors.winnerBanner);
  }

  /**
   * Get winner name
   */
  async getWinnerName(): Promise<string | null> {
    const banner = this.getLocator(this.selectors.winnerBanner);
    if (await banner.isVisible()) {
      return banner.textContent();
    }
    return null;
  }

  /**
   * Get current players
   */
  async getPlayers(): Promise<string[]> {
    const playerElements = await this.page
      .locator(`${this.selectors.playerList} [data-testid="player-name"]`)
      .all();
    const players: string[] = [];

    for (const element of playerElements) {
      const name = await element.textContent();
      if (name) players.push(name);
    }

    return players;
  }

  /**
   * Check if realtime connection is active
   */
  async isConnected(): Promise<boolean> {
    const status = await this.getElementText(this.selectors.connectionStatus);
    return status ? status.toLowerCase().includes('connected') : false;
  }

  /**
   * Wait for realtime sync
   */
  async waitForSync(): Promise<void> {
    await this.page.waitForSelector(this.selectors.syncIndicator, {
      state: 'hidden',
    });
  }

  /**
   * Share board
   */
  async shareBoard(): Promise<string | null> {
    await this.clickElement(this.selectors.shareButton);

    // Wait for share modal/toast
    await this.page.waitForTimeout(500);

    // Try to get share link from clipboard or modal
    const shareLink = await this.page.evaluate(() => {
      return navigator.clipboard.readText().catch(() => null);
    });

    return shareLink;
  }

  /**
   * Get game status
   */
  async getGameStatus(): Promise<string | null> {
    return this.getElementText(this.selectors.gameStatus);
  }

  /**
   * Check if board is editable
   */
  async isBoardEditable(): Promise<boolean> {
    const firstCell = this.page.locator(this.selectors.cellInput).first();
    return firstCell.isEnabled();
  }

  /**
   * Save board
   */
  async saveBoard(): Promise<void> {
    // Trigger save with keyboard shortcut
    await this.page.keyboard.press('Control+S');

    // Or click save button if available
    const saveButton = this.page.locator('[data-testid="save-board-button"]');
    if (await saveButton.isVisible()) {
      await saveButton.click();
    }
  }

  /**
   * Get board data
   */
  async getBoardData(): Promise<{
    title: string | null;
    cells: string[];
    size: number;
  }> {
    const title = await this.page
      .locator('[data-testid="board-title"]')
      .textContent();
    const cells = await this.page
      .locator(this.selectors.bingoCell)
      .allTextContents();
    const boardSize = Math.sqrt(cells.length);

    return {
      title,
      cells,
      size: boardSize,
    };
  }
}
