'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Board } from './components/Board/BingoBoard'
import { GameControls } from './components/GameControls'
import { useBingoGame } from './hooks/useBingoGame'
import { usePlayerManagement } from './hooks/usePlayerManagement'
import { useTimer } from './hooks/useTimer'
import type { BingoBoardDetailProps, BoardCell } from './components/shared/types'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { BingoContainer } from './components/layout/BingoLayout'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Play, Wand2, BarChart2 } from 'lucide-react'
import { BoardGenerator, type CellTemplate } from './components/Board/BoardGenerator'

const BingoBoardDetail: React.FC<BingoBoardDetailProps> = ({
  board,
  onClose,
}) => {
  // Add state for tracking temporary changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient()

  // Reference to useBingoGame hook with modified handlers
  const {
    boardState,
    setBoardState,
    winner,
    boardSize,
    setBoardSize,
    winConditions,
    setWinConditions,
    resetBoard,
    handleCellChange: baseHandleCellChange,
    handleCellClick: baseHandleCellClick,
    checkWinningCondition,
    generateBoard,
  } = useBingoGame(board.size)

  // Reference to usePlayerManagement hook
  const {
    players,
    teamNames,
    teamColors,
    currentPlayer,
    updatePlayerInfo,
    addPlayer,
    removePlayer,
    updateTeamName,
    updateTeamColor,
  } = usePlayerManagement()

  // Reference to useTimer hook
  const {
    time,
    isTimerRunning,
    setIsTimerRunning,
    formatTime,
    setTime,
  } = useTimer(board.timeLeft, () => checkWinningCondition(players, true))

  // Initialize board state
  useEffect(() => {
    try {
      const initialBoard = generateBoard().map(cell => ({
        text: cell.text || 'Click to edit...',
        colors: [] as string[],
        completedBy: [] as string[],
      })) satisfies BoardCell[]
      
      setBoardState(initialBoard)
    } catch (error) {
      console.error('Error initializing board:', error)
      setError(error instanceof Error ? error : new Error('Failed to initialize board'))
    }
  }, [generateBoard, setBoardState])

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsAuthenticated(!!session)
    }
    checkAuth()
  }, [supabase.auth])

  const [soundEnabled, setSoundEnabled] = useState<boolean>(true)
  const [teamMode, setTeamMode] = useState<boolean>(false)
  const [lockout, setLockout] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  // Add cleanup effect that uses onClose
  useEffect(() => {
    return () => {
      if (hasUnsavedChanges && !isAuthenticated) {
        resetBoard()
        onClose()
      }
    }
  }, [hasUnsavedChanges, isAuthenticated, resetBoard, onClose])

  // Wrap handleCellChange to track changes
  const handleCellChange = useCallback((index: number, value: string) => {
    if (!isAuthenticated) {
      setHasUnsavedChanges(true)
    }
    baseHandleCellChange(index, value)
  }, [baseHandleCellChange, isAuthenticated])

  // Create a wrapper for handleCellClick
  const handleCellClick = useCallback((index: number) => {
    baseHandleCellClick(index, currentPlayer, players)
  }, [baseHandleCellClick, currentPlayer, players])

  // Handle actions that require authentication
  const handleAuthenticatedAction = useCallback((action: string) => {
    if (!isAuthenticated) {
      const shouldLogin = window.confirm(
        `You need to be logged in to ${action}. Would you like to log in now?`
      )
      if (shouldLogin) {
        router.push('/auth/login')
      }
      return false
    }
    return true
  }, [isAuthenticated, router])

  // Wrap timer toggle to check authentication
  const handleTimerToggle = useCallback(() => {
    if (!isTimerRunning) {
      // Only check auth when starting the board
      if (!handleAuthenticatedAction('start the board')) return
    }
    setIsTimerRunning(!isTimerRunning)
  }, [isTimerRunning, handleAuthenticatedAction, setIsTimerRunning])

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500 rounded-md">
        <h3 className="text-red-500 font-bold">Error</h3>
        <p className="text-red-400">{error.message}</p>
        <Button 
          onClick={() => {
            setError(null)
            resetBoard()
            setIsTimerRunning(false)
          }}
          className="mt-2 bg-red-500 hover:bg-red-600 text-white"
        >
          Reset Board
        </Button>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <BingoContainer>
        <div className="flex-1 min-h-0 flex flex-col">
          <Tabs defaultValue="play" className="flex-1 flex flex-col min-h-0">
            <div className="flex-shrink-0 mb-4">
              <TabsList className="w-full bg-gray-800/50 border border-cyan-500/20 p-1">
                <TabsTrigger 
                  value="play"
                  className="flex-1 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Play Mode
                </TabsTrigger>
                <TabsTrigger 
                  value="generator"
                  className="flex-1 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  Generator
                </TabsTrigger>
                <TabsTrigger 
                  value="stats"
                  className="flex-1 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"
                >
                  <BarChart2 className="h-4 w-4 mr-2" />
                  Statistics
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="play" className="flex-1 min-h-0 m-0">
              <div className="grid lg:grid-cols-[1fr,320px] gap-4 h-full">
                {/* Main Board Area */}
                <div className="flex-1 min-h-0 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-cyan-300">
                      {board.name || 'Bingo Board'}
                    </h2>
                    <span className="text-sm text-cyan-400/60">
                      {boardSize}×{boardSize}
                    </span>
                  </div>
                  <Board
                    boardState={boardState}
                    boardSize={boardSize}
                    players={players}
                    currentPlayer={currentPlayer}
                    winner={winner}
                    isOwner={true}
                    isGameStarted={isTimerRunning}
                    lockoutMode={lockout}
                    onCellChange={handleCellChange}
                    onCellClick={handleCellClick}
                    onReset={resetBoard}
                  />
                </div>

                {/* Game Controls - Fixed width sidebar */}
                <div className="w-full lg:w-[320px] h-full">
                  <GameControls
                    players={players}
                    teamNames={teamNames}
                    teamColors={teamColors}
                    teamMode={teamMode}
                    time={time}
                    isTimerRunning={isTimerRunning}
                    boardSize={boardSize}
                    soundEnabled={soundEnabled}
                    lockout={lockout}
                    winConditions={winConditions}
                    isOwner={true}
                    onUpdatePlayer={updatePlayerInfo}
                    onAddPlayer={addPlayer}
                    onRemovePlayer={removePlayer}
                    onUpdateTeamName={updateTeamName}
                    onUpdateTeamColor={updateTeamColor}
                    onTimeChange={(timeString) => setTime(parseInt(timeString))}
                    onTimerToggle={handleTimerToggle}
                    onBoardSizeChange={setBoardSize}
                    onSoundToggle={setSoundEnabled}
                    onTeamModeToggle={setTeamMode}
                    onLockoutToggle={setLockout}
                    onWinConditionsChange={setWinConditions}
                    onStartBoard={() => {
                      if (handleAuthenticatedAction('start the board')) {
                        setIsTimerRunning(true)
                      }
                    }}
                    onResetBoard={resetBoard}
                    formatTime={formatTime}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="generator" className="flex-1 min-h-0 m-0">
              <BoardGenerator
                onApplyTemplate={(template: CellTemplate) => {
                  const index = parseInt(template.id) - 1
                  if (!isNaN(index) && index >= 0 && index < boardSize * boardSize) {
                    handleCellChange(index, template.text)
                  }
                }}
                onPreview={() => {
                  // Preview logic
                }}
              />
            </TabsContent>

            <TabsContent value="stats" className="flex-1 min-h-0 m-0">
              {/* Statistics content */}
            </TabsContent>
          </Tabs>
        </div>
      </BingoContainer>
    </ErrorBoundary>
  )
}

export default BingoBoardDetail