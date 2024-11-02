'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Board } from './components/Board/BingoBoard'
import { GameControls } from './components/GameControls'
import { useBingoGame } from './hooks/useBingoGame'
import { usePlayerManagement } from './hooks/usePlayerManagement'
import { useTimer } from './hooks/useTimer'
import type { BingoBoardDetailProps } from './components/shared/types'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { BingoContainer } from './components/layout/BingoLayout'

const BingoBoardDetail: React.FC<BingoBoardDetailProps> = ({
  board,
  onBookmark,
}) => {
  // Reference to useBingoGame hook
  const {
    boardState,
    winner,
    boardSize,
    setBoardSize,
    winConditions,
    setWinConditions,
    resetBoard,
    handleCellChange,
    handleCellClick: handleCellClickBase,
    checkWinningCondition,
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
    toggleTeamMode,
  } = usePlayerManagement()

  // Reference to useTimer hook
  const {
    time,
    isTimerRunning,
    setIsTimerRunning,
    formatTime,
    setTime,
  } = useTimer(board.timeLeft, () => checkWinningCondition(players, true))

  const [isOwner] = useState<boolean>(true)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true)
  const [teamMode, setTeamMode] = useState<boolean>(false)
  const [lockout, setLockout] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const handleCellClick = useCallback((index: number): void => {
    if (!isTimerRunning || winner !== null || !players[currentPlayer]) return
    try {
      handleCellClickBase(index, currentPlayer, players)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to handle cell click'))
    }
  }, [isTimerRunning, winner, handleCellClickBase, currentPlayer, players])

  useEffect(() => {
    try {
      resetBoard()
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to reset board'))
    }
  }, [resetBoard])

  const handleTeamModeToggle = useCallback((enabled: boolean): void => {
    try {
      setTeamMode(enabled)
      toggleTeamMode(enabled)
      resetBoard()
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to toggle team mode'))
    }
  }, [toggleTeamMode, resetBoard])

  const handleTimeChange = useCallback((timeString: string): void => {
    const totalSeconds = parseInt(timeString)
    if (!isNaN(totalSeconds)) {
      setTime(totalSeconds)
    }
  }, [setTime])

  const handleStartBoard = useCallback((): void => {
    try {
      setIsTimerRunning(true)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to start board'))
    }
  }, [setIsTimerRunning])

  const handleError = useCallback((): void => {
    setError(null)
    resetBoard()
    setIsTimerRunning(false)
  }, [resetBoard, setIsTimerRunning])

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500 rounded-md">
        <h3 className="text-red-500 font-bold">Error</h3>
        <p className="text-red-400">{error.message}</p>
        <Button 
          onClick={handleError}
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
        <div className="flex-[3] min-w-0">
          <Board
            boardState={boardState}
            boardSize={boardSize}
            players={players}
            currentPlayer={currentPlayer}
            winner={winner}
            isOwner={isOwner}
            isBookmarked={board.bookmarked}
            isGameStarted={isTimerRunning}
            lockoutMode={lockout}
            onCellChange={handleCellChange}
            onCellClick={handleCellClick}
            onBookmark={onBookmark}
            onReset={resetBoard}
          />
        </div>
        <div className="lg:flex-[1.5] lg:min-w-[400px] lg:max-w-[500px]">
          <GameControls
            players={players}
            teamNames={teamNames as [string, string]}
            teamColors={teamColors as [string, string]}
            teamMode={teamMode}
            time={time}
            isTimerRunning={isTimerRunning}
            boardSize={boardSize}
            soundEnabled={soundEnabled}
            lockout={lockout}
            winConditions={winConditions}
            isOwner={isOwner}
            onUpdatePlayer={updatePlayerInfo}
            onAddPlayer={addPlayer}
            onRemovePlayer={removePlayer}
            onUpdateTeamName={updateTeamName}
            onUpdateTeamColor={updateTeamColor}
            onTimeChange={handleTimeChange}
            onTimerToggle={() => setIsTimerRunning(!isTimerRunning)}
            onBoardSizeChange={setBoardSize}
            onSoundToggle={setSoundEnabled}
            onTeamModeToggle={handleTeamModeToggle}
            onLockoutToggle={setLockout}
            onWinConditionsChange={setWinConditions}
            onStartBoard={handleStartBoard}
            onResetBoard={resetBoard}
            formatTime={formatTime}
          />
        </div>
      </BingoContainer>
    </ErrorBoundary>
  )
}

export default BingoBoardDetail