'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  Gamepad2,
  Grid3X3,
  Search,
  Plus,
  Key,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/stores/auth-store';
import { notifications } from '@/lib/notifications';
import { 
  useBoardsBySectionQuery,
  usePublicBoardsQuery 
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
  } = usePublicBoardsQuery(
    { search: searchQuery },
    1,
    30
  );

  // Derived state - handle undefined and error states
  const userBoards = useMemo(() => 
    (userBoardsResponse && 'boards' in userBoardsResponse) ? userBoardsResponse.boards : [],
    [userBoardsResponse]
  );
  const publicBoards = useMemo(() => 
    (publicBoardsResponse && 'boards' in publicBoardsResponse) ? publicBoardsResponse.boards : [],
    [publicBoardsResponse]
  );
  const boardsLoading = userBoardsLoading || publicBoardsLoading;
  const boardsError = userBoardsError || publicBoardsError;

  // Handle error states
  useEffect(() => {
    if (boardsError) {
      console.error('Failed to load boards:', boardsError);
      notifications.error('Failed to load boards');
    }
  }, [boardsError]);

  // Handle pre-selected board
  useEffect(() => {
    if (preSelectedBoardId && (userBoards.length > 0 || publicBoards.length > 0)) {
      // Find the pre-selected board in user boards first, then public boards
      const preSelectedBoard = 
        userBoards.find((board: BingoBoard) => board.id === preSelectedBoardId) ||
        publicBoards.find((board: BingoBoard) => board.id === preSelectedBoardId);
      
      if (preSelectedBoard) {
        setSelectedBoard(preSelectedBoard);
      }
    }
  }, [preSelectedBoardId, userBoards, publicBoards]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedBoard(null);
      setSearchQuery('');
      setSessionPassword('');
      setIsPasswordProtected(false);
    }
  }, [isOpen]);

  // Handle session creation
  const handleCreateSession = useCallback(async () => {
    if (!selectedBoard) {
      notifications.error('Please select a board first');
      return;
    }

    setLoading(true);
    try {
      const settings: SessionSettings = {
        max_players: null,
        allow_spectators: null,
        auto_start: null,
        time_limit: null,
        require_approval: null,
        password: isPasswordProtected && sessionPassword.trim() ? sessionPassword.trim() : null
      };
      
      await onCreateSession(selectedBoard.id, settings);
      onClose();
    } catch (error) {
      console.error('Failed to create session:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedBoard, isPasswordProtected, sessionPassword, onCreateSession, onClose]);

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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl border-cyan-500/30 bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 shadow-2xl shadow-cyan-500/10">
        <DialogHeader>
          <DialogTitle className="bg-gradient-to-r from-cyan-400 via-purple-400 to-fuchsia-400 bg-clip-text text-2xl font-bold text-transparent drop-shadow-lg">
            Host New Session
          </DialogTitle>
          <DialogDescription className="text-cyan-100/80">
            {preSelectedBoardId ? 
              'Board selected from Challenge Hub. Configure your session settings below.' :
              'Choose a board and configure your multiplayer gaming session'
            }
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
              <TabsList className="grid w-full grid-cols-2 bg-slate-800/50 border-cyan-500/30 backdrop-blur-sm">
                <TabsTrigger value="my-boards" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500/20 data-[state=active]:to-purple-500/20 data-[state=active]:text-cyan-100 data-[state=active]:border-cyan-400/50 text-cyan-200/70">
                  My Boards ({userBoards.length})
                </TabsTrigger>
                <TabsTrigger value="public-boards" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500/20 data-[state=active]:to-fuchsia-500/20 data-[state=active]:text-cyan-100 data-[state=active]:border-purple-400/50 text-cyan-200/70">
                  Public Boards ({publicBoards.length})
                </TabsTrigger>
              </TabsList>

              {boardsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner />
                </div>
              ) : (
                <>
                  <TabsContent value="my-boards">
                    <ScrollArea className="h-[300px] pr-4">
                      {filteredUserBoards.length === 0 ? (
                        <div className="py-8 text-center text-cyan-300/60">
                          <Gamepad2 className="mx-auto mb-3 h-12 w-12 opacity-50 text-cyan-400" />
                          <p className="mb-2 text-cyan-200">No boards found</p>
                          {userBoards.length === 0 ? (
                            <p className="text-sm text-cyan-300/70">
                              Create your first board in the Challenge Hub!
                            </p>
                          ) : (
                            <p className="text-sm text-cyan-300/70">Try adjusting your search</p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {filteredUserBoards.map(board => (
                            <BoardCard
                              key={board.id}
                              board={board}
                              isSelected={selectedBoard?.id === board.id}
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
                          <Gamepad2 className="mx-auto mb-3 h-12 w-12 opacity-50 text-purple-400" />
                          <p className="mb-2 text-cyan-200">No public boards found</p>
                          <p className="text-sm text-cyan-300/70">Try adjusting your search</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {filteredPublicBoards.map(board => (
                            <BoardCard
                              key={board.id}
                              board={board}
                              isSelected={selectedBoard?.id === board.id}
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

            <Card className="border-purple-500/30 bg-gradient-to-br from-slate-800/50 to-purple-900/20 backdrop-blur-sm shadow-lg shadow-purple-500/10">
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
                  Additional settings can be configured after creating the session.
                </p>
              </CardContent>
            </Card>

            {/* Selected Board Preview */}
            {selectedBoard && (
              <Card className="border-cyan-500/30 bg-gradient-to-br from-slate-800/50 to-cyan-900/20 backdrop-blur-sm shadow-lg shadow-cyan-500/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-cyan-200">
                    Selected Board
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 p-4 pt-0">
                  <h4 className="truncate font-medium text-cyan-100">
                    {selectedBoard.title}
                  </h4>
                  <div className="flex gap-2">
                    <Badge
                      variant="outline"
                      className={getDifficultyColor(selectedBoard.difficulty)}
                    >
                      {selectedBoard.difficulty}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="border-cyan-500/30 text-cyan-300 bg-cyan-500/10"
                    >
                      <Grid3X3 className="mr-1 h-3 w-3" />
                      {selectedBoard.size || 5}×{selectedBoard.size || 5}
                    </Badge>
                  </div>
                  {selectedBoard.description && (
                    <p className="line-clamp-2 text-sm text-cyan-300/70">
                      {selectedBoard.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 hover:border-cyan-400 backdrop-blur-sm"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateSession}
            disabled={!selectedBoard || loading}
            className="bg-gradient-to-r from-cyan-500 via-purple-500 to-fuchsia-500 hover:from-cyan-600 hover:via-purple-600 hover:to-fuchsia-600 text-white font-semibold shadow-lg shadow-cyan-500/25 border-0"
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
        'cursor-pointer transition-all duration-300 hover:border-cyan-400/60 backdrop-blur-sm',
        isSelected
          ? 'border-cyan-400 bg-gradient-to-br from-cyan-500/10 via-purple-500/5 to-fuchsia-500/10 shadow-lg shadow-cyan-500/30 ring-1 ring-cyan-400/30'
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
              variant="outline"
              className={cn('text-xs', getDifficultyColor(board.difficulty))}
            >
              {board.difficulty}
            </Badge>
            <Badge
              variant="outline"
              className="border-cyan-500/30 text-xs text-cyan-300 bg-cyan-500/10"
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
