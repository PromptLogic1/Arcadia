/**
 * Lazy-loaded components for the bingo boards feature
 *
 * These components are loaded on-demand to improve initial page load
 */

import { lazy } from 'react';

// Board editing components
export const BingoBoardEdit = lazy(() =>
  import('./bingo-boards-edit/BingoBoardEdit').then(mod => ({
    default: mod.BingoBoardEdit,
  }))
);

export const CardLibrary = lazy(() =>
  import('./bingo-boards-edit/CardLibrary').then(mod => ({
    default: mod.CardLibrary,
  }))
);

export const BoardCollections = lazy(() =>
  import('./bingo-boards-edit/BoardCollections').then(mod => ({
    default: mod.BoardCollections,
  }))
);

export const GeneratorPanel = lazy(() =>
  import('./Generator/GeneratorPanel').then(mod => ({
    default: mod.GeneratorPanel,
  }))
);

// Game components
export const BingoGrid = lazy(() =>
  import('./bingo-boards-edit/BingoGrid').then(mod => ({
    default: mod.BingoGrid,
  }))
);

export const WinnerModal = lazy(() =>
  import('./Board/WinnerModal').then(mod => ({
    default: mod.WinnerModal,
  }))
);

export const WinnerAnnouncement = lazy(() =>
  import('./Board/WinnerAnnouncement').then(mod => ({
    default: mod.WinnerAnnouncement,
  }))
);

// Dialog components
export const JoinSessionDialog = lazy(() =>
  import('./JoinSessionDialog').then(mod => ({
    default: mod.JoinSessionDialog,
  }))
);

export const CreateBoardForm = lazy(() =>
  import('./CreateBoardForm').then(mod => ({
    default: mod.CreateBoardForm,
  }))
);

// Control components
export const GameSettings = lazy(() =>
  import('./game-controls/GameSettings').then(mod => ({
    default: mod.GameSettings,
  }))
);

export const PlayerManagement = lazy(() =>
  import('./game-controls/PlayerManagement').then(mod => ({
    default: mod.PlayerManagement,
  }))
);

export const TimerControls = lazy(() =>
  import('./game-controls/TimerControls').then(mod => ({
    default: mod.TimerControls,
  }))
);
