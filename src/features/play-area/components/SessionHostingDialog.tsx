'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Switch } from '@/components/ui/Switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Gamepad2, Grid3X3, Search, Plus, Key } from '@/components/ui/Icons';
import { cn } from '@/lib/utils';
import { log } from '@/lib/logger';
import { useAuth } from '@/lib/stores/auth-store';
import { notifications } from '@/lib/notifications';
import { toError } from '@/lib/error-guards';
import {
  useBoardsBySectionQuery,
  usePublicBoardsQuery,
} from '@/hooks/queries/useBingoBoardsQueries';

// Types
import type { GameCategory, SessionSettings } from '../types';
import type { Difficulty } from '@/types';

interface BingoBoard {
  id: string;
  title: string;
  description: string | null;
  game_type: GameCategory;
  difficulty: Difficulty;
  size: number | null;
  is_public: boolean | null;
  created_at: string | null;
  creator_id: string | null;
}

interface SessionHostingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateSession: (
    boardId: string,
    settings: SessionSettings
  ) => Promise<void>;
  preSelectedBoardId?: string;
}

/**
 * Session Hosting Dialog Component
 * Allows users to configure and create new gaming sessions
 */
export function SessionHostingDialog({
  isOpen,
  onClose,
  onCreateSession,
  preSelectedBoardId,
}: SessionHostingDialogProps) {
  const { authUser } = useAuth();

  // UI state management (no server state!)
  const [selectedBoard, setSelectedBoard] = useState<BingoBoard | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Simple session settings (most moved to session page)
  const [sessionPassword, setSessionPassword] = useState('');
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);

  // Server state via TanStack Query
  const {
    data: userBoardsResponse,
    isLoading: userBoardsLoading,
    error: userBoardsError,
  } = useBoardsBySectionQuery(
    'my-boards',
    { search: searchQuery },
    1,
    20,
    authUser?.id
  );

  const {
    data: publicBoardsResponse,
    isLoading: publicBoardsLoading,
    error: publicBoardsError,
  } = usePublicBoardsQuery({ search: searchQuery }, 1, 30);

  // Derived state - handle undefined and error states
  const userBoards = useMemo(
    () =>
      userBoardsResponse && 'boards' in userBoardsResponse
        ? userBoardsResponse.boards
        : [],
    [userBoardsResponse]
  );
  const publicBoards = useMemo(
    () =>
      publicBoardsResponse && 'boards' in publicBoardsResponse
        ? publicBoardsResponse.boards
        : [],
    [publicBoardsResponse]
  );
  const boardsLoading = userBoardsLoading || publicBoardsLoading;
  const boardsError = userBoardsError || publicBoardsError;

  // Handle error states inline when queries fail
  const boardsErrorMessage = useMemo(() => {
    if (boardsError) {
      log.error('Failed to load boards', toError(boardsError), {
        metadata: {
          userId: authUser?.id,
        },
      });
      return 'Failed to load boards';
    }
    return null;
  }, [boardsError, authUser?.id]);

  // Find pre-selected board if provided
  const preSelectedBoard = useMemo(() => {
    if (!preSelectedBoardId) return null;

    // Find the pre-selected board in user boards first, then public boards
    return (
      userBoards.find((board: BingoBoard) => board.id === preSelectedBoardId) ||
      publicBoards.find(
        (board: BingoBoard) => board.id === preSelectedBoardId
      ) ||
      null
    );
  }, [preSelectedBoardId, userBoards, publicBoards]);

  // Update selected board when pre-selected board is found
  const effectiveSelectedBoard = selectedBoard || preSelectedBoard;

  // Reset state when dialog closes - done via onClose callback
  const handleClose = useCallback(() => {
    setSelectedBoard(null);
    setSearchQuery('');
    setSessionPassword('');
    setIsPasswordProtected(false);
    onClose();
  }, [onClose]);

  // Handle session creation
  const handleCreateSession = useCallback(async () => {
    const boardToUse = selectedBoard || preSelectedBoard;
    if (!boardToUse) {
      notifications.error('Please select a board first');
      return;
    }

    // Double-check authentication
    if (!authUser?.id) {
      notifications.error('You must be logged in to create a session');
      setLoading(false);
      return;
    }

    setLoading(true);

    const sessionSettings: SessionSettings = {
      max_players: null,
      allow_spectators: null,
      auto_start: null,
      time_limit: null,
      require_approval: null,
      password:
        isPasswordProtected && sessionPassword.trim()
          ? sessionPassword.trim()
          : null,
    };

    try {
      await onCreateSession(boardToUse.id, sessionSettings);
      handleClose();
    } catch (error) {
      log.error('Failed to create session', toError(error), {
        metadata: {
          component: 'SessionHostingDialog',
          boardId: boardToUse?.id,
          sessionSettings,
          userId: authUser?.id,
        },
      });
      notifications.error('Failed to create session. Please try again.');
      setLoading(false);
    }
  }, [
    selectedBoard,
    preSelectedBoard,
    isPasswordProtected,
    sessionPassword,
    onCreateSession,
    handleClose,
    authUser?.id,
  ]);

  // Filter boards based on search
  const filterBoards = (boards: BingoBoard[]) => {
    if (!searchQuery.trim()) return boards;

    const query = searchQuery.toLowerCase();
    return boards.filter(
      board =>
        board.title.toLowerCase().includes(query) ||
        board.description?.toLowerCase().includes(query) ||
        board.game_type.toLowerCase().includes(query)
    );
  };

  const filteredUserBoards = filterBoards(userBoards);
  const filteredPublicBoards = filterBoards(publicBoards);

  const getDifficultyColor = (difficulty: Difficulty) => {
    const colors: Record<Difficulty, string> = {
      beginner: 'bg-green-500/20 text-green-400 border-green-500/30',
      easy: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      hard: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      expert: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return (
      colors[difficulty] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl border-cyan-500/30 bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 shadow-2xl shadow-cyan-500/10">
        <DialogHeader>
          <DialogTitle className="bg-gradient-to-r from-cyan-400 via-purple-400 to-fuchsia-400 bg-clip-text text-2xl font-bold text-transparent drop-shadow-lg">
            Host New Session
          </DialogTitle>
          <DialogDescription className="text-cyan-100/80">
            {preSelectedBoardId
              ? 'Board selected from Challenge Hub. Configure your session settings below.'
              : 'Choose a board and configure your multiplayer gaming session'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Board Selection */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Gamepad2 className="h-5 w-5 text-cyan-400 drop-shadow-lg" />
              <h3 className="text-lg font-semibold text-cyan-100 drop-shadow-sm">
                Select Board
              </h3>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cyan-400/70" />
              <Input
                variant="cyber"
                placeholder="Search boards..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Board Tabs */}
            <Tabs defaultValue="my-boards" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2 border-cyan-500/30 bg-slate-800/50 backdrop-blur-sm">
                <TabsTrigger
                  value="my-boards"
                  className="text-cyan-200/70 data-[state=active]:border-cyan-400/50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500/20 data-[state=active]:to-purple-500/20 data-[state=active]:text-cyan-100"
                >
                  My Boards ({userBoards.length})
                </TabsTrigger>
                <TabsTrigger
                  value="public-boards"
                  className="text-cyan-200/70 data-[state=active]:border-purple-400/50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500/20 data-[state=active]:to-fuchsia-500/20 data-[state=active]:text-cyan-100"
                >
                  Public Boards ({publicBoards.length})
                </TabsTrigger>
              </TabsList>

              {boardsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner />
                </div>
              ) : boardsErrorMessage ? (
                <div className="py-8 text-center text-red-400">
                  <p className="mb-2">{boardsErrorMessage}</p>
                  <p className="text-sm text-cyan-300/70">
                    Please try again later
                  </p>
                </div>
              ) : (
                <>
                  <TabsContent value="my-boards">
                    <ScrollArea className="h-[300px] pr-4">
                      {filteredUserBoards.length === 0 ? (
                        <div className="py-8 text-center text-cyan-300/60">
                          <Gamepad2 className="mx-auto mb-3 h-12 w-12 text-cyan-400 opacity-50" />
                          <p className="mb-2 text-cyan-200">No boards found</p>
                          {userBoards.length === 0 ? (
                            <p className="text-sm text-cyan-300/70">
                              Create your first board in the Challenge Hub!
                            </p>
                          ) : (
                            <p className="text-sm text-cyan-300/70">
                              Try adjusting your search
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {filteredUserBoards.map(board => (
                            <BoardCard
                              key={board.id}
                              board={board}
                              isSelected={
                                effectiveSelectedBoard?.id === board.id
                              }
                              onSelect={() => setSelectedBoard(board)}
                            />
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="public-boards">
                    <ScrollArea className="h-[300px] pr-4">
                      {filteredPublicBoards.length === 0 ? (
                        <div className="py-8 text-center text-cyan-300/60">
                          <Gamepad2 className="mx-auto mb-3 h-12 w-12 text-purple-400 opacity-50" />
                          <p className="mb-2 text-cyan-200">
                            No public boards found
                          </p>
                          <p className="text-sm text-cyan-300/70">
                            Try adjusting your search
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {filteredPublicBoards.map(board => (
                            <BoardCard
                              key={board.id}
                              board={board}
                              isSelected={
                                effectiveSelectedBoard?.id === board.id
                              }
                              onSelect={() => setSelectedBoard(board)}
                            />
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>
                </>
              )}
            </Tabs>
          </div>

          {/* Simple Session Options */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-purple-400 drop-shadow-lg" />
              <h3 className="text-lg font-semibold text-cyan-100 drop-shadow-sm">
                Session Options
              </h3>
            </div>

            <Card className="border-purple-500/30 bg-gradient-to-br from-slate-800/50 to-purple-900/20 shadow-lg shadow-purple-500/10 backdrop-blur-sm">
              <CardContent className="space-y-4 p-4">
                {/* Password Protection */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-cyan-200">
                      Password protect session
                    </Label>
                    <Switch
                      checked={isPasswordProtected}
                      onCheckedChange={setIsPasswordProtected}
                      className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-purple-500 data-[state=checked]:to-fuchsia-500"
                    />
                  </div>

                  {isPasswordProtected && (
                    <div className="space-y-2">
                      <Input
                        variant="cyber"
                        placeholder="Enter session password"
                        type="password"
                        value={sessionPassword}
                        onChange={e => setSessionPassword(e.target.value)}
                      />
                      <p className="text-xs text-cyan-300/70">
                        Players will need this password to join your session
                      </p>
                    </div>
                  )}
                </div>

                <p className="text-sm text-cyan-300/70">
                  Additional settings can be configured after creating the
                  session.
                </p>
              </CardContent>
            </Card>

            {/* Selected Board Preview */}
            {effectiveSelectedBoard && (
              <Card className="border-cyan-500/30 bg-gradient-to-br from-slate-800/50 to-cyan-900/20 shadow-lg shadow-cyan-500/10 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-cyan-200">
                    Selected Board
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 p-4 pt-0">
                  <h4 className="truncate font-medium text-cyan-100">
                    {effectiveSelectedBoard.title}
                  </h4>
                  <div className="flex gap-2">
                    <Badge
                      variant="cyber"
                      className={getDifficultyColor(
                        effectiveSelectedBoard.difficulty
                      )}
                    >
                      {effectiveSelectedBoard.difficulty}
                    </Badge>
                    <Badge
                      variant="cyber"
                      className="border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                    >
                      <Grid3X3 className="mr-1 h-3 w-3" />
                      {effectiveSelectedBoard.size || 5}×
                      {effectiveSelectedBoard.size || 5}
                    </Badge>
                  </div>
                  {effectiveSelectedBoard.description && (
                    <p className="line-clamp-2 text-sm text-cyan-300/70">
                      {effectiveSelectedBoard.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="primary"
            onClick={handleClose}
            className="border-cyan-500/30 text-cyan-300 backdrop-blur-sm hover:border-cyan-400 hover:bg-cyan-500/10"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateSession}
            disabled={!effectiveSelectedBoard || loading}
            className="border-0 bg-gradient-to-r from-cyan-500 via-purple-500 to-fuchsia-500 font-semibold text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-600 hover:via-purple-600 hover:to-fuchsia-600"
          >
            {loading ? (
              <>
                <LoadingSpinner className="mr-2 h-4 w-4" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Create Session
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Board Card Component
interface BoardCardProps {
  board: BingoBoard;
  isSelected: boolean;
  onSelect: () => void;
}

function BoardCard({ board, isSelected, onSelect }: BoardCardProps) {
  const getDifficultyColor = (difficulty: Difficulty) => {
    const colors: Record<Difficulty, string> = {
      beginner: 'bg-green-500/20 text-green-400 border-green-500/30',
      easy: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      hard: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      expert: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return (
      colors[difficulty] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    );
  };

  return (
    <Card
      className={cn(
        'cursor-pointer backdrop-blur-sm transition-all duration-300 hover:border-cyan-400/60',
        isSelected
          ? 'border-cyan-400 bg-gradient-to-br from-cyan-500/10 via-purple-500/5 to-fuchsia-500/10 shadow-lg ring-1 shadow-cyan-500/30 ring-cyan-400/30'
          : 'border-slate-600/50 bg-gradient-to-br from-slate-800/30 to-slate-700/30 hover:bg-gradient-to-br hover:from-slate-700/40 hover:to-slate-600/40'
      )}
      onClick={onSelect}
    >
      <CardContent className="p-3">
        <div className="mb-2 flex items-start justify-between">
          <h4 className="mr-2 flex-1 truncate text-sm font-medium text-cyan-100">
            {board.title}
          </h4>
          <div className="flex gap-1">
            <Badge
              variant="cyber"
              className={cn('text-xs', getDifficultyColor(board.difficulty))}
            >
              {board.difficulty}
            </Badge>
            <Badge
              variant="cyber"
              className="border-cyan-500/30 bg-cyan-500/10 text-xs text-cyan-300"
            >
              <Grid3X3 className="mr-1 h-3 w-3" />
              {board.size || 5}×{board.size || 5}
            </Badge>
          </div>
        </div>

        {board.description && (
          <p className="mb-2 line-clamp-2 text-xs text-cyan-300/70">
            {board.description}
          </p>
        )}

        <div className="text-xs text-cyan-400/60">
          {board.game_type !== 'All Games' && board.game_type}
        </div>
      </CardContent>
    </Card>
  );
}
