import dynamic from 'next/dynamic';

// Immediate loading (core functionality)
export { default as BingoBoardsHub } from './components/BingoBoardsHub';
export { BingoErrorBoundary } from './components/BingoErrorBoundary';

// Deferred loading (user interaction required)
export const BingoBoardEdit = dynamic(
  () =>
    import('./components/bingo-boards-edit/BingoBoardEdit').then(mod => ({
      default: mod.BingoBoardEdit,
    })),
  { loading: () => null }
);

export const BoardCard = dynamic(() => import('./components/BoardCard'), {
  loading: () => null,
});
