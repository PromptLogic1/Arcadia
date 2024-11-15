import { renderHook, act, waitFor } from '@testing-library/react'
import { useBingoGame } from '@/components/challenges/bingo-board/hooks/useBingoGame'
import type { Player, BoardCell } from '@/components/challenges/bingo-board/types/types'

describe('useBingoGame Hook', () => {
  const createTestPlayer = (id: number, team: number): Player => ({
    id: `player-${id}`,
    name: `Test Player ${id}`,
    color: `color-${id}`,
    hoverColor: `hover-${id}`,
    team
  })

  describe('Spielzustand Initialisierung', () => {
    it('SOLL Board korrekt initialisieren', () => {
      const { result } = renderHook(() => useBingoGame(5, []))

      expect(result.current.boardState.length).toBe(25)
      expect(result.current.winner).toBeNull()
      expect(result.current.boardSize).toBe(5)
      expect(result.current.winConditions).toEqual({
        line: true,
        majority: false
      })
    })

    it('SOLL Zellen mit korrekter Struktur initialisieren', () => {
      const { result } = renderHook(() => useBingoGame(3, []))

      result.current.boardState.forEach(cell => {
        expect(cell).toHaveProperty('text')
        expect(cell.text.length).toBeLessThanOrEqual(50)
        expect(cell).toHaveProperty('colors', [])
        expect(cell).toHaveProperty('completedBy', [])
        expect(cell).toHaveProperty('blocked', false)
        expect(cell).toHaveProperty('isMarked', false)
        expect(cell).toHaveProperty('cellId')
      })
    })

    it('SOLL Board-State bei Reset zurücksetzen', () => {
      const { result } = renderHook(() => useBingoGame(3, []))
      const initialState = [...result.current.boardState]

      act(() => {
        result.current.handleCellClick(0, { colors: ['red'] })
        result.current.resetBoard()
      })

      expect(result.current.boardState).not.toEqual(initialState)
      expect(result.current.winner).toBeNull()
    })

    it('SOLL Gewinnbedingungen korrekt initialisieren', () => {
      const { result } = renderHook(() => useBingoGame(5, []))
      
      expect(result.current.winConditions).toEqual({
        line: true,
        majority: false
      })
    })

    it('SOLL alle Spieler-States korrekt verwalten', () => {
      const { result } = renderHook(() => useBingoGame(3, []))
      const player1 = createTestPlayer(1, 0)
      const player2 = createTestPlayer(2, 1)
      
      act(() => {
        result.current.handleCellClick(0, { colors: [player1.color] })
        result.current.handleCellClick(1, { colors: [player2.color] })
      })

      const cell0 = result.current.boardState[0]
      const cell1 = result.current.boardState[1]
      
      expect(cell0?.colors).toContain(player1.color)
      expect(cell1?.colors).toContain(player2.color)
    })
  })

  describe('Team-Modus', () => {
    it('SOLL Team-basierte Siege korrekt erkennen', async () => {
      const player1 = createTestPlayer(1, 0)
      const player2 = createTestPlayer(2, 0)
      const { result } = renderHook(() => useBingoGame(3, [player1, player2]))

      await act(async () => {
        result.current.handleCellClick(0, { colors: [player1.color] })
        result.current.handleCellClick(1, { colors: [player2.color] })
        result.current.handleCellClick(2, { colors: [player1.color] })
      })

      await waitFor(() => {
        expect(result.current.winner).toBe(0) // Team 0 wins
      })
    })

    it('SOLL Team-Mehrheiten korrekt berechnen', async () => {
      const { result } = renderHook(() => useBingoGame(3, []))
      const team1Player = createTestPlayer(1, 0)
      const team2Player = createTestPlayer(3, 1)

      await act(async () => {
        result.current.setWinConditions({ line: false, majority: true })
        // Team 1 markiert mehr Felder
        for (let i = 0; i < 5; i++) {
          result.current.handleCellClick(i, { colors: [team1Player.color] })
        }
        // Team 2 markiert weniger Felder
        for (let i = 5; i < 7; i++) {
          result.current.handleCellClick(i, { colors: [team2Player.color] })
        }
        
        // Warten auf State-Updates
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      const hasWon = await act(async () => {
        const winningCondition = result.current.checkWinningCondition([team1Player, team2Player], true)
        await new Promise(resolve => setTimeout(resolve, 0))
        return winningCondition
      })

      expect(hasWon).toBe(true)
      expect(result.current.winner).toBe(0) // Team 1 gewinnt
    })
  })

  describe('Regelkonformität', () => {
    it('SOLL blockierte Zellen vor Updates schützen', () => {
      const { result } = renderHook(() => useBingoGame(3, []))
      
      act(() => {
        result.current.updateBoardState(0, { blocked: true })
        result.current.handleCellClick(0, { colors: ['red'] })
      })

      const blockedCell = result.current.boardState[0]
      expect(blockedCell?.colors).toEqual([])
    })

    it('SOLL ungültige Spielzüge ablehnen', () => {
      const { result } = renderHook(() => useBingoGame(3, []))
      
      act(() => {
        // Versuch, eine nicht existierende Zelle zu aktualisieren
        result.current.handleCellClick(9, { colors: ['red'] })
      })

      expect(result.current.boardState.length).toBe(9) // 3x3 Board
    })
  })

  describe('State Validierung', () => {
    it('SOLL korrupte Board-States erkennen und behandeln', () => {
      const { result } = renderHook(() => useBingoGame(3, []))
      const corruptState = [null, undefined, {}] as unknown as BoardCell[]
      
      act(() => {
        result.current.setBoardState(corruptState)
      })

      expect(result.current.boardState.length).toBe(9) // Auto-Korrektur
      result.current.boardState.forEach(cell => {
        expect(cell).toHaveProperty('text')
        expect(cell).toHaveProperty('colors')
      })
    })

    it('SOLL Typ-Sicherheit bei Updates gewährleisten', () => {
      const { result } = renderHook(() => useBingoGame(3, []))
      const invalidUpdate = {
        colors: 'not-an-array' as unknown as string[],
        completedBy: 'not-an-array' as unknown as string[]
      }
      
      act(() => {
        result.current.handleCellClick(0, invalidUpdate)
      })

      const updatedCell = result.current.boardState[0]
      expect(Array.isArray(updatedCell?.colors)).toBe(true)
      expect(Array.isArray(updatedCell?.completedBy)).toBe(true)
    })
  })

  describe('Performance', () => {
    it('SOLL State-Updates effizient durchführen', () => {
      const { result } = renderHook(() => useBingoGame(5, []))
      const updates: { index: number, cell: Partial<BoardCell> }[] = []
      
      // Viele Updates vorbereiten
      for (let i = 0; i < 25; i++) {
        updates.push({
          index: i,
          cell: { colors: ['red'], isMarked: true }
        })
      }

      const startTime = performance.now()
      act(() => {
        updates.forEach(update => {
          result.current.handleCellClick(update.index, update.cell)
        })
      })
      const endTime = performance.now()

      expect(endTime - startTime).toBeLessThan(100) // max 100ms für 25 Updates
    })
  })

  describe('Gewinnbedingungen', () => {
    describe('Linien-Siegbedingung', () => {
      it('SOLL Liniensieg nur bei aktivierter Bedingung erkennen', async () => {
        const player = createTestPlayer(1, 0)
        const { result } = renderHook(() => useBingoGame(3, [player]))

        await act(async () => {
          // Deaktiviere Linien-Siegbedingung
          result.current.setWinConditions({ line: false, majority: true })
          
          // Markiere horizontale Linie
          for (let i = 0; i < 3; i++) {
            result.current.handleCellClick(i, { colors: [player.color] })
          }
        })

        await waitFor(() => {
          expect(result.current.winner).toBeNull() // Kein Sieg, da Linie deaktiviert
        })

        await act(async () => {
          // Aktiviere Linien-Siegbedingung
          result.current.setWinConditions({ line: true, majority: false })
        })

        await waitFor(() => {
          expect(result.current.winner).toBe(0) // Jetzt Sieg, da Linie aktiviert
        })
      })

      it('SOLL Spiel sofort bei Liniensieg beenden', async () => {
        const { result } = renderHook(() => useBingoGame(3, []))
        const player1 = createTestPlayer(1, 0)
        const player2 = createTestPlayer(2, 1)

        await act(async () => {
          result.current.setWinConditions({ line: true, majority: true })
          
          // Spieler 1 bildet eine Linie
          result.current.handleCellClick(0, { colors: [player1.color] })
          result.current.handleCellClick(1, { colors: [player1.color] })
          result.current.handleCellClick(2, { colors: [player1.color] })
        })

        // Prüfe sofortigen Sieg
        await waitFor(() => {
          expect(result.current.winner).toBe(0)
        })

        // Versuche weiteren Zug nach Spielende
        await act(async () => {
          result.current.handleCellClick(3, { colors: [player2.color] })
        })

        // Prüfe, dass keine weiteren Züge möglich sind
        const cell = result.current.boardState[3]
        expect(cell && cell.colors).not.toContain(player2.color)
      })
    })

    describe('Mehrheits-Siegbedingung', () => {
      it('SOLL Mehrheitssieg nur bei Spielende prüfen', async () => {
        const { result } = renderHook(() => useBingoGame(3, []))
        const player1 = createTestPlayer(1, 0)
        const player2 = createTestPlayer(2, 1)

        await act(async () => {
          result.current.setWinConditions({ line: false, majority: true })
          
          // Spieler 1 hat Mehrheit
          result.current.handleCellClick(0, { colors: [player1.color] })
          result.current.handleCellClick(1, { colors: [player1.color] })
          result.current.handleCellClick(2, { colors: [player1.color] })
          
          // Spieler 2 hat weniger Felder
          result.current.handleCellClick(3, { colors: [player2.color] })
        })

        // Ohne Zeitablauf kein Sieg
        await act(async () => {
          const hasWon = result.current.checkWinningCondition([player1, player2])
          expect(hasWon).toBe(false)
          expect(result.current.winner).toBeNull()
        })

        // Mit Zeitablauf Sieg durch Mehrheit
        await act(async () => {
          const hasWon = result.current.checkWinningCondition([player1, player2], true)
          expect(hasWon).toBe(true)
        })

        await waitFor(() => {
          expect(result.current.winner).toBe(0)
        })
      })

      it('SOLL Mehrheitssieg bei deaktivierter Bedingung ignorieren', async () => {
        const { result } = renderHook(() => useBingoGame(3, []))
        const player1 = createTestPlayer(1, 0)
        const player2 = createTestPlayer(2, 1)

        await act(async () => {
          result.current.setWinConditions({ line: false, majority: false })
          
          // Spieler 1 hat Mehrheit
          result.current.handleCellClick(0, { colors: [player1.color] })
          result.current.handleCellClick(1, { colors: [player1.color] })
          result.current.handleCellClick(2, { colors: [player1.color] })
          
          // Spieler 2 hat weniger Felder
          result.current.handleCellClick(3, { colors: [player2.color] })
        })

        // Bei Zeitablauf trotz Mehrheit unentschieden
        await act(async () => {
          const hasWon = result.current.checkWinningCondition([player1, player2], true)
          expect(hasWon).toBe(false)
        })

        await waitFor(() => {
          expect(result.current.winner).toBe(-1)
        })
      })
    })

    describe('Sofortiger Spielabbruch', () => {
      it('SOLL Spiel sofort bei Liniensieg beenden', async () => {
        const { result } = renderHook(() => useBingoGame(3, []))
        const player1 = createTestPlayer(1, 0)
        const player2 = createTestPlayer(2, 1)

        await act(async () => {
          // Player 1 bildet eine Linie
          result.current.handleCellClick(0, { colors: [player1.color] })
          result.current.handleCellClick(1, { colors: [player1.color] })
          result.current.handleCellClick(2, { colors: [player1.color] })
          
          // Dieser Zug sollte ignoriert werden, da das Spiel bereits gewonnen ist
          result.current.handleCellClick(3, { colors: [player2.color] })
        })

        await waitFor(() => {
          expect(result.current.winner).toBe(0)
          // Prüfe, dass der letzte Zug ignoriert wurde
          const cell = result.current.boardState[3]
          expect(cell && cell.colors).not.toContain(player2.color)
        })
      })

      it('SOLL bei gleichzeitigem Liniensieg unentschieden enden', async () => {
        const { result } = renderHook(() => useBingoGame(3, []))
        const player1 = createTestPlayer(1, 0)
        const player2 = createTestPlayer(2, 1)

        await act(async () => {
          // Beide Spieler bilden gleichzeitig eine Linie
          // (ein sehr unwahrscheinliches Szenario im echten Spiel)
          result.current.handleCellClick(0, { colors: [player1.color, player2.color] })
          result.current.handleCellClick(1, { colors: [player1.color, player2.color] })
          result.current.handleCellClick(2, { colors: [player1.color, player2.color] })
        })

        await act(async () => {
          result.current.checkWinningCondition([player1, player2])
        })

        await waitFor(() => {
          expect(result.current.winner).toBe(-1) // Unentschieden bei gleichzeitigem Sieg
        })
      })
    })
  })

  describe('Spiellogik', () => {
    it('SOLL Blocking-Mechanismus korrekt implementieren', () => {
      const { result } = renderHook(() => useBingoGame(3, []))
      
      act(() => {
        result.current.updateBoardState(0, { blocked: true })
      })

      const blockedCell = result.current.boardState[0]
      expect(blockedCell?.blocked).toBe(true)
    })

    it('SOLL Zell-Text auf 50 Zeichen begrenzen', () => {
      const { result } = renderHook(() => useBingoGame(3, []))
      const longText = 'a'.repeat(60)

      act(() => {
        result.current.handleCellChange(0, longText)
      })

      const updatedCell = result.current.boardState[0]
      expect(updatedCell?.text.length).toBeLessThanOrEqual(50)
    })
  })

  describe('Edge Cases', () => {
    it('SOLL mit großen Boards performant umgehen', () => {
      const { result } = renderHook(() => useBingoGame(10, []))
      expect(result.current.boardState.length).toBe(100)
      
      const startTime = performance.now()
      act(() => {
        result.current.checkWinningCondition([createTestPlayer(1, 0)])
      })
      const endTime = performance.now()
      
      expect(endTime - startTime).toBeLessThan(100) // max 100ms
    })

    it('SOLL mit vollständig gefüllten Boards umgehen', () => {
      const { result } = renderHook(() => useBingoGame(3, []))
      const player = createTestPlayer(1, 0)
      
      act(() => {
        // Board vollständig füllen
        for (let i = 0; i < 9; i++) {
          result.current.handleCellClick(i, { 
            colors: [player.color],
            isMarked: true 
          })
        }
      })

      expect(result.current.boardState.every(cell => cell.isMarked)).toBe(true)
      expect(result.current.checkWinningCondition([player])).toBe(true)
    })

    it('SOLL mit gleichzeitigen Gewinnbedingungen umgehen', async () => {
      const { result } = renderHook(() => useBingoGame(3, []))
      const player = createTestPlayer(1, 0)
      
      await act(async () => {
        // Horizontale und vertikale Linie gleichzeitig
        result.current.handleCellClick(0, { colors: [player.color] })
        result.current.handleCellClick(1, { colors: [player.color] })
        result.current.handleCellClick(2, { colors: [player.color] })
        result.current.handleCellClick(3, { colors: [player.color] })
        result.current.handleCellClick(6, { colors: [player.color] })
        
        // Warten auf State-Updates
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      const hasWon = await act(async () => {
        const winningCondition = result.current.checkWinningCondition([player])
        await new Promise(resolve => setTimeout(resolve, 0))
        return winningCondition
      })

      expect(hasWon).toBe(true)
      expect(result.current.winner).toBe(0)
    })

    it('SOLL mit leeren Boards umgehen können', () => {
      const { result } = renderHook(() => useBingoGame(0, []))
      
      // Prüfe, ob ein Minimum-Board (1x1) erstellt wird
      expect(result.current.boardState.length).toBeGreaterThan(0)
      expect(result.current.boardSize).toBeGreaterThan(0)
      
      act(() => {
        // Versuche Aktionen auf dem minimalen Board
        result.current.handleCellClick(0, { colors: ['red'] })
      })
      
      // Prüfe, ob das Board funktionsfähig bleibt
      expect(result.current.boardState[0]?.colors).toContain('red')
    })

    it('SOLL mit Spieler-Disconnects umgehen', () => {
      const { result } = renderHook(() => useBingoGame(3, []))
      const player1 = createTestPlayer(1, 0)
      const player2 = createTestPlayer(2, 1)
      
      act(() => {
        // Spieler 1 markiert Zellen
        result.current.handleCellClick(0, { colors: [player1.color] })
        result.current.handleCellClick(1, { colors: [player1.color] })
        
        // Simuliere Disconnect von Spieler 1
        result.current.checkWinningCondition([player2]) // Nur noch Spieler 2 aktiv
      })
      
      // Spiel sollte weiterlaufen
      expect(result.current.boardState[0]?.colors).toContain(player1.color)
      expect(result.current.winner).toBeNull()
    })

    it('SOLL Memory-Leaks vermeiden', () => {
      const { result, unmount } = renderHook(() => useBingoGame(5, []))
      const player = createTestPlayer(1, 0)
      
      // Fülle das Board mit vielen Aktionen
      act(() => {
        for (let i = 0; i < 25; i++) {
          result.current.handleCellClick(i, { 
            colors: [player.color],
            completedBy: [player.id],
            text: 'Test'.repeat(10)
          })
        }
      })
      
      // Messe Speicherverbrauch vor Unmount
      const heapBefore = process.memoryUsage().heapUsed
      
      // Unmount und Cleanup
      unmount()
      
      // Messe Speicherverbrauch nach Unmount
      const heapAfter = process.memoryUsage().heapUsed
      
      // Erwarte keinen signifikanten Speicherzuwachs
      expect(heapAfter - heapBefore).toBeLessThan(1024 * 1024) // Max 1MB Differenz
    })
  })

  describe('Zell-Management', () => {
    it('SOLL Zell-Updates atomar durchführen', () => {
      const { result } = renderHook(() => useBingoGame(3, []))
      const updates = { colors: ['red'], isMarked: true }
      
      act(() => {
        result.current.handleCellClick(0, updates)
      })

      const cell = result.current.boardState[0]
      expect(cell?.colors).toEqual(['red'])
      expect(cell?.isMarked).toBe(true)
    })

    it('SOLL Zell-Farben und completedBy Arrays korrekt verwalten', () => {
      const { result } = renderHook(() => useBingoGame(3, []))
      const player = createTestPlayer(1, 0)
      
      act(() => {
        result.current.handleCellClick(0, { 
          colors: [player.color],
          completedBy: [player.id]
        })
      })

      const cell = result.current.boardState[0]
      expect(cell?.colors).toContain(player.color)
      expect(cell?.completedBy).toContain(player.id)
    })

    it('SOLL isMarked und blocked States korrekt tracken', () => {
      const { result } = renderHook(() => useBingoGame(3, []))
      
      act(() => {
        result.current.updateBoardState(0, { 
          isMarked: true,
          blocked: true 
        })
      })

      const cell = result.current.boardState[0]
      expect(cell?.isMarked).toBe(true)
      expect(cell?.blocked).toBe(true)
    })
  })

  describe('Fehlerbehandlung', () => {
    it('SOLL regelwidrige Aktionen verhindern', () => {
      const { result } = renderHook(() => useBingoGame(3, []))
      
      act(() => {
        result.current.updateBoardState(0, { blocked: true })
        result.current.handleCellClick(0, { isMarked: true })
      })

      const cell = result.current.boardState[0]
      expect(cell?.isMarked).toBe(false)
    })

    it('SOLL Konflikte zwischen Spieleraktionen auflösen', () => {
      const { result } = renderHook(() => useBingoGame(3, []))
      const player1 = createTestPlayer(1, 0)
      const player2 = createTestPlayer(2, 1)
      
      act(() => {
        result.current.handleCellClick(0, { colors: [player1.color] })
        result.current.handleCellClick(0, { colors: [player2.color] })
      })

      const cell = result.current.boardState[0]
      expect(cell?.colors).toEqual([player2.color])
    })

    it('SOLL Fehler beim Zell-Update protokollieren', () => {
      const consoleSpy = jest.spyOn(console, 'error')
      const { result } = renderHook(() => useBingoGame(3, []))
      
      act(() => {
        // Ungültiges Update erzwingen
        result.current.handleCellClick(-1, { colors: ['red'] })
      })

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('SOLL bei kritischen Fehlern das Spiel pausieren', () => {
      const { result } = renderHook(() => useBingoGame(3, []))
      const initialState = [...result.current.boardState]
      
      act(() => {
        // Simuliere kritischen Fehler durch korrupten State
        result.current.setBoardState([])
      })

      // Prüfe, ob das Spiel in einen sicheren Zustand zurückgesetzt wurde
      expect(result.current.boardState.length).toBe(9)
      expect(result.current.boardState).not.toEqual(initialState)
      expect(result.current.winner).toBeNull()
    })

    it('SOLL bei Inkonsistenzen den letzten validen State wiederherstellen', () => {
      const { result } = renderHook(() => useBingoGame(3, []))
      const validState = [...result.current.boardState]
      
      act(() => {
        // Erzeuge inkonsistenten State
        const corruptState = validState.map(cell => ({ ...cell }))
        corruptState[0] = {} as BoardCell // Ungültige Zelle
        result.current.setBoardState(corruptState)
      })

      // Prüfe, ob der letzte valide State wiederhergestellt wurde
      expect(result.current.boardState[0]).toHaveProperty('text')
      expect(result.current.boardState[0]).toHaveProperty('colors')
      expect(result.current.boardState[0]).toHaveProperty('completedBy')
    })
  })

  describe('Unentschieden-Szenarien', () => {
    it('SOLL Unentschieden bei Zeitablauf mit gleicher Feldanzahl erkennen', async () => {
      const { result } = renderHook(() => useBingoGame(3, []))
      const player1 = createTestPlayer(1, 0)
      const player2 = createTestPlayer(2, 1)

      await act(async () => {
        // Beide Spieler markieren gleich viele Felder
        result.current.handleCellClick(0, { colors: [player1.color] })
        result.current.handleCellClick(4, { colors: [player2.color] })
        result.current.handleCellClick(8, { colors: [player1.color] })
        result.current.handleCellClick(2, { colors: [player2.color] })
      })

      // Prüfe initiale Bedingungen
      expect(result.current.winner).toBeNull()
      
      const player1Count = result.current.boardState.filter(
        cell => cell.colors.includes(player1.color)
      ).length
      const player2Count = result.current.boardState.filter(
        cell => cell.colors.includes(player2.color)
      ).length
      expect(player1Count).toBe(player2Count)

      // Simuliere Zeitablauf
      await act(async () => {
        result.current.checkWinningCondition([player1, player2], true)
      })

      await waitFor(() => {
        expect(result.current.winner).toBe(-1)
      })
    })

    it('SOLL Unentschieden bei vollem Board mit gleicher Feldanzahl erkennen', async () => {
      const { result } = renderHook(() => useBingoGame(2, [])) // 2x2 Board für einfacheren Test
      const player1 = createTestPlayer(1, 0)
      const player2 = createTestPlayer(2, 1)

      await act(async () => {
        // Fülle Board gleichmäßig
        result.current.handleCellClick(0, { colors: [player1.color], isMarked: true })
        result.current.handleCellClick(1, { colors: [player2.color], isMarked: true })
        result.current.handleCellClick(2, { colors: [player1.color], isMarked: true })
        result.current.handleCellClick(3, { colors: [player2.color], isMarked: true })
      })

      // Prüfe, ob Board voll ist
      expect(result.current.boardState.every(cell => cell.isMarked)).toBe(true)

      await act(async () => {
        result.current.checkWinningCondition([player1, player2])
      })

      await waitFor(() => {
        expect(result.current.winner).toBe(-1)
      })
    })

    it('SOLL Unentschieden erkennen wenn keine Line mehr möglich ist', async () => {
      const { result } = renderHook(() => useBingoGame(3, []))
      const player1 = createTestPlayer(1, 0)
      const player2 = createTestPlayer(2, 1)

      await act(async () => {
        // Setze Siegbedingungen
        result.current.setWinConditions({ line: true, majority: false })

        // Blockiere alle möglichen Linien
        result.current.handleCellClick(0, { colors: [player1.color] })
        result.current.handleCellClick(1, { colors: [player2.color] })
        result.current.handleCellClick(2, { colors: [player1.color] })
        result.current.handleCellClick(3, { colors: [player2.color] })
        result.current.handleCellClick(4, { colors: [player1.color] })
        result.current.handleCellClick(5, { colors: [player2.color] })
      })

      // Prüfe, dass keine Line mehr möglich ist
      const player1Cells = result.current.boardState.filter(
        cell => cell.colors.includes(player1.color)
      ).length
      const player2Cells = result.current.boardState.filter(
        cell => cell.colors.includes(player2.color)
      ).length
      expect(player1Cells).toBe(player2Cells)

      await act(async () => {
        result.current.checkWinningCondition([player1, player2])
      })

      await waitFor(() => {
        expect(result.current.winner).toBe(-1)
      })
    })
  })
}) 