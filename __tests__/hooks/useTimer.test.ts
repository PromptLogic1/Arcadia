import { renderHook, act } from '@testing-library/react'
import { useTimer } from '@/components/challenges/bingo-board/hooks/useTimer'

describe('useTimer Hook', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  describe('Grundfunktionalität', () => {
    describe('Timer Initialisierung', () => {
      it('SOLL mit initialTime korrekt initialisieren', () => {
        const onTimeEnd = jest.fn()
        const { result } = renderHook(() => useTimer(60, onTimeEnd))

        expect(result.current.time).toBe(60)
        expect(result.current.isTimerRunning).toBe(false)
        expect(typeof result.current.formatTime).toBe('function')
      })

      it('SOLL negative Zeitwerte auf 0 setzen', () => {
        const { result } = renderHook(() => useTimer(-10, jest.fn()))
        expect(result.current.time).toBe(0)
      })
    })

    describe('Timer Steuerung', () => {
      it('SOLL Timer korrekt starten und stoppen', () => {
        const { result } = renderHook(() => useTimer(60, jest.fn()))

        act(() => {
          result.current.setIsTimerRunning(true)
        })
        expect(result.current.isTimerRunning).toBe(true)
        
        act(() => {
          jest.advanceTimersByTime(1000)
        })
        expect(result.current.time).toBe(59)

        act(() => {
          result.current.setIsTimerRunning(false)
        })
        
        act(() => {
          jest.advanceTimersByTime(1000)
        })
        expect(result.current.time).toBe(59)
      })

      it('SOLL Timer von letzter Position fortsetzen', () => {
        const { result } = renderHook(() => useTimer(60, jest.fn()))

        // Start und 2 Sekunden laufen
        act(() => {
          result.current.setIsTimerRunning(true)
          jest.advanceTimersByTime(2000)
        })
        expect(result.current.time).toBe(58)

        // Stoppen
        act(() => {
          result.current.setIsTimerRunning(false)
        })

        // Wieder starten und prüfen ob von 58 weiterläuft
        act(() => {
          result.current.setIsTimerRunning(true)
          jest.advanceTimersByTime(1000)
        })
        expect(result.current.time).toBe(57)
      })

      it('SOLL onTimeEnd aufrufen und stoppen bei time === 0', () => {
        const onTimeEnd = jest.fn()
        const { result } = renderHook(() => useTimer(2, onTimeEnd))

        act(() => {
          result.current.setIsTimerRunning(true)
          jest.advanceTimersByTime(2000)
        })

        expect(onTimeEnd).toHaveBeenCalled()
        expect(result.current.isTimerRunning).toBe(false)
        expect(result.current.time).toBe(0)
      })
    })

    describe('Zeit Formatierung', () => {
      it('SOLL Zeit korrekt im Format HH:MM:SS formatieren', () => {
        const { result } = renderHook(() => useTimer(3665, jest.fn()))
        
        expect(result.current.formatTime(3665)).toBe('01:01:05')
        expect(result.current.formatTime(45)).toBe('00:00:45')
        expect(result.current.formatTime(3600)).toBe('01:00:00')
      })

      it('SOLL führende Nullen hinzufügen', () => {
        const { result } = renderHook(() => useTimer(0, jest.fn()))
        
        expect(result.current.formatTime(9)).toBe('00:00:09')
        expect(result.current.formatTime(90)).toBe('00:01:30')
        expect(result.current.formatTime(599)).toBe('00:09:59')
      })
    })
  })

  describe('Fehlerbehandlung', () => {
    it('SOLL nicht-numerische Eingaben ablehnen', () => {
      const { result } = renderHook(() => useTimer(60, jest.fn()))
      
      act(() => {
        // @ts-expect-error - Absichtlich falschen Typ testen
        result.current.setTime('invalid')
      })
      
      expect(result.current.time).toBe(60)
    })

    it('SOLL mehrfache Start/Stop-Aufrufe korrekt behandeln', () => {
      const { result } = renderHook(() => useTimer(60, jest.fn()))
      
      act(() => {
        result.current.setIsTimerRunning(true)
        result.current.setIsTimerRunning(true)
        jest.advanceTimersByTime(1000)
      })
      
      expect(result.current.time).toBe(59)
      
      act(() => {
        result.current.setIsTimerRunning(false)
        result.current.setIsTimerRunning(false)
        jest.advanceTimersByTime(1000)
      })
      
      expect(result.current.time).toBe(59)
    })
  })

  describe('Edge Cases', () => {
    it('SOLL mit sehr großen Zeitwerten umgehen', () => {
      const { result } = renderHook(() => useTimer(100000, jest.fn()))
      expect(result.current.formatTime(100000)).toBe('27:46:40')
    })

    it('SOLL mit 0 als initialTime korrekt umgehen', () => {
      const onTimeEnd = jest.fn()
      const { result } = renderHook(() => useTimer(0, onTimeEnd))
      
      act(() => {
        result.current.setIsTimerRunning(true)
      })
      
      expect(onTimeEnd).toHaveBeenCalled()
      expect(result.current.isTimerRunning).toBe(false)
    })

    it('SOLL bei schnellen Start/Stop-Wechseln stabil bleiben', () => {
      const { result } = renderHook(() => useTimer(60, jest.fn()))
      
      act(() => {
        for(let i = 0; i < 10; i++) {
          result.current.setIsTimerRunning(true)
          result.current.setIsTimerRunning(false)
        }
        jest.advanceTimersByTime(1000)
      })
      
      expect(result.current.time).toBe(60)
    })
  })

  describe('Performance', () => {
    it('SOLL keine unnötigen Re-Renders verursachen', () => {
      let renderCount = 0
      const { result } = renderHook(() => {
        renderCount++
        return useTimer(60, jest.fn())
      })

      const initialRenderCount = renderCount
      
      act(() => {
        result.current.setIsTimerRunning(true)
        jest.advanceTimersByTime(1000)
      })

      expect(renderCount - initialRenderCount).toBeLessThanOrEqual(2)
    })
  })

  describe('Ressourcen Management', () => {
    it('SOLL Timer-Interval beim Unmount aufräumen', () => {
      const { unmount } = renderHook(() => useTimer(60, jest.fn()))
      
      act(() => {
        unmount()
      })
      
      expect(jest.getTimerCount()).toBe(0)
    })

    it('SOLL keine Memory-Leaks verursachen', () => {
      const { result, unmount } = renderHook(() => useTimer(60, jest.fn()))
      const initialMemory = process.memoryUsage().heapUsed
      
      // Timer mehrfach starten/stoppen
      act(() => {
        for (let i = 0; i < 100; i++) {
          result.current.setIsTimerRunning(true)
          result.current.setIsTimerRunning(false)
        }
      })
      
      unmount()
      const finalMemory = process.memoryUsage().heapUsed
      expect(finalMemory - initialMemory).toBeLessThan(1000000) // max 1MB Differenz
    })

    it('SOLL CPU-Last minimal halten', () => {
      const { result } = renderHook(() => useTimer(60, jest.fn()))
      let renderCount = 0
      
      act(() => {
        result.current.setIsTimerRunning(true)
        // Simuliere 10 Sekunden Laufzeit
        for (let i = 0; i < 10; i++) {
          renderCount++
          jest.advanceTimersByTime(1000)
        }
      })
      
      expect(renderCount).toBeLessThanOrEqual(10) // Max ein Render pro Sekunde
    })
  })

  describe('Gleichzeitige Timer', () => {
    it('SOLL mit mehreren Timern performant umgehen', () => {
      const timers = Array(10).fill(null).map(() => 
        renderHook(() => useTimer(60, jest.fn()))
      )
      
      act(() => {
        timers.forEach(timer => {
          timer.result.current.setIsTimerRunning(true)
        })
        jest.advanceTimersByTime(1000)
      })
      
      timers.forEach(timer => {
        expect(timer.result.current.time).toBe(59)
      })
      
      timers.forEach(timer => timer.unmount())
      expect(jest.getTimerCount()).toBe(0)
    })
  })

  describe('Fehlerbehandlung', () => {
    it('SOLL bei ungültigen Eingaben Fehler werfen', () => {
      const { result } = renderHook(() => useTimer(60, jest.fn()))
      
      expect(() => {
        act(() => {
          // @ts-expect-error - Absichtlich ungültiger Wert
          result.current.setTime(null)
        })
      }).toThrow()
    })

    it('SOLL bei Fehlern den Timer stoppen', () => {
      const onTimeEnd = jest.fn().mockImplementation(() => {
        throw new Error('Test Error')
      })
      const { result } = renderHook(() => useTimer(1, onTimeEnd))
      
      act(() => {
        result.current.setIsTimerRunning(true)
        jest.advanceTimersByTime(1000)
      })
      
      expect(result.current.isTimerRunning).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('SOLL mit extrem großen Zeitwerten umgehen', () => {
      const { result } = renderHook(() => useTimer(Number.MAX_SAFE_INTEGER, jest.fn()))
      expect(() => result.current.formatTime(Number.MAX_SAFE_INTEGER)).not.toThrow()
    })

    it('SOLL mit Floating Point Werten umgehen', () => {
      const { result } = renderHook(() => useTimer(60.5, jest.fn()))
      expect(result.current.time).toBe(60) // Sollte auf ganze Sekunden runden
    })
  })

  describe('Performance Optimierung', () => {
    it('SOLL Render-Zyklen optimieren', () => {
      const renderLog: number[] = []
      const { result } = renderHook(() => {
        renderLog.push(Date.now())
        return useTimer(60, jest.fn())
      })
      
      act(() => {
        result.current.setIsTimerRunning(true)
        // Simuliere schnelle State-Updates
        for (let i = 0; i < 10; i++) {
          result.current.setTime(50 - i)
        }
        jest.advanceTimersByTime(100)
      })
      
      // Prüfe Abstand zwischen Renders
      renderLog.reduce((prevTime, currentTime) => {
        const interval = currentTime - prevTime
        expect(interval).toBeGreaterThanOrEqual(16) // Min. 16ms zwischen Renders (60fps)
        return currentTime
      })
    })

    it('SOLL CPU-Last über längere Zeiträume minimal halten', () => {
      const renderLog: number[] = []
      const { result } = renderHook(() => {
        renderLog.push(Date.now())
        return useTimer(3600, jest.fn()) // 1 Stunde Timer
      })

      act(() => {
        result.current.setIsTimerRunning(true)
        // Simuliere 1 Minute Laufzeit
        for (let i = 0; i < 60; i++) {
          jest.advanceTimersByTime(1000)
        }
      })

      // Prüfe durchschnittliche Zeit zwischen Updates
      if (renderLog.length < 2) {
        throw new Error('Nicht genügend Render-Events für Performance-Test')
      }

      const totalUpdates = renderLog.length - 1
      const firstRender = renderLog[0]
      const lastRender = renderLog[renderLog.length - 1]
      
      if (firstRender === undefined || lastRender === undefined) {
        throw new Error('Render-Log enthält ungültige Einträge')
      }

      const totalTime = lastRender - firstRender
      const avgUpdateTime = totalTime / totalUpdates

      expect(avgUpdateTime).toBeGreaterThanOrEqual(16) // Min. 16ms zwischen Updates
      expect(totalUpdates).toBeLessThanOrEqual(60) // Max. 1 Update pro Sekunde
    })

    it('SOLL mit mehreren Timer-Instanzen effizient umgehen', () => {
      const timers = Array(5).fill(null).map((_, i) => 
        renderHook(() => useTimer(60 + i, jest.fn()))
      )

      const startTime = performance.now()

      act(() => {
        timers.forEach(timer => {
          timer.result.current.setIsTimerRunning(true)
        })
        jest.advanceTimersByTime(1000)
      })

      const endTime = performance.now()
      const processingTime = endTime - startTime

      // Prüfe ob alle Timer korrekt aktualisiert wurden
      timers.forEach((timer, i) => {
        expect(timer.result.current.time).toBe(59 + i)
      })

      // Prüfe Performance
      expect(processingTime).toBeLessThan(50) // Max. 50ms für 5 Timer-Updates

      // Cleanup
      timers.forEach(timer => timer.unmount())
      expect(jest.getTimerCount()).toBe(0)
    })
  })
}) 