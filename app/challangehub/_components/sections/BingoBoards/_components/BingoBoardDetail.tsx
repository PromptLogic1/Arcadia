'use client'

import React, { useState, useCallback } from 'react'
import { Board } from '../../../../../../components/challenges/bingo-board/components/Board/Board'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { GameControls } from '../../../../../../components/challenges/bingo-board/components/GameControls'

// Import contexts and hooks
import { useGameState } from '../../../../../../components/challenges/bingo-board/hooks/useGameState'
import { GameProvider } from '../../../../../../components/challenges/bingo-board/context/BingoGameContext'
import { SessionProvider } from '../../../../../../components/challenges/bingo-board/context/SessionContext'
import { useSessionContext } from '../../../../../../components/challenges/bingo-board/context/SessionContext'

// Import types
import type { BingoBoardDetailProps, BoardCell, Player } from '../../../../../../components/challenges/bingo-board/types/types'
import type { GameSettings } from '../../../../../../components/challenges/bingo-board/types/gamesettings.types'

// Define a proper interface for the board props
interface ExtendedBoardProps {
  id: string | number
  name: string
  boardState?: BoardCell[]
  gameSettings?: GameSettings
  // Add any other board properties you need
}

interface InitialBoardData {
  id: string | number
  name: string
  boardState?: unknown
  gameSettings?: unknown
}

export const BingoBoardDetail: React.FC<BingoBoardDetailProps> = ({
  board: initialBoard,
  onClose: _onClose,
}) => {
  const boardId = initialBoard?.id?.toString() || ''
  const extendedBoard = {
    ...initialBoard,
    boardState: (initialBoard as InitialBoardData)?.boardState as BoardCell[] || [],
    gameSettings: (initialBoard as InitialBoardData)?.gameSettings as GameSettings || {}
  } as ExtendedBoardProps

  return (
    <SessionProvider boardId={boardId}>
      <GameProvider
        initialBoard={extendedBoard.boardState}
        initialPlayers={[]}
        initialSettings={extendedBoard.gameSettings}
      >
        <BingoBoardContent />
      </GameProvider>
    </SessionProvider>
  )
}

interface BingoBoardContentProps {}

const BingoBoardContent: React.FC<BingoBoardContentProps> = () => {
  const [activeTab, setActiveTab] = useState<string>('play')
  
  const {
    state: sessionState,
    dispatch: sessionDispatch
  } = useSessionContext()
  
  const {
    boardState,
    players,
    settings,
    updateBoard,
    updatePlayers,
    updateSettings,
    setRunning,
    setWinner,
    resetGame
  } = useGameState()

  // Handle cell click with fixed condition
  const handleCellClick = useCallback((index: number) => {
    if (!sessionState.currentPlayer || sessionState.status !== 'active') return

    const newBoardState = [...boardState]
    const cell = newBoardState[index]
    if (cell && !cell.colors.includes(sessionState.currentPlayer.color)) {
      cell.colors.push(sessionState.currentPlayer.color)
      cell.completedBy.push(sessionState.currentPlayer.id)
      updateBoard(newBoardState)
      
      // Update session state
      sessionDispatch({
        type: 'UPDATE_STATE',
        payload: {
          boardState: newBoardState,
          version: sessionState.version + 1
        }
      })
    }
  }, [boardState, sessionState.currentPlayer, sessionState.status, sessionState.version, updateBoard, sessionDispatch])

  // Add player management handlers
  const handleAddPlayer = useCallback((player: Player) => {
    updatePlayers([...players, player])
    sessionDispatch({ type: 'UPDATE_PLAYERS', payload: [...players, player] })
  }, [players, updatePlayers, sessionDispatch])

  const handleRemovePlayer = useCallback((playerId: string) => {
    const newPlayers = players.filter(p => p.id !== playerId)
    updatePlayers(newPlayers)
    sessionDispatch({ type: 'UPDATE_PLAYERS', payload: newPlayers })
  }, [players, updatePlayers, sessionDispatch])

  // Add settings management
  const handleSettingsChange = useCallback((newSettings: Partial<GameSettings>) => {
    updateSettings({
      ...settings,
      ...newSettings
    })
  }, [settings, updateSettings])

  // Add reset functionality
  const handleReset = useCallback(() => {
    resetGame()
    setRunning(false)
    setWinner(null)
    sessionDispatch({ type: 'SET_STATUS', payload: 'active' })
  }, [resetGame, setRunning, setWinner, sessionDispatch])

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsContent value="play" className="flex-1 min-h-0 m-0">
          <div className="flex flex-col lg:flex-row gap-8 h-full max-w-7xl mx-auto px-4">
            <div className="flex-1 min-h-0">
              <div className="bg-gray-800/30 p-6 rounded-2xl border border-cyan-500/20 shadow-xl backdrop-blur-sm">
                <Board
                  onCellClick={handleCellClick}
                  className="max-w-3xl mx-auto"
                />
              </div>
            </div>

            <div className="w-full lg:w-[380px] h-full">
              <GameControls
                isOwner={sessionState.currentPlayer?.id === players[0]?.id}
                onAddPlayer={handleAddPlayer}
                onRemovePlayer={handleRemovePlayer}
                onSettingsChange={handleSettingsChange}
                onReset={handleReset}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default BingoBoardDetail
